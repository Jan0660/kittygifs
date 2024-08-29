package routes

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/memstore"
	"github.com/gin-gonic/gin"
	"github.com/logto-io/go/client"
	"github.com/logto-io/go/core"
	"go.mongodb.org/mongo-driver/bson"
	. "kittygifs/util"
	"log"
	"net/http"
	"net/url"
	"strings"
)

func MountLogto(mounting *Mounting) {
	if Config.Logto == nil {
		return
	}
	logtoConfig := &client.LogtoConfig{
		Endpoint:  Config.Logto.Endpoint,
		AppId:     Config.Logto.AppId,
		AppSecret: Config.Logto.AppSecret,
	}
	store := memstore.NewStore([]byte("your session secret"))
	logto := mounting.Normal.Group("/logto", sessions.Sessions("logto-session", store))
	logtoFirsts := make(map[string]string)
	sessionTokens := make(map[string]string)
	logto.GET("/sign-in", func(ctx *gin.Context) {
		session := sessions.Default(ctx)
		storage := &SessionStorage{Session: session}
		logtoClient := client.NewLogtoClient(
			logtoConfig,
			storage,
		)

		// The sign-in request is handled by Logto.
		// The user will be redirected to the Redirect URI on signed in.
		signInUri, err := SignIn(logtoClient, logtoConfig, storage, Config.ApiUrl+"/logto/callback", ctx.Query("return"))
		if err != nil {
			ctx.String(http.StatusInternalServerError, err.Error())
			return
		}

		// Redirect the user to the Logto sign-in page.
		ctx.Redirect(http.StatusTemporaryRedirect, signInUri)
	})
	logto.GET("/callback", func(ctx *gin.Context) {
		state := ctx.Query("state")
		log.Println("state:", state)
		state, err := url.QueryUnescape(state)
		log.Println("state:", state)
		if err != nil {
			ctx.JSON(500, Error(err))
			return
		}
		returnUri := strings.Split(state, "|")[1]
		log.Println("returnUri:", returnUri)

		session := sessions.Default(ctx)
		logtoClient := client.NewLogtoClient(
			logtoConfig,
			&SessionStorage{Session: session},
		)

		// The sign-in callback request is handled by Logto
		err = logtoClient.HandleSignInCallback(ctx.Request)
		if err != nil {
			ctx.String(http.StatusInternalServerError, err.Error())
			return
		}

		userInfo, err := logtoClient.FetchUserInfo()
		if err != nil {
			ctx.String(http.StatusInternalServerError, err.Error())
			return
		}
		res := UsersCol.FindOne(context.TODO(), bson.M{"logtoId": userInfo.Sub})
		var user User
		err = res.Decode(&user)
		if err == nil {
			// user already exists
			session, err := createSession(ctx, user.Username)
			if err != nil {
				ctx.JSON(500, Error(err))
				return
			}
			token := generateRandomString(24)
			sessionTokens[token] = session.Token
			ctx.Redirect(http.StatusTemporaryRedirect, returnUri+"?token="+token)
			return
		}

		logtoFirstId := generateRandomString(16)
		logtoFirsts[logtoFirstId] = userInfo.Sub

		// Jump to the page specified by the developer.
		// This example takes the user back to the home page.
		ctx.Redirect(http.StatusTemporaryRedirect, returnUri+"?logtoFirstId="+logtoFirstId)
	})
	logto.GET("/sessionToken", func(ctx *gin.Context) {
		token := ctx.Query("token")
		sessionToken, ok := sessionTokens[token]
		if !ok {
			ctx.JSON(400, ErrorStr("invalid token!"))
			return
		}
		delete(sessionTokens, token)
		ctx.JSON(200, gin.H{
			"token": sessionToken,
		})
	})
	logto.POST("/link", mounting.SessionedHandler, mounting.AuthedHandler, func(ctx *gin.Context) {
		type Request struct {
			LogtoFirstId string `json:"logtoFirstId"`
		}
		var req Request
		err := ctx.BindJSON(&req)
		if err != nil {
			ctx.JSON(400, Error(err))
			return
		}
		logtoUserId, ok := logtoFirsts[req.LogtoFirstId]
		if !ok {
			ctx.JSON(400, ErrorStr("invalid logtoFirstId"))
			return
		}
		delete(logtoFirsts, req.LogtoFirstId)
		user := GetUser(ctx)
		user.LogtoId = &logtoUserId
		_, err = UsersCol.ReplaceOne(ctx, bson.M{"_id": user.Username}, user)
		if err != nil {
			ctx.JSON(500, Error(err))
			return
		}
		ctx.Status(200)
	})
	logto.POST("/registerAccount", func(ctx *gin.Context) {
		type Request struct {
			LogtoFirstId string `json:"logtoFirstId"`
			Username     string `json:"username"`
		}
		var req Request
		err := ctx.BindJSON(&req)
		if err != nil {
			ctx.JSON(400, Error(err))
			return
		}
		logtoUserId, ok := logtoFirsts[req.LogtoFirstId]
		if !ok {
			ctx.JSON(400, ErrorStr("invalid logtoFirstId"))
			return
		}
		delete(logtoFirsts, req.LogtoFirstId)
		err = ValidateUsername(req.Username, ctx)
		if err != nil {
			ctx.JSON(400, Error(err))
			return
		}
		// check that there isn't already a user with the same logto user id
		count, err := UsersCol.CountDocuments(ctx, bson.M{"logtoId": logtoUserId})
		if err != nil {
			ctx.JSON(500, Error(err))
			return
		}
		if count > 0 {
			ctx.JSON(400, ErrorStr("user with the same logto user ID exists!"))
			return
		}
		user := User{
			Username: req.Username,
			LogtoId:  &logtoUserId,
		}
		_, err = UsersCol.InsertOne(ctx, user)
		if err != nil {
			ctx.JSON(500, Error(err))
			return
		}
		session, err := createSession(ctx, user.Username)
		if err != nil {
			ctx.JSON(500, Error(err))
			return
		}
		ctx.JSON(200, session)
	})
	logto.GET("/sign-out", func(ctx *gin.Context) {
		session := sessions.Default(ctx)
		logtoClient := client.NewLogtoClient(
			logtoConfig,
			&SessionStorage{Session: session},
		)

		// The sign-out request is handled by Logto.
		// The user will be redirected to the Post Sign-out Redirect URI on signed out.
		signOutUri, signOutErr := logtoClient.SignOut(ctx.Query("return"))

		if signOutErr != nil {
			ctx.String(http.StatusOK, signOutErr.Error())
			return
		}

		ctx.Redirect(http.StatusTemporaryRedirect, signOutUri)
	})
}

