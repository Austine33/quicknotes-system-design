// ===== Settings =====
const API_URL = "https://jsonplaceholder.typicode.com/posts";

// ===== Find the elements on the page =====
const loadBtn = document.querySelector("#load-btn");
const statusText = document.querySelector("#status");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitBtn = document.querySelector("#submit-btn");
const notesList = document.querySelector("#notes-list");

// ===== Helpers =====

// Show a message. type is "loading", "success" or "error"
function showStatus(message, type) {
  statusText.textContent = message;
  statusText.className = type;
}

// One reusable function for every request
async function request(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = new Error("Request failed with status " + response.status);
    error.status = response.status;
    throw error;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { data: data, status: response.status };
}

// Build one note card (textContent only, so user text is safe)
function createNoteItem(note) {
  const li = document.createElement("li");
  li.classList.add("note-card");

  const title = document.createElement("h3");
  title.textContent = note.title;

  const body = document.createElement("p");
  body.textContent = note.body;

    const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.classList.add("delete-btn");
  deleteBtn.addEventListener("click", function () {
    deleteNote(note, li, deleteBtn);
  });

  li.append(title, body, deleteBtn);
  return li;
}

// Draw a whole list of notes (or the empty state)
function showNotes(notes) {
  notesList.textContent = "";

  if (notes.length === 0) {
    const empty = document.createElement("li");
    empty.classList.add("empty");
    empty.textContent = "There are no notes to show.";
    notesList.appendChild(empty);
    return;
  }

  for (let i = 0; i < notes.length; i++) {
    notesList.appendChild(createNoteItem(notes[i]));
  }
}

// ===== GET: load notes =====
async function loadNotes() {
  showStatus("Loading notes...", "loading");
  loadBtn.disabled = true;

  try {
    const result = await request(API_URL + "?_limit=10");
    showNotes(result.data);
    showStatus("Loaded " + result.data.length + " notes from the server.", "success");
  } catch (error) {
    showStatus("Sorry, we could not load your notes. Please try again.", "error");
  } finally {
    loadBtn.disabled = false;
  }
}

loadBtn.addEventListener("click", loadNotes);

// ===== POST: create a note =====
async function createNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  // Validation: title is required, max 100 characters
  if (title === "") {
    showStatus("Please type a title.", "error");
    return;
  }
  if (title.length > 100) {
    showStatus("The title must be 100 characters or fewer.", "error");
    return;
  }

  showStatus("Saving note...", "loading");
  submitBtn.disabled = true;

  try {
    const result = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title, body: body, userId: 1 }),
    });

    // Remove the "no notes" message if it is showing
    const emptyMessage = notesList.querySelector(".empty");
    if (emptyMessage) {
      emptyMessage.remove();
    }

    // Add the new note at the top of the list
    notesList.prepend(createNoteItem(result.data));

    showStatus(
      "Note created (status " + result.status + ", id " + result.data.id + ").",
      "success"
    );
    noteForm.reset();
  } catch (error) {
    showStatus("Sorry, we could not save your note. Please try again.", "error");
  } finally {
    submitBtn.disabled = false;
  }
}

noteForm.addEventListener("submit", createNote);

// ===== DELETE: remove a note =====
// IMPORTANT: JSONPlaceholder does not really save the notes we create.
// A note we create gets the id 101, but the server does not know it, so
// DELETE /posts/101 may answer "404 Not Found". Our approach: we still send
// the DELETE request, but if a note we created ourselves (id above 100)
// gets a 404, we treat it as success and remove it from the page, because
// the note only ever existed on this page. Any other error is shown to the user.
async function deleteNote(note, li, deleteBtn) {
  showStatus("Deleting note...", "loading");
  deleteBtn.disabled = true;

  try {
    await request(API_URL + "/" + note.id, { method: "DELETE" });
    li.remove();
    showStatus("Note deleted.", "success");
  } catch (error) {
    if (note.id > 100 && error.status === 404) {
      li.remove();
      showStatus("Note removed (it only existed on this page).", "success");
    } else {
      deleteBtn.disabled = false;
      showStatus("Sorry, we could not delete that note. Please try again.", "error");
      return;
    }
  }

  // If the list is now empty, show the empty-state message
  if (notesList.children.length === 0) {
    showNotes([]);
  }
}