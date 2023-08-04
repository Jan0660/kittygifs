package util

import (
	"github.com/alexedwards/argon2id"
	"github.com/gin-gonic/gin"
)

func Error(err error) gin.H {
	return gin.H{"error": err.Error()}
}

func ErrorStr(str string) gin.H {
	return gin.H{"error": str}
}

func GetUser(c *gin.Context) *User {
	userGet, _ := c.Get("user")
	if userGet == nil {
		return nil
	}
	return userGet.(*User)
}

// CheckPassword checks if a password is correct, returns true if it is and false if it isn't and also sets the
// appropriate status code and error message
func CheckPassword(c *gin.Context, password, hash string) bool {
	if match, err := argon2id.ComparePasswordAndHash(password, hash); !match || err != nil {
		if err != nil {
			c.JSON(500, Error(err))
			return false
		}
		c.JSON(401, ErrorStr("invalid password"))
		return false
	}
	return true
}
