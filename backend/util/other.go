package util

import (
	"crypto/rand"
	"errors"
	"github.com/alexedwards/argon2id"
	"github.com/oklog/ulid/v2"
	"math/big"
	mathRand "math/rand"
	"net/url"
	"strings"
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
		url, err := url.Parse(gif.Url)
		if err != nil {
			return errors.New("failed to parse url: " + err.Error())
		}
		if url.Scheme != "https" && url.Scheme != "http" {
			return errors.New("url is not http or https")
		}
		// verify domain
		hostname := strings.ToLower(url.Hostname())
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
	for _, tag := range tags {
		if !TagValidation.MatchString(tag) {
			return errors.New("Invalid tag: " + tag)
		}
	}
	return nil
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
