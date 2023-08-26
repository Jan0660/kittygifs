package routes

import (
	"context"
	ratelimit "github.com/JGLTechnologies/gin-rate-limit"
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/ross714/hcaptcha"
	"go.mongodb.org/mongo-driver/bson"
	. "kittygifs/util"
	"time"
)

var Config *Configuration
var HCaptchaClient *hcaptcha.Client

type Mounting struct {
	Normal            *gin.RouterGroup
	Sessioned         *gin.RouterGroup
	Authed            *gin.RouterGroup
	PasswordRateLimit gin.HandlerFunc
}

func RunGin(config *Configuration) error {
	Config = config
	r := gin.Default()
	r.Use(func(c *gin.Context) {
		if config.AccessControlAllowOrigin != nil {
			acao := config.AccessControlAllowOrigin
			if len(*acao) == 1 {
				c.Header("Access-Control-Allow-Origin", (*acao)[0])
			} else {
				c.Header("Vary", "Origin")
				origin := c.GetHeader("Origin")
				if origin != "" {
					for _, allowedOrigin := range *acao {
						if origin == allowedOrigin {
							c.Header("Access-Control-Allow-Origin", origin)
							break
						}
					}
				}
			}
		}
		c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, x-session-token, accept, origin, Cache-Control, X-Requested-With")
		c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")
		c.Header("Access-Control-Max-Age", "86400")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})
	r.Use(gzip.Gzip(gzip.DefaultCompression))
	store := ratelimit.InMemoryStore(&ratelimit.InMemoryOptions{
		Limit: 16,
		Rate:  time.Minute,
	})
	// we ratelimit the routes that do stuff with passwords because bcrypt CPU usage is high if a lot of requests is sent
	// plus it's not like you need to send a lot of requests to these routes
	passwordRL := ratelimit.RateLimiter(store, &ratelimit.Options{
		ErrorHandler: func(c *gin.Context, info ratelimit.Info) {
			c.Status(429)
		},
		KeyFunc: func(c *gin.Context) string {
			return c.ClientIP()
		},
	})
	sessioned := r.Group("/", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		sessionToken := c.GetHeader("x-session-token")
		if sessionToken == "" {
			c.Next()
			return
		}
		var session UserSession
		err := SessionsCol.FindOne(ctx, bson.M{"_id": sessionToken}).Decode(&session)
		if err != nil {
			c.Next()
			return
		}
		var user User
		err = UsersCol.FindOne(ctx, bson.M{"_id": session.Username}).Decode(&user)
		if err != nil {
			c.Next()
			return
		}
		c.Set("username", session.Username)
		c.Set("user", &user)
		c.Next()
	})
	authed := sessioned.Group("/", func(c *gin.Context) {
		if _, exists := c.Get("user"); !exists {
			c.Status(401)
			c.Abort()
			return
		}
		c.Next()
	})
	mounting := &Mounting{
		Normal:            r.Group("/"),
		Sessioned:         sessioned,
		Authed:            authed,
		PasswordRateLimit: passwordRL,
	}
	MountGifs(mounting)
	MountUsers(mounting)
	MountNotifications(mounting)
	MountSync(mounting)

	info := gin.H{
		"allowSignup": config.AllowSignup,
	}
	if config.Captcha != nil {
		HCaptchaClient = hcaptcha.New(config.Captcha.SecretKey, config.Captcha.SiteKey)
		info["captcha"] = gin.H{"siteKey": config.Captcha.SiteKey}
	}
	if config.Smtp != nil {
		info["smtp"] = gin.H{
			"fromAddress": config.Smtp.FromAddress,
		}
	}
	mounting.Normal.GET("/", func(c *gin.Context) {
		c.JSON(200, info)
	})

	return r.Run(config.Address)
}
