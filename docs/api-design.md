# QuickNotes API Design

This is the REST API the backend team should build for QuickNotes. All requests and responses use JSON. Every endpoint except login needs the header `Authorization: Bearer <token>`.

## Endpoints

| Method | Path | Description | Success status |
|---|---|---|---|
| POST | `/auth/login` | Log in and receive a token | 200 OK |
| GET | `/notes` | List the logged-in user's notes (supports `?page=`, `?limit=` and `?tag=`) | 200 OK |
| GET | `/notes/{id}` | Get one note | 200 OK |
| POST | `/notes` | Create a new note | 201 Created |
| PUT | `/notes/{id}` | Update an existing note | 200 OK |
| DELETE | `/notes/{id}` | Delete a note | 204 No Content |
| GET | `/tags` | List all tags | 200 OK |

## Example: create a note

`POST /notes`

Request body:

```json
{
  "title": "Buy milk",
  "body": "Two litres from the shop",
  "tags": ["personal"]
}
```

Response: `201 Created`

```json
{
  "id": 101,
  "title": "Buy milk",
  "body": "Two litres from the shop",
  "tags": ["personal"],
  "userId": 1,
  "createdAt": "2026-10-26T09:30:00Z"
}
```

## Example: list notes

`GET /notes?page=1&limit=2`

Response: `200 OK`

```json
{
  "page": 1,
  "limit": 2,
  "total": 25,
  "notes": [
    {
      "id": 101,
      "title": "Buy milk",
      "body": "Two litres from the shop",
      "tags": ["personal"],
      "createdAt": "2026-10-26T09:30:00Z"
    },
    {
      "id": 100,
      "title": "Finish report",
      "body": "Send it to Grace",
      "tags": ["work"],
      "createdAt": "2026-10-25T14:10:00Z"
    }
  ]
}
```

## Error codes

Every error uses the same body shape:

```json
{
  "error": {
    "code": 400,
    "message": "A short, clear explanation"
  }
}
```

| Status | Meaning | When it happens | Example error body |
|---|---|---|---|
| 400 Bad Request | The request is wrong or incomplete | `POST /notes` with no title, or a title over 100 characters | `{ "error": { "code": 400, "message": "Title is required and must be 100 characters or fewer." } }` |
| 401 Unauthorized | The user is not logged in | The token is missing, expired or invalid | `{ "error": { "code": 401, "message": "Please log in to continue." } }` |
| 403 Forbidden | Logged in, but not allowed | A user tries to read or delete a note that belongs to someone else | `{ "error": { "code": 403, "message": "You do not have permission to access this note." } }` |
| 404 Not Found | The thing does not exist | `GET /notes/99999` when no note has that id | `{ "error": { "code": 404, "message": "Note not found." } }` |
| 500 Internal Server Error | Something broke on our side | The database is down or the code has a bug | `{ "error": { "code": 500, "message": "Something went wrong. Please try again later." } }` |
