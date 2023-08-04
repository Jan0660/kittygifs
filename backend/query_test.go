package main

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestParseQuery(t *testing.T) {
	testCases := []struct {
		query string
		want  ComprehensiveQuery
	}{
		{"test @uploader \"note\"", ComprehensiveQuery{[]string{"test"}, "uploader", "note", "", nil, nil, nil}},
		{"test \"note\" @uploader ", ComprehensiveQuery{[]string{"test"}, "uploader", "note", "", nil, nil, nil}},
		{"test \"\"note \" quotes\"\" @uploader ", ComprehensiveQuery{[]string{"test"}, "uploader", "\"note \" quotes\"", "", nil, nil, nil}},
		{"\"note", ComprehensiveQuery{[]string{}, "", "note", "", nil, nil, nil}},
		{"test @uploader", ComprehensiveQuery{[]string{"test"}, "uploader", "", "", nil, nil, nil}},
	}
	user := "user"
	for _, tc := range testCases {
		parsed, err := ParseQuery(tc.query, &user)
		if err != nil {
			t.Error(err)
		}

		assert.Equal(t, tc.want.Tags, parsed.Tags)
		assert.Equal(t, tc.want.Uploader, parsed.Uploader)
		assert.Equal(t, tc.want.NoteRegex, parsed.NoteRegex)
		assert.Equal(t, tc.want.NoteText, parsed.NoteText)
		assert.Equal(t, tc.want.IncludeGroups, parsed.IncludeGroups)
		assert.Equal(t, tc.want.Group, parsed.Group)
		assert.Equal(t, tc.want.Sort, parsed.Sort)
	}
}
