# QuickNotes System Design

This project has two parts. The first is a small web page that talks to a practice API (JSONPlaceholder) to load, create and delete notes. The second is a set of design documents that describe how QuickNotes could become a real online service for 1 million users, including the API, the database and the overall architecture.

## How to run the API client

1. Download or clone this repository.
2. Open the `quicknotes-system-design` folder.
3. Double-click `index.html` to open it in your browser. You need an internet connection.
4. Click **Load notes** to load 10 notes, use the form to add a note, and use **Delete** to remove one.

Note: JSONPlaceholder is a practice API, so notes you create or delete are not really saved on the server.

## Design documents

- [API design](docs/api-design.md)
- [Data model](docs/data-model.md)
- [Architecture](docs/architecture.md)

## What I learned

- How to send GET, POST and DELETE requests with fetch, async/await and try/catch/finally.
- How to show loading, success, error and empty states so users always know what is happening.
- How a many-to-many relationship needs a join table (note_tags).
- How a CDN, cache, load balancer and read replica help a read-heavy system handle many users.