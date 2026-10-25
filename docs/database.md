# Database

MongoDB with Mongoose. No models exist yet. They are added in Prompt 2 (User, OtpRequest, Session) and Prompt 3 (all other collections).

When models are added, this file lists, for each collection: purpose, fields, indexes, and relationships, plus a Mermaid ER diagram.

## Local setup

`docker compose up -d` starts MongoDB 7 as a single-node replica set (`rs0`) on port 27017. Connection string:

```
mongodb://localhost:27017/agriconnect?replicaSet=rs0
```
