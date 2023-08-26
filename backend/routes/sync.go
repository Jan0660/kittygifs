package routes

import (
	"bytes"
	"context"
	"errors"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"io"
	. "kittygifs/util"
	"time"
)

func MountSync(mounting *Mounting) {
	mounting.Authed.GET("/sync/settings", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		var syncSettings map[string]interface{}
		err := SyncSettingsCol.FindOne(ctx, bson.M{"_id": GetUser(c).Username}).Decode(&syncSettings)
		if errors.Is(err, mongo.ErrNoDocuments) {
			c.Status(404)
			return
		} else if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.JSON(200, syncSettings)
	})
	mounting.Authed.POST("/sync/settings", func(c *gin.Context) {
		byteBody, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.Request.Body = io.NopCloser(bytes.NewBuffer(byteBody))

		if byteBody == nil {
			c.JSON(400, ErrorStr("empty body"))
			return
		} else if len(byteBody) > 4_000 {
			c.JSON(400, ErrorStr("body too large"))
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		var syncSettings map[string]interface{}
		err = c.BindJSON(&syncSettings)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		truePtr := true
		_, err = SyncSettingsCol.ReplaceOne(ctx, bson.M{"_id": GetUser(c).Username}, bson.M{
			"_id":  GetUser(c).Username,
			"data": syncSettings,
		}, &options.ReplaceOptions{Upsert: &truePtr})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.Status(200)
	})
}
