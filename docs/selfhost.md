# Selfhosting

1. Install Go 1.20 or higher
2. Clone this repo
3. `cd backend/`
4. `go build -ldflags "-s -w"` (the flags remove debug info and reduce binary size)
5. Create your `config.json`, fill in the `mongoUrl`. See [Config](#config) for more info.

   ```json
   {
     "mongoUrl": "",
     "databaseName": "kittygifs",
     "address": ":8234",
     "apiUrl": "https://gifs-api.jan0660.dev",
     "allowSignup": true,
     "accessControlAllowOrigin": ["*"]
   }
   ```

6. Run the binary

## Config

### `mongoUrl`

Required. Connection string to your MongoDB instance.
See [MongoDB docs](https://docs.mongodb.com/manual/reference/connection-string/) for more info.

### `databaseName`

Required. Name of the database to use, will be created if it doesn't exist.

### `address`

Required. Address to listen on.

### `apiUrl`

Required by `smtp`. URL of the API, used in the verification email. Must not have a trailing slash.

### `allowSignup`

Whether to allow users to sign up.
If set to `false`, only users that are already in the database can log in.

### `accessControlAllowOrigin`

Values for the `Access-Control-Allow-Origin` header. Set to `["*"]` to allow all origins.
See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin) for more info.
If multiple origins are provided the one that matches the `Origin` header will be sent on the requests.
Remember to include `https://tauri.localhost` and `tauri://localhost` if you want the Tauri app to work.

### `issueDiscordWebhook`

Discord webhook URL too send notifications of GDPR requests to.
If not set, no notifications will be sent.

### `captcha`

Site key and secret key for hCaptcha.

```json
{
  // ...
  "captcha": {
    "siteKey": "",
    "secretKey": ""
  }
}
```

### `logto`

Note that when using Logto, legacy signup (username and password) is disabled by default.

```json
{
  // ...
 "logto": {
    "endpoint":           "https://logto.jan0660.dev/",
    "appId":              "",
    "appSecret":          "",
    "allowLegacySignup":  false
  }
}
```
