package notifications

import (
	"go.mongodb.org/mongo-driver/bson"
	. "kittygifs/util"
	"slices"
)

func MustDeleteNotificationsByEventId(eventId string) {
	MustDeleteNotifications(bson.M{"eventId": eventId})
}

func MustDeleteNotifications(filter bson.M) {
	_, _ = NotificationsCol.DeleteMany(nil, filter)
}

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
		if slices.Contains(otherUsers, user.Username) {
			continue
		}
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
	GdprRequest       = "gdprRequest"
	GifEditSuggestion = "gifEditSuggestion"
)

// NotificationTypes is a list of all notification types
var NotificationTypes = []string{GdprRequest, GifEditSuggestion}

// NotificationTypesDeleteByEvent is a list of all notification types, where if the notification is deleted,
// the notifications with the same event id(that other users may have gotten) will also be deleted
var NotificationTypesDeleteByEvent = []string{GdprRequest}

// NotificationTypesDeletable is a list of all notification types, that can be deleted by the user,
// otherwise the notification is supposed to be deleted automatically by the server when the event is resolved,
// e.g. tag edit request is resolved
var NotificationTypesDeletable = []string{GdprRequest}

type Notification struct {
	Id       string                 `json:"id" bson:"_id"`
	Username string                 `json:"username" bson:"username"`
	EventId  string                 `json:"eventId" bson:"eventId"`
	Data     map[string]interface{} `json:"data" bson:"data"`
}
