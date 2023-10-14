FROM alpine:3 AS base
WORKDIR /app

FROM golang:1.21-alpine AS build
WORKDIR /
COPY . .
RUN go build -o /app/backend

FROM base AS final
WORKDIR /app
COPY --from=build /app/backend /app/backend
COPY --from=build /resources /app/resources

CMD [ "/app/backend" ]