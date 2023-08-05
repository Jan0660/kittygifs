package notifications

import (
	"go.mongodb.org/mongo-driver/bson"
	. "kittygifs/util"
)

func MustNotifyGroup(groupName, eventId, notificationType string, data map[string]interface{}, otherUsers ...string) {
	_ = NotifyGroup(groupName, eventId, notificationType, data, otherUsers...)
}

func NotifyGroup(groupName, eventId, notificationType string, data map[string]interface{}, otherUsers ...string) error {
	cur, err := UsersCol.Find(nil, bson.M{"groups": groupName})
	if err != nil {
		return err
	}
	var users []User
	err = cur.All(nil, &users)
	if err != nil {
		return err
	}
	for _, user := range users {
		// todo: once Go 1.21 is released, use slices.Contains and don't notify otherUsers if they are in the group, too
		err = NotifyUser(user.Username, eventId, notificationType, data)
		if err != nil {
			return err
		}
	}
	for _, otherUser := range otherUsers {
		err = NotifyUser(otherUser, eventId, notificationType, data)
		if err != nil {
			return err
		}
	}
	return nil
}

func MustNotifyUser(username, eventId, notificationType string, data map[string]interface{}) {
	_ = NotifyUser(username, eventId, notificationType, data)
}

func NotifyUser(username, eventId, notificationType string, data map[string]interface{}) error {
	data["type"] = notificationType
	notification := Notification{
		Id:       NewUlid(),
		EventId:  eventId,
		Username: username,
		Data:     data,
	}
	_, err := NotificationsCol.InsertOne(nil, notification)
	return err
}

const (
	GdprRequest = "gdprRequest"
)

// NotificationTypes is a list of all notification types
var NotificationTypes = []string{GdprRequest}

// NotificationTypesDeleteByEvent is a list of all notification types, where if the notification is deleted,
// the notifications with the same event id(that other users may have gotten) will also be deleted
var NotificationTypesDeleteByEvent = []string{GdprRequest}

type Notification struct {
	Id       string                 `json:"id" bson:"_id"`
	Username string                 `json:"username" bson:"username"`
	EventId  string                 `json:"eventId" bson:"eventId"`
	Data     map[string]interface{} `json:"data" bson:"data"`
}

type GdprRequestNotificationData struct {
	Username string `json:"username" bson:"username"`
}
