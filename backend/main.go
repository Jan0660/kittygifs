package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"github.com/JGLTechnologies/gin-rate-limit"
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/oklog/ulid/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
	"io"
	"log"
	"math/big"
	mathRand "math/rand"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var usernameValidation *regexp.Regexp
var tagValidation *regexp.Regexp
var isTenorUrl *regexp.Regexp
var tenorPreviewGifUrl *regexp.Regexp
var tenorPreviewVideoUrl *regexp.Regexp
var tenorPreviewVideoWebmUrl *regexp.Regexp
var tenorPreviewSize *regexp.Regexp
var allowedDomains = []string{
	"tenor.com",
	"media.tenor.com",
	"i.imgur.com",
	"media.discordapp.net",
	"cdn.discordapp.com",
	"autumn.revolt.chat",
}

func main() {
	var config Config
	{
		bytes, err := os.ReadFile("./config.json")
		if err != nil {
			log.Fatalln(err)
		}
		err = json.Unmarshal(bytes, &config)
		if err != nil {
			log.Fatalln(err)
		}
		if config.AccessControlAllowOrigin == nil {
			config.AccessControlAllowOrigin = &[]string{"*"} // default to allow all origins
		}
	}
	var client *mongo.Client
	{
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		var err error
		client, err = mongo.Connect(ctx, options.Client().ApplyURI(config.MongoUrl))
		if err != nil {
			log.Fatal(err)
		}
	}
	defer func() {
		if err := client.Disconnect(context.Background()); err != nil {
			panic(err)
		}
	}()
	// create database if not exists
	db := client.Database(config.MongoDatabase)
	{
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = db.CreateCollection(ctx, "gifs")
		_ = db.CreateCollection(ctx, "users")
		_ = db.CreateCollection(ctx, "sessions")
	}
	gifsCol := db.Collection("gifs")
	usersCol := db.Collection("users")
	sessionsCol := db.Collection("sessions")

	usernameValidation = regexp.MustCompile("^[a-z0-9_]{3,20}$")
	tagValidation = regexp.MustCompile("^[a-z0-9_]{3,20}$")
	isTenorUrl = regexp.MustCompile("(?i)^https://tenor.com/view/.*-(?P<id>\\d+)$")
	tenorPreviewGifUrl = regexp.MustCompile("(?i)\"mediumgif\":{\"url\":(\"https:\\\\u002F\\\\u002Fmedia.tenor.com\\\\u002F.+?\\\\u002F.+?\\.gif\")")
	tenorPreviewVideoUrl = regexp.MustCompile("(?i)\"mp4\":{\"url\":(\"https:\\\\u002F\\\\u002Fmedia.tenor.com\\\\u002F.+?\\\\u002F.+?\\.mp4\")")
	tenorPreviewVideoWebmUrl = regexp.MustCompile("(?i)\"webm\":{\"url\":(\"https:\\\\u002F\\\\u002Fmedia.tenor.com\\\\u002F.+?\\\\u002F.+?\\.webm\")")
	tenorPreviewSize = regexp.MustCompile("(?i)\"details\":{\"width\":(\\d+),\"height\":(\\d+)")

	r := gin.Default()
	r.Use(func(c *gin.Context) {
		if config.AccessControlAllowOrigin != nil {
			acao := config.AccessControlAllowOrigin
			if len(*acao) == 1 {
				c.Header("Access-Control-Allow-Origin", (*acao)[0])
			} else {
				c.Header("Vary", "Origin")
				origin := c.GetHeader("Origin")
				if origin != "" {
					for _, allowedOrigin := range *acao {
						if origin == allowedOrigin {
							c.Header("Access-Control-Allow-Origin", origin)
							break
						}
					}
				}
			}
		}
		c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, x-session-token, accept, origin, Cache-Control, X-Requested-With")
		c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")
		c.Header("Access-Control-Max-Age", "86400")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})
	r.Use(gzip.Gzip(gzip.DefaultCompression))
	store := ratelimit.InMemoryStore(&ratelimit.InMemoryOptions{
		Limit: 16,
		Rate:  time.Minute,
	})
	// we ratelimit the routes that do stuff with passwords because bcrypt CPU usage is high if a lot of requests is sent
	// plus it's not like you need to send a lot of requests to these routes
	passwordRL := ratelimit.RateLimiter(store, &ratelimit.Options{
		ErrorHandler: func(c *gin.Context, info ratelimit.Info) {
			c.Status(429)
		},
		KeyFunc: func(c *gin.Context) string {
			return c.ClientIP()
		},
	})

	createSession := func(ctx context.Context, username string) (*UserSession, error) {
		session := UserSession{
			Username: username,
			Token:    GenerateRandomString(42),
		}
		_, err := sessionsCol.InsertOne(ctx, session)
		if err != nil {
			return nil, err
		}
		return &session, nil
	}

	r.GET("/gifs", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		var gifs []Gif
		cursor, err := gifsCol.Find(ctx, bson.M{"private": false})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		err = cursor.All(ctx, &gifs)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.JSON(200, gifs)
	})
	sessioned := r.Group("/", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		sessionToken := c.GetHeader("x-session-token")
		if sessionToken == "" {
			c.Next()
			return
		}
		var session UserSession
		err := sessionsCol.FindOne(ctx, bson.M{"_id": sessionToken}).Decode(&session)
		if err != nil {
			c.Next()
			return
		}
		var user User
		err = usersCol.FindOne(ctx, bson.M{"_id": session.Username}).Decode(&user)
		if err != nil {
			c.Next()
			return
		}
		c.Set("username", session.Username)
		c.Set("user", &user)
		c.Next()
	})
	r.GET("/gifs/search", func(c *gin.Context) {
		queryString := c.Query("q")
		if len(queryString) > 256 {
			c.JSON(400, gin.H{"error": "query too long(>256)"})
			return
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
			skip, err := strconv.ParseInt(c.Query("skip"), 10, 64)
			if err != nil || skip < 0 {
				c.JSON(400, gin.H{"error": "invalid skip"})
				return
			}
		}
		query, err := ParseQuery(queryString)
		if err != nil {
			c.JSON(400, gin.H{"error": "failed to parse query: " + err.Error()})
			return
		}
		search := map[string]interface{}{}
		search["private"] = false
		if query.Uploader != "" {
			search["uploader"] = query.Uploader
		}
		if query.Note != "" {
			search["note"] = primitive.Regex{Pattern: query.Note, Options: "i"}
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
		gifs := make([]Gif, 0, maxNum)
		cursor, err := gifsCol.Find(ctx, search, &options.FindOptions{
			Skip:      &skip,
			BatchSize: &maxNum,
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
	r.GET("/gifs/:id", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		var gif Gif
		// todo: check if private
		err := gifsCol.FindOne(ctx, bson.M{"_id": c.Param("id")}).Decode(&gif)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.JSON(200, gif)
	})
	r.POST("/users", passwordRL, func(c *gin.Context) {
		if !config.AllowSignup {
			c.JSON(403, gin.H{"error": "signup is disabled by the server admin"})
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		type Request struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		var req Request
		err := c.BindJSON(&req)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		// validate username
		if !usernameValidation.MatchString(req.Username) {
			c.JSON(400, gin.H{"error": "invalid username"})
			return
		}
		// check if username exists
		count, err := usersCol.CountDocuments(ctx, bson.M{"_id": req.Username})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		if count > 0 {
			c.JSON(400, gin.H{"error": "username already exists"})
			return
		}
		// validate password
		if len(req.Password) < 8 {
			c.JSON(400, gin.H{"error": "password too short(<8)"})
			return
		}
		// start creating account
		hash, err := HashPassword(req.Password)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		user := User{
			Username:     req.Username,
			PasswordHash: hash,
		}
		_, err = usersCol.InsertOne(ctx, user)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		session, err := createSession(ctx, user.Username)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.JSON(200, session)
	})
	r.POST("/users/sessions", passwordRL, func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		type Request struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		var request Request
		err := c.BindJSON(&request)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		var user User
		err = usersCol.FindOne(ctx, bson.M{"_id": request.Username}).Decode(&user)
		if err != nil {
			c.JSON(401, ErrorStr("invalid username"))
			return
		}
		if !CheckPasswordHash(request.Password, user.PasswordHash) {
			c.JSON(401, ErrorStr("invalid password"))
			return
		}
		session, err := createSession(ctx, user.Username)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.JSON(200, session)
	})

	authed := sessioned.Group("/", func(c *gin.Context) {
		if _, exists := c.Get("user"); !exists {
			c.Status(401)
			c.Abort()
			return
		}
		c.Next()
	})
	authed.POST("/gifs", func(c *gin.Context) {
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
		gif.Size = nil
		gif.PreviewGif = nil
		gif.PreviewVideo = nil
		gif.PreviewVideoWebm = nil
		if err = ValidateGif(gif); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		if isTenorUrl.MatchString(gif.Url) {
			match := isTenorUrl.FindStringSubmatch(gif.Url)

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
			match = tenorPreviewGifUrl.FindStringSubmatch(bytes.NewBuffer(body).String())
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
			match = tenorPreviewVideoUrl.FindStringSubmatch(bytes.NewBuffer(body).String())
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
			match = tenorPreviewVideoWebmUrl.FindStringSubmatch(bytes.NewBuffer(body).String())
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
			match = tenorPreviewSize.FindStringSubmatch(bytes.NewBuffer(body).String())
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
		_, err = gifsCol.InsertOne(ctx, gif)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.JSON(200, gif)
	})
	authed.PATCH("/gifs/:id", func(c *gin.Context) {
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
		err = gifsCol.FindOne(ctx, bson.M{"_id": c.Param("id")}).Decode(&originalGif)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		if originalGif.Uploader != c.GetString("username") && !user.HasGroup("perm:edit_all_gifs") {
			c.JSON(403, gin.H{"error": "you are not the uploader of this gif nor do you have perm:edit_all_gifs"})
			return
		}
		originalGif.Tags = edit.Tags
		originalGif.Note = edit.Note
		originalGif.Private = edit.Private
		err = ValidateGif(originalGif)
		if err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		gifsCol.FindOneAndUpdate(ctx, bson.M{"_id": c.Param("id")}, bson.M{"$set": originalGif})
		c.JSON(200, originalGif)
	})
	authed.DELETE("/gifs/:id", func(c *gin.Context) {
		userGet, _ := c.Get("user")
		user := userGet.(*User)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		var originalGif Gif
		err := gifsCol.FindOne(ctx, bson.M{"_id": c.Param("id")}).Decode(&originalGif)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		if originalGif.Uploader != c.GetString("username") && !user.HasGroup("perm:delete_all_gifs") {
			c.JSON(403, gin.H{"error": "you are not the uploader of this gif nor do you have perm:delete_all_gifs"})
			return
		}
		gifsCol.FindOneAndDelete(ctx, bson.M{"_id": c.Param("id")})
		c.JSON(200, originalGif)
	})
	authed.POST("/users/resetPassword", passwordRL, func(c *gin.Context) {
		type Request struct {
			OldPassword string `json:"oldPassword"`
			NewPassword string `json:"newPassword"`
		}
		var req Request
		err := c.BindJSON(&req)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		if len(req.NewPassword) < 8 {
			c.JSON(400, gin.H{"error": "new password too short(<8)"})
			return
		}
		userGet, _ := c.Get("user")
		user := userGet.(*User)
		if !CheckPasswordHash(req.OldPassword, user.PasswordHash) {
			c.JSON(403, gin.H{"error": "current password is incorrect"})
			return
		}
		hash, err := HashPassword(req.NewPassword)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		_, err = usersCol.UpdateOne(context.Background(), bson.M{"_id": user.Username}, bson.M{"$set": bson.M{"passwordHash": hash}})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.Status(200)
	})
	authed.DELETE("/users/sessions/:token", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_, err := sessionsCol.DeleteOne(ctx, bson.M{"_id": c.Param("token")})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.Status(200)
	})

	_ = r.Run(config.Address)
}

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(bytes), nil
}

func CheckPasswordHash(password, hash string) bool {
	bytes, err := base64.StdEncoding.DecodeString(hash)
	if err != nil {
		return false
	}
	err = bcrypt.CompareHashAndPassword(bytes, []byte(password))
	return err == nil
}

// thanks https://gist.github.com/dopey/c69559607800d2f2f90b1b1ed4e550fb?permalink_comment_id=3527095#gistcomment-3527095
func GenerateRandomString(n int) string {
	const letters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-"
	ret := make([]byte, n)
	for i := 0; i < n; i++ {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(letters))))
		ret[i] = letters[num.Int64()]
	}

	return string(ret)
}

