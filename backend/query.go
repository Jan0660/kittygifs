package main

import "strings"

type ComprehensiveQuery struct {
	Tags     []string
	Uploader string
	Note     string
}

func ParseQuery(query string) (*ComprehensiveQuery, error) {
	tags := []string{}
	uploader := ""
	note := ""
	{
		start := strings.Index(query, "\"")
		if start != -1 {
			afterStart := query[start+1:]
			end := strings.LastIndex(afterStart, "\"")
			if end == -1 {
				note = afterStart
				query = query[:start]
			} else {
				note = afterStart[:end]
				query = query[:start] + query[start+end+2:]
			}
		}
	}
	for _, s := range strings.Split(query, " ") {
		if s == "" {
			continue
		}
		if s[0] == '@' {
			uploader = s[1:]
		} else {
			tags = append(tags, s)
		}
	}
	return &ComprehensiveQuery{
		Tags:     tags,
		Uploader: uploader,
		Note:     note,
	}, nil
}
