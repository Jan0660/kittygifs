package util

import (
	"context"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"log"
	"time"
)

var (
	MongoClient      *mongo.Client
	GifsCol          *mongo.Collection
	UsersCol         *mongo.Collection
	SessionsCol      *mongo.Collection
	IssuesCol        *mongo.Collection
	NotificationsCol *mongo.Collection
	MiscCol          *mongo.Collection
	SyncSettingsCol  *mongo.Collection
	TagsCol          *mongo.Collection
	TagCategoriesCol *mongo.Collection
)

// InitializeMongoDB initializes the MongoDB client and collections
func InitializeMongoDB(config *Configuration) {
	{
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		var err error
		MongoClient, err = mongo.Connect(ctx, options.Client().ApplyURI(config.MongoUrl))
		if err != nil {
			log.Fatal(err)
		}
	}
	// create database if not exists
	db := MongoClient.Database(config.DatabaseName)
	{
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = db.CreateCollection(ctx, "gifs")
		_ = db.CreateCollection(ctx, "users")
		_ = db.CreateCollection(ctx, "sessions")
		_ = db.CreateCollection(ctx, "issues")
		_ = db.CreateCollection(ctx, "notifications")
		_ = db.CreateCollection(ctx, "misc")
		_ = db.CreateCollection(ctx, "sync_settings")
		_ = db.CreateCollection(ctx, "tags")
		_ = db.CreateCollection(ctx, "tag_categories")
	}
	GifsCol = db.Collection("gifs")
	UsersCol = db.Collection("users")
	SessionsCol = db.Collection("sessions")
	IssuesCol = db.Collection("issues")
	NotificationsCol = db.Collection("notifications")
	MiscCol = db.Collection("misc")
	SyncSettingsCol = db.Collection("sync_settings")
	TagsCol = db.Collection("tags")
	TagCategoriesCol = db.Collection("tag_categories")
}
