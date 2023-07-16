package main

import "strings"

type ComprehensiveQuery struct {
	Tags     []string
	Uploader string
	Note     string
	// IncludeGroups if nil, search must not include grouped posts,
	// if empty, search must include all grouped posts,
	// if non-empty, search must include items belonging to any of the groups
	IncludeGroups *[]string
	// Groups search results must belong to all of these groups
	Groups *[]string
}

func ParseQuery(query string) (*ComprehensiveQuery, error) {
	tags := []string{}
	uploader := ""
	note := ""
	var includeGroups *[]string
	var groups *[]string
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
		} else if s[0] == '#' {
			if len(s) >= 2 && s[1] == '!' {
				if groups == nil {
					groups = &[]string{}
				}
				*groups = append(*groups, s[2:])
			} else {
				if includeGroups == nil {
					includeGroups = &[]string{}
				}
				*includeGroups = append(*includeGroups, s[1:])
			}
		} else if s == "$ig" {
			includeGroups = &[]string{}
		} else {
			tags = append(tags, s)
		}
	}
	return &ComprehensiveQuery{
		Tags:          tags,
		Uploader:      uploader,
		Note:          note,
		IncludeGroups: includeGroups,
		Groups:        groups,
	}, nil
}
