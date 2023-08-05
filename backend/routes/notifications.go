package routes

import (
	"context"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	. "kittygifs/util"
	notifications "kittygifs/util/notifications"
	"time"
)

func MountNotifications(mounting *Mounting) {
	mounting.Authed.GET("/notifications", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		cur, err := NotificationsCol.Find(ctx, bson.M{"username": GetUser(c).Username})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		var notifs []notifications.Notification
		err = cur.All(ctx, &notifs)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		if notifs == nil {
			notifs = []notifications.Notification{}
		}
		c.JSON(200, notifs)
	})
	mounting.Authed.GET("/notifications/count", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		count, err := NotificationsCol.CountDocuments(ctx, bson.M{"username": GetUser(c).Username})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.JSON(200, gin.H{"count": count})
	})
	mounting.Authed.DELETE("/notifications/:id", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 12*time.Second)
		defer cancel()
		var notification notifications.Notification
		err := NotificationsCol.FindOne(ctx, bson.M{"_id": c.Param("id"), "username": GetUser(c).Username}).Decode(&notification)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		var filter bson.M
		// todo(refactor): once Go 1.21 is released, use slices.Contains
		for _, notificationType := range notifications.NotificationTypesDeleteByEvent {
			if notification.Data["type"] == notificationType {
				filter = bson.M{"eventId": notification.EventId}
				break
			}
		}
		if filter == nil {
			filter = bson.M{"_id": notification.Id}
		}
		_, err = NotificationsCol.DeleteMany(ctx, filter)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.Status(204)
	})
}
