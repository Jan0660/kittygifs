package main

import (
	"errors"
	"go.mongodb.org/mongo-driver/bson"
	"strings"
)

var Sorts = map[string]interface{}{
	"new": bson.M{"_id": -1},
	"old": bson.M{"_id": 1},
}

type ComprehensiveQuery struct {
	Tags      []string
	Uploader  string
	NoteRegex string
	NoteText  string
	// IncludeGroups if nil, search must not include grouped posts,
	// if empty, search must include all grouped posts,
	// if non-empty, search must include items belonging to any of the groups
	IncludeGroups *[]string
	// Groups search results must belong to this group
	Group *string
	Sort  interface{}
}

func ParseQuery(query string, searcherUsername *string) (*ComprehensiveQuery, error) {
	tags := []string{}
	uploader := ""
	noteRegex := ""
	noteText := ""
	var includeGroups *[]string
	var group *string
	var sort interface{}
	getQuoted := func(quote string) string {
		start := strings.Index(query, quote)
		if start != -1 {
			afterStart := query[start+1:]
			end := strings.LastIndex(afterStart, quote)
			if end == -1 {
				query = query[:start]
				return afterStart
			} else {
				query = query[:start] + query[start+end+2:]
				return afterStart[:end]
			}
		}
		return ""
	}
	noteText = getQuoted("'")
	noteRegex = getQuoted("\"")
	for _, s := range strings.Split(query, " ") {
		if s == "" {
			continue
		}
		if s[0] == '@' {
			uploader = s[1:]
		} else if s[0] == '#' {
			if len(s) >= 2 && s[1] == '!' {
				if group != nil {
					return nil, errors.New("multiple groups specified")
				}
				sl := s[2:]
				if sl == "private" {
					if searcherUsername == nil {
						return nil, errors.New("cannot search private group without username")
					}
					sl = "@" + *searcherUsername
				}
				group = &sl
			} else {
				if includeGroups == nil {
					includeGroups = &[]string{}
				}
				sl := s[1:]
				if sl == "private" {
					if searcherUsername == nil {
						return nil, errors.New("cannot search private group without username")
					}
					sl = "@" + *searcherUsername
				}
				*includeGroups = append(*includeGroups, sl)
			}
		} else if s == "$ig" {
			includeGroups = &[]string{}
		} else if strings.HasPrefix(s, "sort:") {
			name := s[5:]
			sortLocal, ok := Sorts[name]
			if !ok {
				return nil, errors.New("invalid sort name")
			}
			sort = sortLocal
		} else {
			tags = append(tags, s)
		}
	}
	return &ComprehensiveQuery{
		Tags:          tags,
		Uploader:      uploader,
		NoteRegex:     noteRegex,
		NoteText:      noteText,
		IncludeGroups: includeGroups,
		Group:         group,
		Sort:          sort,
	}, nil
}
