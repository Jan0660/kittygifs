package util

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"github.com/alexedwards/argon2id"
	"github.com/oklog/ulid/v2"
	"math/big"
	mathRand "math/rand"
	"net/url"
	"strings"
	"time"
)

var Argon2idParams = &argon2id.Params{
	Memory:      128 * 1024,
	Iterations:  6,
	Parallelism: 4,
	SaltLength:  16,
	KeyLength:   32,
}

var AllowedDomains = []string{
	"tenor.com",
	"media.tenor.com",
	"i.imgur.com",
	"media.discordapp.net",
	"cdn.discordapp.com",
	"autumn.revolt.chat",
}

// ValidateGif Returns nil if gif is valid, otherwise returns an error
func ValidateGif(gif Gif) error {
	if gif.Url == "" {
		return errors.New("url is empty")
	}
	if len(gif.Url) > 320 {
		return errors.New("url is too long(>320)")
	}
	{
		gifUrl, err := url.Parse(gif.Url)
		if err != nil {
			return errors.New("failed to parse url: " + err.Error())
		}
		if gifUrl.Scheme != "https" && gifUrl.Scheme != "http" {
			return errors.New("url is not http or https")
		}
		// verify domain
		hostname := strings.ToLower(gifUrl.Hostname())
		valid := false
		for _, domain := range AllowedDomains {
			if hostname == domain {
				valid = true
				break
			}
		}
		if !valid {
			return errors.New("domain is not allowed")
		}
	}
	if len(gif.Tags) > 24 {
		return errors.New("too many tags(>24)")
	}
	if len(gif.Note) > 512 {
		return errors.New("note is too long(>512)")
	}
	if err := ValidateTags(gif.Tags); err != nil {
		return err
	}
	if gif.Group != nil && *gif.Group == "" {
		return errors.New("group is empty string, use null instead")
	}
	return nil
}

// ValidateTags Returns nil if tags are valid, otherwise returns an error
func ValidateTags(tags []string) error {
	for index, tag := range tags {
		if !TagValidation.MatchString(tag) {
			return errors.New("Invalid tag: " + tag)
		}
		// check for duplicates
		for index2, tag2 := range tags {
			if index != index2 && tag == tag2 {
				return errors.New("Duplicate tag: " + tag)
			}
		}
	}
	return nil
}

// ValidateTag Validates a tag object.
// Does not verify the name.
func ValidateTag(tag Tag) error {
	if tag.Description != nil {
		if *tag.Description == "" {
			return errors.New("description is empty, should be null instead")
		}
		if len(*tag.Description) > 128 {
			return errors.New("description is too long(>128)")
		}
	}
	if tag.Color != nil && !ColorValidation.MatchString(*tag.Color) {
		return errors.New("invalid color")
	}
	return nil
}

// GetBase64Timestamp gets a URL safe base64 encoded timestamp in UNIX seconds
func GetBase64Timestamp() string {
	bytes := make([]byte, 8)
	binary.PutUvarint(bytes, uint64(time.Now().Unix()))
	return base64.RawURLEncoding.EncodeToString(bytes)
}

// ParseBase64Timestamp parses a URL safe base64 encoded timestamp in UNIX seconds
func ParseBase64Timestamp(timestamp string) (time.Time, error) {
	bytes, err := base64.RawURLEncoding.DecodeString(timestamp)
	if err != nil {
		return time.Time{}, err
	}
	seconds, _ := binary.Uvarint(bytes)
	return time.Unix(int64(seconds), 0), nil
}

func GenerateVerificationToken() string {
	return GetBase64Timestamp() + "." + GenerateRandomString(24)
}

func GetVerificationTokenTimestamp(token string) (time.Time, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return time.Time{}, errors.New("invalid token format")
	}
	return ParseBase64Timestamp(parts[0])
}

// thanks https://gist.github.com/dopey/c69559607800d2f2f90b1b1ed4e550fb?permalink_comment_id=3527095#gistcomment-3527095
func GenerateRandomString(n int) string {
	const letters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-"
	ret := make([]byte, n)
	for i := 0; i < n; i++ {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(letters))))
		ret[i] = letters[num.Int64()]
	}

	return string(ret)
}

var entropy = ulid.Monotonic(mathRand.New(mathRand.NewSource(int64(ulid.Now()))), 0)

func NewUlid() string {
	return ulid.MustNew(ulid.Now(), entropy).String()
}
