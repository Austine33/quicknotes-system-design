# QuickNotes Data Model

## Entities

### users
| Column | Type | Key / rule |
|---|---|---|
| id | INTEGER | Primary key |
| name | TEXT | Required |
| email | TEXT | Required, unique |
| password_hash | TEXT | Required (we never store the real password) |
| created_at | TEXT | Required |

### notes
| Column | Type | Key / rule |
|---|---|---|
| id | INTEGER | Primary key |
| user_id | INTEGER | Foreign key to users(id), required |
| title | TEXT | Required, maximum 100 characters |
| body | TEXT | Optional |
| created_at | TEXT | Required |
| updated_at | TEXT | Optional |

### tags
| Column | Type | Key / rule |
|---|---|---|
| id | INTEGER | Primary key |
| name | TEXT | Required, unique |

### note_tags
| Column | Type | Key / rule |
|---|---|---|
| note_id | INTEGER | Foreign key to notes(id) |
| tag_id | INTEGER | Foreign key to tags(id) |
| (note_id, tag_id) | | Together they are the primary key |

## Relationships

- **users to notes: one-to-many.** One user can write many notes, but each note belongs to exactly one user (`notes.user_id`).
- **notes to tags: many-to-many.** One note can have many tags (for example "work" and "urgent"), and one tag can be used on many notes. A many-to-many relationship needs a join table, so `note_tags` holds one row for every note-and-tag pair.

## CREATE TABLE statements

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL CHECK (length(title) <= 100),
  body TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id),
  FOREIGN KEY (tag_id) REFERENCES tags(id)
);
```

## Example queries

**1. All notes of one user, newest first**

```sql
SELECT id, title, created_at
FROM notes
WHERE user_id = 1
ORDER BY created_at DESC;
```

**2. All notes that have the tag "work" (uses a JOIN)**

```sql
SELECT notes.id, notes.title, tags.name AS tag
FROM notes
JOIN note_tags ON note_tags.note_id = notes.id
JOIN tags ON tags.id = note_tags.tag_id
WHERE tags.name = 'work';
```

**3. The number of notes each user has**

```sql
SELECT users.name, COUNT(notes.id) AS number_of_notes
FROM users
LEFT JOIN notes ON notes.user_id = users.id
GROUP BY users.id, users.name;
```

## Index

```sql
CREATE INDEX idx_notes_user_created ON notes(user_id, created_at);
```

**Reason:** The most common request is `GET /notes`, which asks for one user's notes, newest first. This index lets the database jump straight to that user's notes in date order instead of reading every note in the table. With millions of notes, this makes the main screen of the app much faster.

## SQL or NoSQL?

I choose **SQL** for QuickNotes. The data is clearly structured and has real relationships: users own notes, and notes share tags. A SQL database enforces rules for us, such as unique emails, required titles, and foreign keys that stop a note from pointing to a user who does not exist. Joins also make questions like "all notes with the tag work" easy to answer. At 1 million users and about 365 GB of new data per year, a single SQL database with a read replica can handle the load comfortably. NoSQL would be a better choice only if our data became unstructured or needed to be spread over many servers, which is not the case now.