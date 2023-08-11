package util

type Gif struct {
	Id               string   `json:"id" bson:"_id"`
	Url              string   `json:"url" bson:"url"`
	PreviewGif       *string  `json:"previewGif,omitempty" bson:"previewGif,omitempty"`
	PreviewVideo     *string  `json:"previewVideo,omitempty" bson:"previewVideo,omitempty"`
	PreviewVideoWebm *string  `json:"previewVideoWebm,omitempty" bson:"previewVideoWebm,omitempty"`
	Size             *Size    `json:"size,omitempty" bson:"size,omitempty"`
	Tags             []string `json:"tags" bson:"tags"`
	Uploader         string   `json:"uploader" bson:"uploader"`
	Note             string   `json:"note" bson:"note"`
	Group            *string  `json:"group,omitempty" bson:"group,omitempty"`
}

type Size struct {
	Width  int32 `json:"width" bson:"width"`
	Height int32 `json:"height" bson:"height"`
}

type User struct {
	Username     string    `json:"username" bson:"_id"`
	PasswordHash string    `json:"passwordHash" bson:"passwordHash"`
	Groups       *[]string `json:"groups,omitempty" bson:"groups,omitempty"`
	Email        *string   `json:"email,omitempty" bson:"email,omitempty"`
	Verification *string   `json:"verification,omitempty" bson:"verification,omitempty"`
}

// HasGroups Returns true if user has all the specified groups or is admin, otherwise returns false
func (user *User) HasGroups(groups []string) bool {
	if user == nil {
		return false
	}
	if user.HasGroup("admin") {
		return true
	}
	for _, group := range groups {
		if !user.HasGroup(group) {
			return false
		}
	}
	return true
}

// HasGroup Returns true if user has the specified group or is admin, otherwise returns false
func (user *User) HasGroup(group string) bool {
	if user == nil {
		return false
	}
	if user.Groups == nil {
		return false
	}
	if group != "admin" && user.HasGroup("admin") {
		return true
	}
	if group[0] == '@' && user.Username == group[1:] {
		return true
	}
	for _, userGroup := range *user.Groups {
		if userGroup == group {
			return true
		}
	}
	return false
}

type UserSession struct {
	Username string `json:"username" bson:"username"`
	Token    string `json:"token" bson:"_id"`
}

type Configuration struct {
	MongoUrl                 string                `json:"mongoUrl"`
	DatabaseName             string                `json:"databaseName"`
	Address                  string                `json:"address"`
	AllowSignup              bool                  `json:"allowSignup"`
	AccessControlAllowOrigin *[]string             `json:"accessControlAllowOrigin"`
	IssueDiscordWebhook      *string               `json:"issueDiscordWebhook"`
	Captcha                  *CaptchaConfiguration `json:"captcha"`
	Smtp                     *SmtpConfiguration    `json:"smtp"`
	ApiUrl                   string                `json:"apiUrl"`
}

type CaptchaConfiguration struct {
	SiteKey   string `json:"siteKey"`
	SecretKey string `json:"secretKey"`
}

type SmtpConfiguration struct {
	ServerAddress string `json:"serverAddress"`
	FromAddress   string `json:"fromAddress"`
	FromName      string `json:"fromName"`
	Username      string `json:"username"`
	Password      string `json:"password"`
}

type UserInfo struct {
	Username string     `json:"username"`
	Groups   *[]string  `json:"groups,omitempty"`
	Stats    *UserStats `json:"stats,omitempty"`
}

type UserStats struct {
	Uploads int64 `json:"uploads"`
}
