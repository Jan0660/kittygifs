package util

import "regexp"

var (
	UsernameValidation       = regexp.MustCompile("^[a-z0-9_]{3,20}$")
	TagValidation            = regexp.MustCompile("^[a-z0-9_]{2,20}$")
	TagCategoryValidation    = regexp.MustCompile("^[a-z0-9_]{2,20}$")
	ColorValidation          = regexp.MustCompile("(?i)^[0-9a-f]{6}$")
	IsTenorUrl               = regexp.MustCompile("(?i)^https://tenor.com/view/(?:.*-)?(?P<id>\\d+)$")
	TenorPreviewGifUrl       = regexp.MustCompile("(?i)\"mediumgif\":{\"url\":(\"https:\\\\u002F\\\\u002Fmedia[0-9]?.tenor.com\\\\u002F.+?\\\\u002F.+?\\.gif\")")
	TenorPreviewVideoUrl     = regexp.MustCompile("(?i)\"mp4\":{\"url\":(\"https:\\\\u002F\\\\u002Fmedia[0-9]?.tenor.com\\\\u002F.+?\\\\u002F.+?\\.mp4\")")
	TenorPreviewVideoWebmUrl = regexp.MustCompile("(?i)\"webm\":{\"url\":(\"https:\\\\u002F\\\\u002Fmedia[0-9]?.tenor.com\\\\u002F.+?\\\\u002F.+?\\.webm\")")
	TenorPreviewSize         = regexp.MustCompile("(?i)\"details\":{\"width\":(\\d+),\"height\":(\\d+)")
)