var entropy = ulid.Monotonic(mathRand.New(mathRand.NewSource(int64(ulid.Now()))), 0)

func NewUlid() string {
	return ulid.MustNew(ulid.Now(), entropy).String()
}

// ValidateGif Returns nil if gif is valid, otherwise returns an error
func ValidateGif(gif Gif) error {
	if gif.Url == "" {
		return errors.New("url is empty")
	}
	if len(gif.Url) > 320 {
		return errors.New("url is too long(>320)")
	}
	{
		url, err := url.Parse(gif.Url)
		if err != nil {
			return errors.New("failed to parse url: " + err.Error())
		}
		if url.Scheme != "https" && url.Scheme != "http" {
			return errors.New("url is not http or https")
		}
		// verify domain
		hostname := strings.ToLower(url.Hostname())
		valid := false
		for _, domain := range allowedDomains {
			if hostname == domain {
				valid = true
				break
			}
		}
		if !valid {
			return errors.New("domain is not allowed")
		}
	}
	if len(gif.Tags) > 24 {
		return errors.New("too many tags(>24)")
	}
	if len(gif.Note) > 512 {
		return errors.New("note is too long(>512)")
	}
	if err := ValidateTags(gif.Tags); err != nil {
		return err
	}
	return nil
}

// ValidateTags Returns nil if tags are valid, otherwise returns an error
func ValidateTags(tags []string) error {
	for _, tag := range tags {
		if !tagValidation.MatchString(tag) {
			return errors.New("Invalid tag: " + tag)
		}
	}
	return nil
}

