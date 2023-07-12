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
		{"test @uploader \"note\"", ComprehensiveQuery{[]string{"test"}, "uploader", "note"}},
		{"test \"note\" @uploader ", ComprehensiveQuery{[]string{"test"}, "uploader", "note"}},
		{"test \"\"note \" quotes\"\" @uploader ", ComprehensiveQuery{[]string{"test"}, "uploader", "\"note \" quotes\""}},
		{"\"note", ComprehensiveQuery{[]string{}, "", "note"}},
		{"test @uploader", ComprehensiveQuery{[]string{"test"}, "uploader", ""}},
	}
	for _, tc := range testCases {
		parsed, err := ParseQuery(tc.query)
		if err != nil {
			t.Error(err)
		}

		assert.Equal(t, tc.want.Tags, parsed.Tags)
		assert.Equal(t, tc.want.Uploader, parsed.Uploader)
		assert.Equal(t, tc.want.Note, parsed.Note)
	}
}
