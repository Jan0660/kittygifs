package routes

import (
	"context"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"kittygifs/other"
	. "kittygifs/util"
	"time"
)

func MountTags(mounting *Mounting) {
	mounting.Normal.GET("/tags", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		cur, err := TagsCol.Find(ctx, bson.M{})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		var tags []Tag
		err = cur.All(ctx, &tags)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.JSON(200, tags)
	})
	mounting.Normal.GET("/tags/:tag", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		var tag Tag
		err := TagsCol.FindOne(ctx, bson.M{"_id": c.Param("tag")}).Decode(&tag)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.JSON(200, tag)
	})
	// todo: make run periodically
	mounting.Authed.GET("/tags/update", func(c *gin.Context) {
		if !GetUser(c).HasGroup("admin") {
			c.Status(403)
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		res, err := other.RunTagCount(ctx)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.JSON(200, res)
	})
	mounting.Authed.PATCH("/tags/:tag", func(c *gin.Context) {
		if !GetUser(c).HasGroup("perm:edit_tags") {
			c.Status(403)
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		var tag Tag
		err := TagsCol.FindOne(ctx, bson.M{"_id": c.Param("tag")}).Decode(&tag)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		var update Tag
		err = c.BindJSON(&update)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		tag.Description = update.Description
		tag.Color = update.Color
		tag.Implications = update.Implications
		if err = ValidateTag(tag); err != nil {
			c.JSON(400, Error(err))
			return
		}
		_, err = TagsCol.ReplaceOne(ctx, bson.M{"_id": c.Param("tag")}, tag)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.Status(200)
	})
}
