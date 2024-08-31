package routes

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"github.com/alexedwards/argon2id"
	"github.com/asaskevich/govalidator"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	. "kittygifs/util"
	"kittygifs/util/notifications"
	"net/http"
	"time"
)

func MountUsers(mounting *Mounting) {
	mounting.Sessioned.GET("/users/:username/info", func(c *gin.Context) {
		type Request struct {
			Stats bool `form:"stats"`
		}
		var req Request
		err := c.ShouldBindQuery(&req)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		var user User
		username := c.Param("username")
		if username == "self" {
			if GetUser(c) == nil {
				c.JSON(403, ErrorStr("you must be logged in to view your own info"))
				return
			}
			user = *GetUser(c)
		} else {
			err = UsersCol.FindOne(ctx, bson.M{"_id": username}).Decode(&user)
			if err != nil {
				c.JSON(500, Error(err))
				return
			}
		}
		info := UserInfo{
			Username: user.Username,
			Groups:   user.Groups,
		}
		if req.Stats {
			info.Stats = &UserStats{}
			uploadCount, err := GifsCol.CountDocuments(ctx, bson.M{"uploader": user.Username}, &options.CountOptions{})
			info.Stats.Uploads = uploadCount
			if err != nil {
				c.JSON(500, Error(err))
				return
			}
		}
		c.JSON(200, info)
	})

	// login, signup, sessions stuff
	mounting.Normal.POST("/users", mounting.PasswordRateLimit, func(c *gin.Context) {
		if !Config.AllowSignup {
			c.JSON(403, ErrorStr("signup is disabled by the server admin"))
			return
		} else if Config.Logto != nil && Config.Logto.AllowLegacySignup == false {
			c.JSON(403, ErrorStr("signup is enabled but legacy signup is not, you must use sign up using logto"))
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 16*time.Second)
		defer cancel()
		type Request struct {
			Username string  `json:"username"`
			Password string  `json:"password"`
			Captcha  *string `json:"captcha"`
			Email    *string `json:"email"`
		}
		var req Request
		err := c.BindJSON(&req)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		err = ValidateUsername(req.Username, ctx)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		// validate password
		if len(req.Password) < 8 {
			c.JSON(400, ErrorStr("password too short(<8)"))
			return
		}
		// validate email
		if Config.Smtp != nil && validateEmail(c, ctx, req.Email) != true {
			return
		}
		// validate captcha
		if verifyCaptcha(c, req.Captcha) != true {
			return
		}
		// start creating account
		hash, err := argon2id.CreateHash(req.Password, Argon2idParams)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		user := User{
			Username:     req.Username,
			PasswordHash: hash,
			Email:        req.Email,
		}
		if Config.Smtp != nil {
			verification := GenerateVerificationToken()
			user.Verification = &verification
		}
		_, err = UsersCol.InsertOne(ctx, user)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		if Config.Smtp != nil {
			err = sendVerificationEmail(c, user)
			if err != nil {
				return
			}
			c.JSON(200, gin.H{
				"type": "verificationSent",
			})
			return
		}
		session, err := createSession(ctx, user.Username)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.JSON(200, gin.H{
			"type":    "created",
			"session": session,
		})
	})
	mounting.Normal.POST("/users/sessions", mounting.PasswordRateLimit, func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		type Request struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		var request Request
		err := c.BindJSON(&request)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		var user User
		err = UsersCol.FindOne(ctx, bson.M{"_id": request.Username}).Decode(&user)
		if err != nil {
			c.JSON(401, ErrorStr("invalid username"))
			return
		}
		if user.Verification != nil {
			c.JSON(401, ErrorStr("account not verified"))
			return
		}
		if !CheckPassword(c, request.Password, user.PasswordHash) {
			return
		}
		session, err := createSession(ctx, user.Username)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.JSON(200, session)
	})
	mounting.Sessioned.DELETE("/users/sessions", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		user := GetUser(c)
		err := deleteAllOtherSessions(ctx, user.Username, c.GetHeader("x-session-token"))
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.Status(204)
	})
	mounting.Authed.POST("/users/resetPassword", mounting.PasswordRateLimit, func(c *gin.Context) {
		type Request struct {
			OldPassword string `json:"oldPassword"`
			NewPassword string `json:"newPassword"`
		}
		var req Request
		err := c.BindJSON(&req)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		if len(req.NewPassword) < 8 {
			c.JSON(400, ErrorStr("new password too short(<8)"))
			return
		}
		userGet, _ := c.Get("user")
		user := userGet.(*User)
		if !CheckPassword(c, req.OldPassword, user.PasswordHash) {
			return
		}
		hash, err := argon2id.CreateHash(req.NewPassword, Argon2idParams)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		_, err = UsersCol.UpdateOne(context.Background(), bson.M{"_id": user.Username}, bson.M{"$set": bson.M{"passwordHash": hash}})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.Status(200)
	})
	mounting.Authed.POST("/users/resetPasswordAdmin", func(c *gin.Context) {
		type Request struct {
			Username    string `json:"username"`
			NewPassword string `json:"newPassword"`
		}
		var req Request
		err := c.BindJSON(&req)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		if len(req.NewPassword) < 8 {
			c.JSON(400, ErrorStr("new password too short(<8)"))
			return
		}
		user := GetUser(c)
		if !user.HasGroup("admin") {
			c.JSON(403, ErrorStr("you are not admin"))
			return
		}
		hash, err := argon2id.CreateHash(req.NewPassword, Argon2idParams)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		_, err = UsersCol.UpdateOne(context.Background(), bson.M{"_id": req.Username}, bson.M{"$set": bson.M{"passwordHash": hash}})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.Status(200)
	})
	mounting.Authed.DELETE("/users/sessions/:token", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_, err := SessionsCol.DeleteOne(ctx, bson.M{"_id": c.Param("token")})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.Status(204)
	})
	mounting.Authed.POST("/users/gdprRequest", mounting.PasswordRateLimit, func(c *gin.Context) {
		type Request struct {
			Password   string `json:"password"`
			IsDeletion bool   `json:"isDeletion"`
			KeepPosts  bool   `json:"keepPosts"`
			Note       string `json:"note"`
		}
		var req Request
		err := c.BindJSON(&req)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		if len(req.Note) > 2048 {
			c.JSON(400, ErrorStr("note too long(>2048)"))
			return
		}
		user := GetUser(c)
		if !CheckPassword(c, req.Password, user.PasswordHash) {
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		typeString := "request"
		if req.IsDeletion {
			typeString = "deletion"
		}
		_, err = IssuesCol.InsertOne(ctx, bson.M{
			"type":      typeString,
			"username":  user.Username,
			"keepPosts": req.KeepPosts,
			"note":      req.Note,
		})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		go func() {
			if Config.IssueDiscordWebhook == nil {
				return
			}
			_, _ = http.DefaultClient.Post(*Config.IssueDiscordWebhook,
				"application/json",
				bytes.NewBuffer([]byte(fmt.Sprintf(`{"content": "New GDPR %s request"}`, typeString))))
		}()
		go notifications.MustNotifyGroup("admin", NewUlid(), notifications.GdprRequest,
			map[string]interface{}{
				"username": user.Username,
			})
		c.Status(200)
	})
	mounting.Normal.POST("/users/resendVerificationEmail", func(c *gin.Context) {
		if Config.Smtp == nil {
			c.JSON(500, ErrorStr("smtp not configured"))
			return
		}
		type Request struct {
			Email   string  `json:"email"`
			Captcha *string `json:"captcha"`
		}
		var req Request
		err := c.BindJSON(&req)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		// validate captcha
		if verifyCaptcha(c, req.Captcha) != true {
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		var user User
		err = UsersCol.FindOne(ctx, bson.M{"email": req.Email}).Decode(&user)
		if errors.Is(err, mongo.ErrNoDocuments) {
			c.JSON(400, ErrorStr("email not found"))
			return
		} else if err != nil {
			c.JSON(500, Error(err))
			return
		}
		if user.Verification == nil {
			c.JSON(400, ErrorStr("account is already verified"))
			return
		}
		err = sendVerificationEmail(c, user)
		if err != nil {
			return
		}
		c.Status(200)
	})
	mounting.Normal.GET("/users/verify/:token", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		var user User
		err := UsersCol.FindOne(ctx, bson.M{"verification": c.Param("token")}).Decode(&user)
		if errors.Is(err, mongo.ErrNoDocuments) {
			c.String(400, "Account is already verified or verification token is invalid")
			return
		} else if err != nil {
			c.JSON(500, Error(err))
			return
		}
		user.Verification = nil
		_, err = UsersCol.ReplaceOne(ctx, bson.M{"_id": user.Username}, user)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.String(200, "Account verified, you can now log in")
	})
	mounting.Normal.GET("/users/verifyEmailChange/:token", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		var entry MiscEmailChange
		err := MiscCol.FindOne(ctx, bson.M{"type": "emailChange", "token": c.Param("token")}).Decode(&entry)
		if errors.Is(err, mongo.ErrNoDocuments) {
			c.String(400, "Email change token is invalid, already used or expired")
			return
		} else if err != nil {
			c.JSON(500, Error(err))
			return
		}
		var user User
		err = UsersCol.FindOne(ctx, bson.M{"_id": entry.Username}).Decode(&user)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		user.Email = &entry.Email
		_, err = UsersCol.ReplaceOne(ctx, bson.M{"_id": user.Username}, user)
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		err = MiscCol.FindOneAndDelete(ctx, bson.M{"type": "emailChange", "token": c.Param("token")}).Err()
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		c.String(200, "Email changed")
	})
	mounting.Authed.POST("/users/changeEmail", mounting.PasswordRateLimit, func(c *gin.Context) {
		if Config.Smtp == nil {
			c.JSON(500, ErrorStr("smtp not configured"))
			return
		}
		type Request struct {
			Password string  `json:"password"`
			Email    string  `json:"email"`
			Captcha  *string `json:"captcha"`
		}
		var req Request
		err := c.BindJSON(&req)
		if err != nil {
			c.JSON(400, Error(err))
			return
		}
		// validate captcha
		if verifyCaptcha(c, req.Captcha) != true {
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if validateEmail(c, ctx, &req.Email) != true {
			return
		}
		user := GetUser(c)
		if CheckPassword(c, req.Password, user.PasswordHash) != true {
			return
		}
		token := GenerateVerificationToken()
		_, err = MiscCol.InsertOne(ctx, bson.M{
			"type":     "emailChange",
			"username": user.Username,
			"email":    req.Email,
			"token":    token,
		})
		if err != nil {
			c.JSON(500, Error(err))
			return
		}
		err = sendEmailChangeEmail(c, *user, req.Email, token)
		if err != nil {
			return
		}
		c.Status(200)
	})
}

