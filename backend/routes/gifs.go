package routes

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
	"io"
	. "kittygifs/util"
	"kittygifs/util/notifications"
	"net/http"
	"strconv"
	"time"
)

func MountGifs(mounting *Mounting) {
	mounting.Sessioned.GET("/gifs/search", func(c *gin.Context) {
		queryString := c.Query("q")
		if len(queryString) > 256 {
			c.JSON(400, gin.H{"error": "query too long(>256)"})
			return
		}
		var user *User
		if userGet, ok := c.Get("user"); ok {
			user = userGet.(*User)
		}
		var username *string
		if user != nil {
			username = &user.Username
		}
		ctx, cancel := context.WithTimeout(context.Background(), 16*time.Second)
		defer cancel()
		var maxNum int32 = 100
		var skip int64 = 0
		if c.Query("max") != "" {
			maxNumInt, err := strconv.ParseInt(c.Query("max"), 10, 32)
			maxNum = int32(maxNumInt)
			if err != nil || maxNum < 0 || maxNum > 500 {
				c.JSON(400, gin.H{"error": "invalid max"})
				return
			}
		}
		if c.Query("skip") != "" {
			skipInner, err := strconv.ParseInt(c.Query("skip"), 10, 64)
			skip = skipInner
			if err != nil || skip < 0 {
				c.JSON(400, gin.H{"error": "invalid skip"})
				return
			}
		}
		query, err := ParseQuery(queryString, username)
		if err != nil {
			c.JSON(400, gin.H{"error": "failed to parse query: " + err.Error()})
			return
		}
		search := map[string]interface{}{}
		if query.Group == nil && query.IncludeGroups == nil {
			search["group"] = bson.M{"$exists": false}
		}
		if query.Uploader != "" {
			search["uploader"] = query.Uploader
		}
		if query.NoteRegex != "" {
			search["note"] = primitive.Regex{Pattern: query.NoteRegex, Options: "i"}
		}
		if query.NoteText != "" {
			search["$text"] = bson.M{"$search": query.NoteText}
		}
		tags := query.Tags
		if len(tags) > 0 {
			tagsQuery := bson.M{}
			// todo: clean this up
			if len(tags) > 1 {
				newTagsQuery := make([]interface{}, len(tags)-1)
				for i, v := range tags[:len(tags)-1] {
					newTagsQuery[i] = v
				}
				tagsQuery["$all"] = newTagsQuery
			}
			var arr []interface{}
			if rr, ok := tagsQuery["$all"]; ok {
				arr = rr.([]interface{})
			} else {
				arr = []interface{}{}
			}
			tagsQuery["$all"] = append(arr, primitive.Regex{Pattern: "^" + tags[len(tags)-1] + ".*$"})
			search["tags"] = tagsQuery
		}
		if query.IncludeGroups != nil || query.Group != nil {
			if query.IncludeGroups != nil {
				if !user.HasGroups(*query.IncludeGroups) {
					c.JSON(403, gin.H{"error": "you do not have access to these groups"})
					return
				}
				groupsOr := make([]bson.M, 0, 2)
				var includeGroups *[]string
				if len(*query.IncludeGroups) == 0 {
					if user != nil && user.Groups != nil {
						includeGroups = user.Groups
						tmp := append(*includeGroups, "@"+user.Username)
						includeGroups = &tmp
					}
				} else {
					includeGroups = query.IncludeGroups
				}
				groupsOr = append(groupsOr, bson.M{"group": bson.M{"$exists": false}})
				{
					thisOr := bson.M{"group": bson.M{"$in": includeGroups}}
					groupsOr = append(groupsOr, thisOr)
				}
				search["$or"] = groupsOr
			}
			if query.Group != nil {
				if !user.HasGroup(*query.Group) {
					c.JSON(403, gin.H{"error": "you do not have access to these groups"})
					return
				}
				search["group"] = query.Group
			}
		}
		gifs := make([]Gif, 0, maxNum)
		cursor, err := GifsCol.Find(ctx, search, &options.FindOptions{
			Skip:      &skip,
			BatchSize: &maxNum,
			Sort:      query.Sort,
		})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		for len(gifs) < int(maxNum) {
			if !cursor.Next(ctx) {
				break
			}
			var gif Gif
			err = cursor.Decode(&gif)
			if err != nil {
				c.JSON(500, Error(err))
				return
			}
			gifs = append(gifs, gif)
		}

		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		if gifs == nil {
			gifs = []Gif{}
		}
		c.JSON(200, gifs)
		return
	})
	mounting.Sessioned.GET("/gifs/:id", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		var gif Gif
		err := GifsCol.FindOne(ctx, bson.M{"_id": c.Param("id")}).Decode(&gif)
		if user := GetUser(c); gif.Group != nil && ((user != nil && !user.HasGroup(*gif.Group)) || user == nil) {
			c.JSON(403, gin.H{"error": "you do not have access to this gif"})
			return
		}
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.JSON(200, gif)
	})
	mounting.Authed.POST("/gifs", func(c *gin.Context) {
		user := GetUser(c)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second*2)
		defer cancel()
		var gif Gif
		err := c.BindJSON(&gif)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		if gif.Tags == nil {
			gif.Tags = []string{}
		}
		if gif.Group != nil && *gif.Group == "" {
			gif.Group = nil
		}
		gif.Size = nil
		gif.PreviewGif = nil
		gif.PreviewVideo = nil
		gif.PreviewVideoWebm = nil
		if err = ValidateGif(gif); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		if gif.Group != nil && *gif.Group == "private" {
			privateGroup := "@" + c.GetString("username")
			gif.Group = &privateGroup
		} else if gif.Group != nil && !user.HasGroup(*gif.Group) {
			c.JSON(403, gin.H{"error": "you do not have the group " + *gif.Group})
			return
		}
		if IsTenorUrl.MatchString(gif.Url) {
			match := IsTenorUrl.FindStringSubmatch(gif.Url)

			res, err := http.DefaultClient.Get("https://tenor.com/view/" + match[1])
			if err != nil {
				c.JSON(500, Error(err))
				return
			}
			defer res.Body.Close()
			body, err := io.ReadAll(res.Body)
			if err != nil {
				c.JSON(500, Error(err))
				return
			}

			// PreviewGif
			match = TenorPreviewGifUrl.FindStringSubmatch(bytes.NewBuffer(body).String())
			if len(match) == 0 {
				c.JSON(400, gin.H{"error": "could not find gif url for preview in tenor page"})
				return
			}
			err = json.Unmarshal([]byte(match[1]), &gif.PreviewGif)
			if err != nil {
				c.JSON(500, Error(err))
				return
			}
			// PreviewVideo
			match = TenorPreviewVideoUrl.FindStringSubmatch(bytes.NewBuffer(body).String())
			if len(match) == 0 {
				c.JSON(400, gin.H{"error": "could not find video url for preview in tenor page"})
				return
			}
			err = json.Unmarshal([]byte(match[1]), &gif.PreviewVideo)
			if err != nil {
				c.JSON(500, Error(err))
				return
			}
			// PreviewVideoWebm
			match = TenorPreviewVideoWebmUrl.FindStringSubmatch(bytes.NewBuffer(body).String())
			if len(match) == 0 {
				c.JSON(400, gin.H{"error": "could not find webm video url for preview in tenor page"})
				return
			}
			err = json.Unmarshal([]byte(match[1]), &gif.PreviewVideoWebm)
			if err != nil {
				c.JSON(500, Error(err))
				return
			}
			// get size
			match = TenorPreviewSize.FindStringSubmatch(bytes.NewBuffer(body).String())
			// gonna not check for error because it's not that important
			if len(match) > 0 {
				width, err := strconv.ParseInt(match[1], 10, 32)
				if err != nil {
					goto afterSize
				}
				height, err := strconv.ParseInt(match[2], 10, 32)
				if err != nil {
					goto afterSize
				}
				gif.Size = &Size{
					Width:  int32(width),
					Height: int32(height),
				}
			}
		afterSize:
		}
		gif.Id = NewUlid()
		gif.Uploader = c.GetString("username")
		// todo: validate no same two urls of gifs
		_, err = GifsCol.InsertOne(ctx, gif)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.JSON(200, gif)
	})
	mounting.Authed.PATCH("/gifs/:id", func(c *gin.Context) {
		userGet, _ := c.Get("user")
		user := userGet.(*User)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		var edit Gif
		err := c.BindJSON(&edit)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		var originalGif Gif
		err = GifsCol.FindOne(ctx, bson.M{"_id": c.Param("id")}).Decode(&originalGif)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		if originalGif.Uploader != c.GetString("username") && !user.HasGroup("perm:edit_all_gifs") {
			c.JSON(403, gin.H{"error": "you are not the uploader of this gif nor do you have perm:edit_all_gifs"})
			return
		}

		originalGif.Group = edit.Group
		if originalGif.Group != nil && *originalGif.Group == "" {
			originalGif.Group = nil
		} else if originalGif.Group != nil && *originalGif.Group == "private" {
			privateGroup := "@" + c.GetString("username")
			originalGif.Group = &privateGroup
		} else if edit.Group != nil && !user.HasGroup(*edit.Group) {
			c.JSON(403, gin.H{"error": "you do not have the group " + *edit.Group})
			return
		}
		originalGif.Tags = edit.Tags
		originalGif.Note = edit.Note
		err = ValidateGif(originalGif)
		if err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		GifsCol.FindOneAndReplace(ctx, bson.M{"_id": c.Param("id")}, originalGif)
		if gifEditRequest := c.Query("gifEditSuggestion"); gifEditRequest != "" {
			go notifications.MustDeleteNotificationsByEventId(gifEditRequest)
		}
		c.JSON(200, originalGif)
	})
	mounting.Authed.DELETE("/gifs/:id", func(c *gin.Context) {
		userGet, _ := c.Get("user")
		user := userGet.(*User)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		var originalGif Gif
		err := GifsCol.FindOne(ctx, bson.M{"_id": c.Param("id")}).Decode(&originalGif)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		if originalGif.Uploader != c.GetString("username") && !user.HasGroup("perm:delete_all_gifs") {
			c.JSON(403, gin.H{"error": "you are not the uploader of this gif nor do you have perm:delete_all_gifs"})
			return
		}
		GifsCol.FindOneAndDelete(ctx, bson.M{"_id": c.Param("id")})
		c.JSON(200, originalGif)
	})
	mounting.Authed.POST("/gifs/:id/edit/suggestions", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		var gif Gif
		err := GifsCol.FindOne(ctx, bson.M{"_id": c.Param("id")}).Decode(&gif)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		type Request struct {
			Tags []string `json:"tags"`
			Note *string  `json:"note"`
		}
		var req Request
		err = c.BindJSON(&req)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		data := make(map[string]interface{})
		data["gifId"] = c.Param("id")
		data["tags"] = req.Tags
		data["username"] = c.GetString("username")
		data["note"] = req.Note

		go notifications.MustNotifyGroup("gifEditSuggestions", NewUlid(), notifications.GifEditSuggestion, data, gif.Uploader)
		c.Status(200)
	})
}
