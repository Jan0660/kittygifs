# Selfhosting

## Docker

1. Create your `backend/config.json` as described in [Backend](#backend). The `mongoUrl` should be `mongodb://mongodb` and keep the `address` and `databaseName` same as in the example.
2. `cp .env.example .env` and change `HOSTNAME` to the URL you will access kittygifs at.
3. `cp frontend/.env.production frontend/.env.production.local` and change `VITE_API_URL` to what you changed `HOSTNAME` to above and add `/api` to it.
   The frontend image needs to be rebuilt if this file is changed.
4. `docker-compose build`
5. `docker-compose up -d`
6. TODO MAKING AN ADMIN USER

## Backend

1. Install Go 1.21 or higher
2. `cd backend/`
3. `go build -ldflags "-s -w"` (the flags remove debug info and reduce binary size)
4. Create your `config.json`, fill in the `mongoUrl`. See [Config](#config) for more info.

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

5. Run the binary

## Frontend

1. [Get pnpm](https://pnpm.io/installation) and at least Node.js v16.
2. `cd frontend/`
3. Edit `.env.production` to suit your needs.
4. `pnpm build`
5. The built site is now in `./dist`

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

### `smtp`

SMTP server to use for sending emails. Requires `apiUrl` to be set.

```json
{
  // ...
  "smtp": {
    "serverAddress": "mailserver:465",
    "fromAddress": "noreply@jan0660.dev",
    "fromName": "kittygifs",
    "username": "noreply@jan0660.dev",
    "password": ""
  }
}
```
