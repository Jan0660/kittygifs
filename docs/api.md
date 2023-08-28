# API

Request and response bodies are in JSON format.

## Searching

- `tag` - search for gifs with the specified tag, if multiple specified, gifs must have all tags,
  the last tag matches gifs where a tag starts with the specified string, e.g. `ki` matches `kitty`
- `@username` - search for gifs uploaded by the specified user
- `#group` - includes gifs from the specified group(s), `#private` includes private gifs
- `$ig` - includes gifs from your groups and private gifs, overridden by `#group`
- `#!group` - search for only gifs in the specified group, `#!private` searches for only private gifs
- `sort:sort`
  - `sort:new` - sort by upload date, newest first
  - `sort:old` - sort by upload date, oldest first

An odd one is searching for text in the note.
This is done by using a doublequoted section in the query, e.g. `"this is a note"`.
If there is no ending quote the rest of the query is treated as part of the note.
Note text search is case insensitive, but is sensitive to diacritics and interpunction.
This double quoted note search is done using MongoDB's "like" regex.

There is also note search using MongoDB's text index, but it is kinda wack.
It uses single quotes instead of double quotes.

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

Special groups:

- `admin` - can do anything, treated as having every group (except for `$ig` in search)
- `perm:edit_all_gifs` - permission to edit all gifs
- `perm:delete_all_gifs` - permission to delete all gifs
- `perm:edit_tags` - permission to edit all tags
- `gifEditSuggestions` - receives notifications about gif edit suggestions,
  still needs `perm:edit_all_gifs` to accept them

## Routes

### Public

#### GET /

Gets instance information.

Responses:

