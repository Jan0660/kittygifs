package util

import (
	"github.com/gin-contrib/sessions"
	"log"
)

type SessionStorage struct {
	Session sessions.Session
}

func (storage *SessionStorage) GetItem(key string) string {
	log.Println("TODO GetItem", key)
	value := storage.Session.Get(key)
	if value == nil {
		return ""
	}
	return value.(string)
}

func (storage *SessionStorage) SetItem(key, value string) {
	log.Println("TODO SetItem", key, value)
	storage.Session.Set(key, value)
	storage.Session.Save()
}
