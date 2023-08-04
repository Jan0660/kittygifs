package main

import (
	"encoding/json"
	"kittygifs/routes"
	. "kittygifs/util"
	"log"
	"os"
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
	}
	InitializeMongoDB(&config)
	err := routes.RunGin(&config)
	if err != nil {
		log.Fatal(err)
	}
}