// These two methods are manually taken from the logto Go library because you can't change the state by default

func fetchOidcConfig(logtoConfig *client.LogtoConfig) (core.OidcConfigResponse, error) {
	discoveryEndpoint, constructEndpointErr := url.JoinPath(logtoConfig.Endpoint, "/oidc/.well-known/openid-configuration")
	if constructEndpointErr != nil {
		return core.OidcConfigResponse{}, constructEndpointErr
	}
	return core.FetchOidcConfig(&http.Client{}, discoveryEndpoint)
}

func SignIn(logtoClient *client.LogtoClient, logtoConfig *client.LogtoConfig, storage client.Storage, redirectUri string, returnUri string) (string, error) {
	oidcConfig, fetchOidcConfigErr := fetchOidcConfig(logtoConfig)

	if fetchOidcConfigErr != nil {
		return "", fetchOidcConfigErr
	}

	codeVerifier := core.GenerateCodeVerifier()
	codeChallenge := core.GenerateCodeChallenge(codeVerifier)
	state := generateRandomString(12) + "|" + returnUri
	//state := generateRandomString(12) + url.QueryEscape("|"+returnUri)

	signInUri, generateSignInUriErr := core.GenerateSignInUri(&core.SignInUriGenerationOptions{
		AuthorizationEndpoint: oidcConfig.AuthorizationEndpoint,
		ClientId:              logtoConfig.AppId,
		RedirectUri:           redirectUri,
		CodeChallenge:         codeChallenge,
		State:                 state,
		Scopes:                logtoConfig.Scopes,
		Resources:             logtoConfig.Resources,
		Prompt:                logtoConfig.Prompt,
	})

	if generateSignInUriErr != nil {
		return "", generateSignInUriErr
	}

	signInSession := client.SignInSession{
		RedirectUri:   redirectUri,
		CodeVerifier:  codeVerifier,
		CodeChallenge: codeChallenge,
		State:         state,
	}

	signInSessionJsonValue, marshalErr := json.Marshal(signInSession)
	if marshalErr != nil {
		return "", marshalErr
	}

	storage.SetItem(client.StorageKeySignInSession, string(signInSessionJsonValue))

	return signInUri, nil
}

func generateRandomString(length uint32) string {
	token := make([]byte, length)
	if _, error := rand.Read(token); error != nil {
		// This should never happen
		panic(fmt.Sprintf("Failed to generate random string: %v", error))
	}
	return base64.RawURLEncoding.EncodeToString(token)
}
