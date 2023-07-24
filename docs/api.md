# API

Request and response bodies are in JSON format.

## Searching

- `tag` - search for gifs with the specified tag, if multiple specified, gifs must have all tags,
  the last tag matches gifs where a tag starts with the specified string, e.g. `ki` matches `kitty`
- `@username` - search for gifs uploaded by the specified user
- `#group` - includes gifs from the specified group(s), `#private` includes private gifs
- `$ig` - includes gifs from your groups and private gifs, overridden by `#group`
- `#!group` - search for only gifs in the specified group, `#!private` searches for only private gifs

An odd one is searching for text in the note.
This is done by using a doublequoted section in the query, e.g. `"this is a note"`.
If there is no ending quote the rest of the query is treated as part of the note.
Note text search is case insensitive, but is sensitive to diacritics and interpunction.

## Authentication

The session token should be sent in the `x-session-token` header.

The kittygifs API has 3 types of endpoints:

- Public endpoints: These endpoints do not require authentication.
- Sessioned endpoints: These endpoints unlock extra functionality if authenticated.
- Authed endpoints: These endpoints require authentication.

## Groups

Groups are used to restrict access to gifs and for permission management.
A user can have multiple groups, but a gif can only be in one group.

If `group` on a gif is `@{username}`, the gif is private to that user.

Permission groups:

- `admin` - can do anything, treated as having every group (except for `$ig` in search)
- `perm:edit_all_gifs`
- `perm:delete_all_gifs`

## Routes

### Public

#### GET /gifs/:id

Returns a gif by the specified ID.

Responses:

- 200: [Gif](#gif)
- 500: [Error](#error)

#### POST /users

Creates a new user. This endpoint may be disabled in the backend's configuration.

Request body:

- username: string - must pass `^[a-z0-9_]{3,20}$` this regex
- password: string - must be at least 8 characters long

Responses:

- 403: signup disabled ([Error](#error))
- 400: invalid username or password, or username is already used ([Error](#error))
- 500: [Error](#error)
- 200: [UserSession](#usersession)

#### POST /users/sessions

Creates a new session for the specified user.

Request body:

- username: string
- password: string

Responses:

- 401: invalid username or password ([Error](#error))
- 500: [Error](#error)
- 200: [UserSession](#usersession)

### Sessioned

#### GET /gifs/search

Searches for gifs.

Query parameters:

- q: string - the search query, must not be longer than 256 characters, [see searching](#searching)
- max: int32 - the maximum number of gifs to return
- skip: int64 - the number of gifs to skip

Responses:

- 400: invalid query parameters ([Error](#error))
- 403: tried to search for gifs in a group you are not in ([Error](#error))
- 500: [Error](#error)
- 200: array of [Gif](#gif)

#### GET /users/:username/info

Gets information about the specified user.
If `username` is `self`, the information about the authenticated user is returned.

Query parameters:

- stats: bool? - if true, the user's stats are included in the response

Responses:

- 400: invalid query parameters ([Error](#error))
- 500: [Error](#error)
- 200: [UserInfo](#userinfo)

### Authed

All endpoints in this section respond with 401 if not authenticated.

#### POST /gifs

Creates a new gif.

Request body: [Gif](#gif) - the `id`, `uploader`, `size` and preview fields are ignored.

Responses:

- 400: invalid gif ([Error](#error))
- 403: if the `group` field is present and the user is not in the group ([Error](#error))
- 500: [Error](#error)
- 200: [Gif](#gif)

#### PATCH /gifs/:id

Updates a gif.
The authenticated user must be the uploader of the gif or have the `perm:edit_all_gifs` group.

Request body:

- tags: []string
- note: string
- group: string

Responses:

- 400: invalid gif ([Error](#error))
- 403: you cannot edit this gif or tried to set it to a group you are not in ([Error](#error))
- 500: [Error](#error)
- 200: [Gif](#gif)

#### DELETE /gifs/:id

Deletes a gif.
The authenticated user must be the uploader of the gif or have the `perm:delete_all_gifs` group.

Responses:

- 403: you cannot delete this gif ([Error](#error))
- 500: [Error](#error)
- 200: [Gif](#gif)

#### POST /users/resetPassword

Resets your password.

Request body:

- oldPassword: string
- newPassword: string

Responses:

- 400: invalid password ([Error](#error))
- 500: [Error](#error)
- 200

#### POST /users/resetPasswordAdmin

For the admin to reset other users' passwords.

Request body:

- username: string
- newPassword: string

Responses:

- 400: invalid password ([Error](#error))
- 500: [Error](#error)
- 200

#### DELETE /users/sessions/:token

Deletes the specified session.

Responses:

- 500: [Error](#error)
- 200

## Objects

The following type definitions are from the Go backend.
The name in the `json:"??"` tag is the name of the field in the JSON object.
If it contains a `omitempty` tag, it means that the field may not be present in the JSON object.
The `bson` tag is what the field is named in the MongoDB database.

Remember that pointer(e.g. `*string`) and slice(e.g. `[]`string) fields may be null.

### Gif

```go
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
```

### Size

```go
type Size struct {
	Width  int32 `json:"width" bson:"width"`
	Height int32 `json:"height" bson:"height"`
}
```

### UserSession

```go
type UserSession struct {
	Username string `json:"username" bson:"username"`
	Token    string `json:"token" bson:"_id"`
}
```

### Error

Just an error string.

```go
type Error struct {
    Error string `json:"error"
}
```

### UserInfo

```go
type UserInfo struct {
	Username string     `json:"username"`
	Groups   *[]string  `json:"groups,omitempty"`
	Stats    *UserStats `json:"stats,omitempty"`
}
```

### UserStats

```go
type UserStats struct {
	Uploads int64 `json:"uploads"`
}
```
