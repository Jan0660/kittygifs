package main

import (
	"context"
	"encoding/json"
	"go.mongodb.org/mongo-driver/bson"
	"kittygifs/routes"
	. "kittygifs/util"
	"log"
	"os"
	"time"
)

func main() {
	var config Configuration
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
		if config.ApiUrl == "" && config.Smtp != nil {
			log.Fatalln("apiUrl must be set in config.json when smtp is enabled")
		}
	}
	LoadEmailTemplates()
	InitializeMongoDB(&config)
	// wiping old unverified users
	if config.Smtp != nil {
		timer := time.NewTimer(24 * time.Hour)
		go func() {
			for {
				<-timer.C
				timer.Reset(24 * time.Hour)
				log.Println("Wiping unverified users")
				ctx := context.Background()
				cur, err := UsersCol.Find(ctx, bson.M{"verification": bson.M{"$exists": true}})
				if err != nil {
					log.Println(err)
					continue
				}
				for cur.Next(ctx) {
					var user User
					err := cur.Decode(&user)
					if err != nil {
						log.Println(err)
						continue
					}
					timestamp, err := GetVerificationTokenTimestamp(*user.Verification)
					if err != nil {
						log.Println(err)
						continue
					}
					if timestamp.Add(24 * time.Hour).Before(time.Now()) {
						_, err = UsersCol.DeleteOne(ctx, bson.M{"_id": user.Username})
						if err != nil {
							log.Println(err)
							continue
						}
						log.Printf("Deleted user %s\n", user.Username)
					}
				}
			}
		}()
	}
	err := routes.RunGin(&config)
	if err != nil {
		log.Fatal(err)
	}
}