func Error(err error) gin.H {
	return gin.H{"error": err.Error()}
}

func ErrorStr(str string) gin.H {
	return gin.H{"error": str}
}

type Gif struct {
	Id               string   `json:"id" bson:"_id"`
	Url              string   `json:"url" bson:"url"`
	PreviewGif       *string  `json:"previewGif,omitempty" bson:"previewGif,omitempty"`
	PreviewVideo     *string  `json:"previewVideo,omitempty" bson:"previewVideo,omitempty"`
	PreviewVideoWebm *string  `json:"previewVideoWebm,omitempty" bson:"previewVideoWebm,omitempty"`
	Size             *Size    `json:"size,omitempty" bson:"size,omitempty"`
	Tags             []string `json:"tags" bson:"tags"`
	Uploader         string   `json:"uploader" bson:"uploader"`
	Private          bool     `json:"private" bson:"private"`
	Note             string   `json:"note" bson:"note"`
}

type Size struct {
	Width  int32 `json:"width" bson:"width"`
	Height int32 `json:"height" bson:"height"`
}

type User struct {
	Username     string    `json:"username" bson:"_id"`
	PasswordHash string    `json:"passwordHash" bson:"passwordHash"`
	Groups       *[]string `json:"groups,omitempty" bson:"groups,omitempty"`
}

// HasGroups Returns true if user has all the specified groups or is admin, otherwise returns false
func (user *User) HasGroups(groups []string) bool {
	if user.HasGroup("admin") {
		return true
	}
	for _, group := range groups {
		if !user.HasGroup(group) {
			return false
		}
	}
	return true
}

// HasGroup Returns true if user has the specified group or is admin, otherwise returns false
func (user *User) HasGroup(group string) bool {
	if user.Groups == nil {
		return false
	}
	if group != "admin" && user.HasGroup("admin") {
		return true
	}
	for _, userGroup := range *user.Groups {
		if userGroup == group {
			return true
		}
	}
	return false
}

type UserSession struct {
	Username string `json:"username" bson:"username"`
	Token    string `json:"token" bson:"_id"`
}

type Config struct {
	MongoUrl string `json:"mongoUrl"`
	// todo: rename to databaseName
	MongoDatabase            string    `json:"mongoDatabase"`
	Address                  string    `json:"address"`
	AllowSignup              bool      `json:"allowSignup"`
	AccessControlAllowOrigin *[]string `json:"accessControlAllowOrigin"`
}