- 200: [InstanceInfo](#instanceinfo)

#### POST /users

Creates a new user. This endpoint may be disabled in the backend's configuration.

Request body:

- `username`: string - must pass this regex `^[a-z0-9_]{3,20}$`
  (lowercase, numbers and underscore, 3 to 20 characters)
- `password`: string - must be at least 8 characters long
- `captcha`?: string - the captcha token, required if captcha is enabled
- `email`?: string - the email address, required if SMTP is enabled

Responses:

- 403: signup disabled ([Error](#error))
- 400: invalid username or password, or username is already used ([Error](#error))
- 500: [Error](#error)
- 200
  - `type`: string = "created"
    - `session`: [UserSession](#usersession)
  - `type`: string = "verificationSent"

#### POST /users/sessions

Creates a new session for the specified user.

Request body:

- `username`: string
- `password`: string

Responses:

- 401: invalid username or password, account not verified ([Error](#error))
- 500: [Error](#error)
- 200: [UserSession](#usersession)

#### POST /users/resendVerificationEmail

Resends the verification email for the specified user.

Request body:

- `email`: string
- `captcha`?: string - the captcha token, required if captcha is enabled

Responses:

- 500: smtp not configured ([Error](#error))
- 500: [Error](#error)
- 400: invalid request, invalid captcha, email not found, account already verified ([Error](#error))
- 200

#### GET /users/verify/:token

Verifies the specified user.

Responses:

- 500: [Error](#error)
- 400: invalid token (string)
- 200 - the user is now verified (string)

#### GET /users/verifyEmailChange/:token

Verifies the email change for the specified user.

Responses:

- 500: [Error](#error)
- 400: invalid token (string)
- 200 - the email is now changed (string)

### Sessioned

#### GET /gifs/:id

Returns a gif by the specified ID. If the gif is in a group, the user must be in that group.

Responses:

- 200: [Gif](#gif)
- 403: you are not in the group ([Error](#error))
- 500: [Error](#error)

#### GET /gifs/search

Searches for gifs.

Query parameters:

- `q`: string - the search query, must not be longer than 256 characters, [see searching](#searching)
- `max`: int32 - the maximum number of gifs to return
- `skip`: int64 - the number of gifs to skip

Responses:

- 400: invalid query parameters ([Error](#error))
- 403: tried to search for gifs in a group you are not in ([Error](#error))
- 500: [Error](#error)
- 200: array of [Gif](#gif)

#### GET /users/:username/info

Gets information about the specified user.
If `username` is `self`, the information about the authenticated user is returned.

Query parameters:

- `stats`: bool? - if true, the user's stats are included in the response

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

Query parameters:

- `gifEditSuggestion`: string - the event ID of the gif edit suggestion to accept

Request body:

- `tags`: []string
- `note`: string
- `group`: string

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

#### POST /gifs/:id/edit/suggestions

Suggests an edit to a gif.

Request body:

- `tags`: []string
- `note`: string

Responses:

- 500: [Error](#error)
- 400: invalid request ([Error](#error))
- 200

#### POST /users/changeEmail

Requests an email change.

Request body:

- `email`: string
- `password`: string
- `captcha`?: string - the captcha token, required if captcha is enabled

Responses:

- 500: smtp not configured ([Error](#error))
- 500: [Error](#error)
- 400: invalid request, invalid captcha ([Error](#error))
- 200

#### POST /users/resetPassword

Resets your password.

Request body:

- `oldPassword`: string
- `newPassword`: string

Responses:

- 400: invalid password ([Error](#error))
- 500: [Error](#error)
- 200

#### POST /users/resetPasswordAdmin

For the admin to reset other users' passwords.

Request body:

- `username`: string
- `newPassword`: string

Responses:

- 400: invalid password ([Error](#error))
- 500: [Error](#error)
- 200

#### DELETE /users/sessions

Deletes all other sessions for the authenticated user.

Responses:

- 500: [Error](#error)
- 204

#### DELETE /users/sessions/:token

Deletes the specified session.

Responses:

- 500: [Error](#error)
- 204

#### GET /notifications

Gets the authenticated user's notifications.

Responses:

- 500: [Error](#error)
- 200: array of [Notification](#notification)

#### GET /notifications/count

Gets the number of notifications for the authenticated user.

Responses:

- 500: [Error](#error)
- 200
  - `count`: int64 - the number of notifications

#### DELETE /notifications/:id

Deletes the specified notification. See [Notifications](#notifications) for the deletion behavior.

Responses:

- 500: [Error](#error)
- 403: you cannot delete this notification ([Error](#error))
- 204

#### GET /notifications/byEventId/:eventId

Gets the notification with the specified event ID.

Responses:

- 500: [Error](#error)
- 200: [Notification](#notification)

#### GET /sync/settings

Gets the authenticated user's sync settings, used by the frontend.

Responses:

- 500: [Error](#error)
- 404: no settings saved
- 200: [SyncSettings](#syncsettings)

#### POST /sync/settings

Saves the authenticated user's sync settings, used by the frontend.

Request body: an object to be saved in the `data` field of the sync settings. Maximum body length is 4kB.

Responses:

- 500: [Error](#error)
- 400: invalid body, empty body, body > 4kB ([Error](#error))
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

### InstanceInfo

```ts
export type InstanceInfo = {
    allowSignup: boolean
    captcha?: {
        siteKey: string;
    },
    smtp?: {
        fromAddress: string;
    },
};
```

### SyncSettings

```ts
export type SyncSettings = {
    /** username */
    _id: string;
    data: any;
};
```

### Notification

```go
type Notification struct {
	Id       string                 `json:"id" bson:"_id"`
	Username string                 `json:"username" bson:"username"`
	EventId  string                 `json:"eventId" bson:"eventId"`
	Data     map[string]interface{} `json:"data" bson:"data"`
}
```

Typescript (includes `data`)

```typescript
export type Notification = {
    id: string,
    username: string,
    eventId: string,
    data: {
        type: "gdprRequest",
        username: string,
    } | {
        type: "gifEditSuggestion",
        username: string,
        gifId: string,
        tags: string[],
        note: string | null,
    },
};
```

## Notifications

```golang
const (
	GdprRequest       = "gdprRequest"
	GifEditSuggestion = "gifEditSuggestion"
)

// NotificationTypes is a list of all notification types
var NotificationTypes = []string{GdprRequest, GifEditSuggestion}

// NotificationTypesDeleteByEvent is a list of all notification types, where if the notification is deleted,
// the notifications with the same event id(that other users may have gotten) will also be deleted
var NotificationTypesDeleteByEvent = []string{GdprRequest}

// NotificationTypesDeletable is a list of all notification types, that can be deleted by the user,
// otherwise the notification is supposed to be deleted automatically by the server when the event is resolved,
// e.g. tag edit request is resolved
var NotificationTypesDeletable = []string{GdprRequest}
```