func createSession(ctx context.Context, username string) (*UserSession, error) {
	session := UserSession{
		Username: username,
		Token:    GenerateRandomString(42),
	}
	_, err := SessionsCol.InsertOne(ctx, session)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

// Deletes all sessions except the current one given by the token
func deleteAllOtherSessions(ctx context.Context, username string, token string) error {
	_, err := SessionsCol.DeleteMany(ctx, bson.M{"_id": bson.M{"$ne": token}, "username": username})
	if err != nil {
		return err
	}
	return nil
}

func sendVerificationEmail(c *gin.Context, user User) error {
	content, err := ExecuteTemplate(VerificationEmailTemplate, map[string]interface{}{
		"User":   user,
		"ApiUrl": Config.ApiUrl,
	})
	if err != nil {
		c.JSON(500, Error(err))
		return err
	}
	err = SendEmail(Config.Smtp, *user.Email, "Account Verification", content)
	if err != nil {
		c.JSON(500, ErrorStr("failed to send verification email"))
		return err
	}
	return nil
}

func sendEmailChangeEmail(c *gin.Context, user User, email string, token string) error {
	content, err := ExecuteTemplate(EmailChangeEmailTemplate, map[string]interface{}{
		"User":   user,
		"ApiUrl": Config.ApiUrl,
		"Token":  token,
	})
	if err != nil {
		c.JSON(500, Error(err))
		return err
	}
	err = SendEmail(Config.Smtp, email, "Email Change Verification", content)
	if err != nil {
		c.JSON(500, ErrorStr("failed to send verification email"))
		return err
	}
	return nil
}

// verifyCaptcha verifies the captcha and returns true if it's valid, otherwise it writes the error to the response and returns false
func verifyCaptcha(c *gin.Context, captchaToken *string) bool {
	if Config.Captcha != nil {
		if captchaToken == nil {
			c.JSON(400, ErrorStr("captcha required"))
			return false
		}
		if !HCaptchaClient.Verify(*captchaToken) {
			c.JSON(400, ErrorStr("invalid captcha"))
			return false
		}
	}
	return true
}

func validateEmail(c *gin.Context, ctx context.Context, email *string) bool {
	if email == nil {
		c.JSON(400, ErrorStr("email required"))
		return false
	}
	if !govalidator.IsEmail(*email) {
		c.JSON(400, ErrorStr("invalid email"))
		return false
	}
	count, err := UsersCol.CountDocuments(ctx, bson.M{"email": *email})
	if err != nil {
		c.JSON(500, Error(err))
		return false
	}
	if count > 0 {
		c.JSON(400, ErrorStr("email already exists"))
		return false
	}
	return true
}
