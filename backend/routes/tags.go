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
		if tags == nil {
			tags = []Tag{}
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
	mounting.Authed.GET("/tags/forceImplicationsUpdate", func(c *gin.Context) {
		if !GetUser(c).HasGroup("admin") {
			c.Status(403)
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		// get tags that have implications
		cur, err := TagsCol.Find(ctx, bson.M{"implications": bson.M{"$exists": true}})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		for cur.Next(ctx) {
			var tag Tag
			err = cur.Decode(&tag)
			if err != nil {
				c.JSON(500, Error(err))
				return
			}

			_, err := GifsCol.UpdateMany(ctx, bson.M{
				"$and": bson.A{
					bson.M{
						"tags": tag.Name,
					},
					bson.M{
						"tags": bson.M{
							"$not": bson.M{
								"$all": tag.Implications,
							},
						},
					},
				},
			}, bson.M{
				"$addToSet": bson.M{
					"tags": bson.M{
						"$each": tag.Implications,
					},
				},
			})
			if err != nil {
				c.JSON(500, Error(err))
				return
			}
		}
		c.Status(200)
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
		tag.Category = update.Category
		tag.Implications = update.Implications
		if err = ValidateTag(tag, ctx); err != nil {
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

	// tag categories
	mounting.Normal.GET("/tags/categories", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		cur, err := TagCategoriesCol.Find(ctx, bson.M{})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		var tagCategories []TagCategory
		err = cur.All(ctx, &tagCategories)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		if tagCategories == nil {
			tagCategories = []TagCategory{}
		}
		c.JSON(200, tagCategories)
	})
	mounting.Authed.POST("/tags/categories", func(c *gin.Context) {
		if !GetUser(c).HasGroup("perm:edit_tags") {
			c.Status(403)
			return
		}
		var category TagCategory
		err := c.BindJSON(&category)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		if err = ValidateTagCategory(category); err != nil {
			c.JSON(400, Error(err))
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_, err = TagCategoriesCol.InsertOne(ctx, category)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.Status(200)
	})
	mounting.Authed.PATCH("/tags/categories/:category", func(c *gin.Context) {
		if !GetUser(c).HasGroup("perm:edit_tags") {
			c.Status(403)
			return
		}
		var update TagCategory
		err := c.BindJSON(&update)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		var category TagCategory
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		err = TagCategoriesCol.FindOne(ctx, bson.M{"_id": c.Param("category")}).Decode(&category)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		if update.Name != category.Name {
			// change all the usages of the old name to the new name
			_, err = TagsCol.UpdateMany(ctx, bson.M{"category": c.Param("category")}, bson.M{"$set": bson.M{"category": update.Name}})
			if err != nil {
				c.JSON(500, Error(err))
				return
			}
			_, err = TagCategoriesCol.DeleteOne(ctx, bson.M{"_id": c.Param("category")})
			if err != nil {
				c.JSON(500, Error(err))
				return
			}
			_, err = TagCategoriesCol.InsertOne(ctx, update)
			if err != nil {
				c.JSON(500, Error(err))
				return
			}
		} else {
			_, err = TagCategoriesCol.ReplaceOne(ctx, bson.M{"_id": c.Param("category")}, update)
			if err != nil {
				c.JSON(500, Error(err))
				return
			}
		}
		c.Status(200)
	})
	mounting.Authed.DELETE("/tags/categories/:category", func(c *gin.Context) {
		if !GetUser(c).HasGroup("perm:edit_tags") {
			c.Status(403)
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		// remove all usages of the category
		_, err := TagsCol.UpdateMany(ctx, bson.M{"category": c.Param("category")}, bson.M{"$unset": bson.M{"category": nil}})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		_, err = TagCategoriesCol.DeleteOne(ctx, bson.M{"_id": c.Param("category")})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.Status(200)
	})
}
