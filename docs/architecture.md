# QuickNotes Architecture

## 1. Requirements

### Functional requirements
- Users can sign up and log in.
- Users can create, read, update and delete their own notes.
- Users can add tags to notes and filter notes by tag.
- Users can list their notes, page by page.

### Non-functional requirements
- **Scalability:** support 1 million users.
- **Availability:** the service should be up 99.9% of the time.
- **Speed:** most requests should answer in under 300 ms.
- **Durability:** a saved note must never be lost.
- **Security:** only the owner of a note can see or change it.

## 2. Load estimate (1 million users)

**Assumptions**
- 1,000,000 registered users, and 20% are active each day, so 200,000 daily active users.
- Each active user views their notes 20 times a day and creates 5 notes a day.
- One day has 86,400 seconds, and peak traffic is 5 times the average.
- One note takes about 1 KB of storage (title, body and details).

**Reads per second**
- 200,000 x 20 = 4,000,000 reads per day
- Average: 4,000,000 / 86,400 = about **46 reads per second**
- Peak: about **231 reads per second**

**Writes per second**
- 200,000 x 5 = 1,000,000 writes per day
- Average: 1,000,000 / 86,400 = about **12 writes per second**
- Peak: about **58 writes per second**

**Storage per year**
- 1,000,000 notes per day x 365 = 365,000,000 notes
- 365,000,000 x 1 KB = about **365 GB per year** (we would plan for about 1 TB to allow for indexes and growth)

The system is **read-heavy** (about 4 reads for every write), so caching and a read replica will help a lot.

## 3. Architecture diagram

```
                 +------------------------+
                 | Client (browser/phone) |
                 +------------------------+
                             |
                             v
                        +---------+
                        |   DNS   |
                        +---------+
                             |
                             v
                        +---------+
                        |   CDN   |   (static files: HTML, CSS, JS)
                        +---------+
                             |  (API requests)
                             v
                    +----------------+
                    | Load Balancer  |
                    +----------------+
                       |           |
                       v           v
              +--------------+ +--------------+
              | App Server 1 | | App Server 2 |   ... more can be added
              +--------------+ +--------------+
                       |           |
        ---------------+-----------+------------------------
             |                 |                    |
             v                 v                    v
        +--------+      +-------------+       +---------+
        | Cache  |      |  Primary    |       |  Queue  |
        +--------+      |  Database   |       +---------+
                        +-------------+            |
                               |                   v
                               | copies data   +--------+
                               v               | Worker |
                        +-------------+        +--------+
                        | Read Replica|             |
                        +-------------+             +--> (updates the database)
```

How the app servers use the parts:
- **Reads:** check the Cache first, then the Read Replica.
- **Writes:** go to the Primary Database.
- **Background jobs:** go to the Queue.

## 4. What each component does

- **Client:** The browser or phone app that people use to see and change their notes.
- **DNS:** Turns the service name (such as quicknotes.example) into the address of our servers, so users can find us.
- **CDN:** Serves static files like HTML, CSS and JavaScript from servers near the user, so pages load fast and our servers carry less load.
- **Load balancer:** Spreads requests across several app servers so none is overloaded and traffic keeps flowing if one fails.
- **App servers:** Run the QuickNotes logic (login, checking input, creating and listing notes), and we add more as traffic grows.
- **Cache:** Keeps recently requested note lists in fast memory so we do not ask the database every time.
- **Primary database:** The one trusted place where all data is written and stored safely.
- **Read replica:** A live copy of the primary that answers read queries, which takes pressure off the primary.
- **Queue:** Holds background jobs in order so a request does not have to wait for slow work.
- **Worker:** Takes jobs from the queue and does them in the background, such as sending a confirmation email or updating the search index.

## 5. Request flows

### GET /notes
1. The client sends `GET /notes?page=1` with its login token.
2. DNS gives the address of our service and the request reaches the load balancer.
3. The load balancer sends it to one of the app servers.
4. The app server checks the token. If it is invalid, it answers `401`.
5. The app server looks in the cache for this user's page 1.
6. If it is found (a cache hit), it returns the notes straight away.
7. If not (a cache miss), it asks the read replica for the notes.
8. The app server saves the result in the cache for 60 seconds.
9. The app server answers `200 OK` with the notes as JSON.

### POST /notes
1. The client sends `POST /notes` with the JSON body and its login token.
2. The request goes through DNS and the load balancer to an app server.
3. The app server checks the token (`401` if invalid) and checks the data. If the title is missing or longer than 100 characters, it answers `400`.
4. The app server writes the new note (and its tags) to the primary database.
5. The app server clears this user's cached note lists so the next read is fresh.
6. The app server adds a background job to the queue.
7. The app server answers `201 Created` with the new note.
8. Later, a worker takes the job from the queue and does it.
9. The primary database copies the new note to the read replica.

## 6. Trade-offs

1. **Cache: speed versus fresh data.** The cache makes reads much faster and protects the database, but cached data can be a little old. We clear the cache when a user writes, but this adds extra work and complexity.
2. **Read replica: less load versus delay.** The replica shares the reading work, but it copies data a moment after the primary. A user who creates a note and reloads straight away might not see it. We can avoid this by reading that user's own recent notes from the primary.
3. **Queue and worker: fast replies versus a short wait.** Users get a quick answer, but background work finishes a little later, and we have more parts to run and monitor.
4. **SQL: strong rules versus scaling effort.** SQL keeps data correct, but spreading writes over many databases is harder than with some NoSQL systems. At our size, one primary is enough.

## 7. Avoiding single points of failure

- **App servers:** There are at least two behind the load balancer. If one fails, the others keep working.
- **Load balancer:** We run it as a redundant pair (or use a managed one), so there is a backup if one fails.
- **Primary database:** The read replica is a live copy that can be promoted to primary if the primary fails (failover). We also take regular backups.
- **Cache:** If the cache fails, the app servers fall back to the read replica, so the service slows down but keeps working. We can also run several cache servers.
- **Queue:** Jobs are stored safely until a worker finishes them, and several workers can run, so if one worker fails, another continues.
- **DNS and CDN:** Both are run across many locations by their providers, so one failure does not take them down.