package main

import (
	"context"
	"encoding/json"
	"kittygifs/other"
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
		if config.ApiUrl == "" && config.Logto != nil {
			log.Fatalln("apiUrl must be set in config.json when logto is enabled")
		}
	}
	InitializeMongoDB(&config)
	// tag count updater
	{
		timer := time.NewTimer(1 * time.Hour)
		go func() {
			for {
				<-timer.C
				timer.Reset(1 * time.Hour)
				log.Println("Updating tag counts")
				ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
				_, err := other.RunTagCount(ctx)
				if err != nil {
					log.Println(err)
				}
				log.Println("Done updating tag counts")
				cancel()
			}
		}()
	}
	err := routes.RunGin(&config)
	if err != nil {
		log.Fatal(err)
	}
}
