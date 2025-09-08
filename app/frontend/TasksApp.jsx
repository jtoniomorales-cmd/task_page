import { useEffect, useMemo, useRef, useState } from "react";

const API = "/api/v1/tasks";
const LABEL = { todo: "To do", in_progress: "In progress", done: "Done" };
const COLUMNS = ["todo", "in_progress", "done"];

export default function TasksApp() {
  // data
  const [tasks, setTasks] = useState([]);

  // create form
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [desc, setDesc] = useState("");

  // inline edit
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef(null);

  // DnD state
  const [draggingId, setDraggingId] = useState(null);
  const [hoverCol, setHoverCol] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus();
  }, [editingId]);

  const groups = useMemo(() => {
    const norm = s => (s ?? "").trim();
    const byPos = (a, b) => (a.position ?? 0) - (b.position ?? 0);
    return {
      todo:        tasks.filter(t => norm(t.status) === "todo").sort(byPos),
      in_progress: tasks.filter(t => norm(t.status) === "in_progress").sort(byPos),
      done:        tasks.filter(t => norm(t.status) === "done").sort(byPos),
    };
  }, [tasks]);

  useEffect(() => {
    fetch(API).then(r => r.json()).then(setTasks);
  }, []);

  function startEdit(task) {
    setEditingId(task.id);
    setEditingTitle(task.title ?? "");
  }
  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
  }
  async function submitEdit(id) {
    const nextTitle = editingTitle.trim();
    if (!nextTitle) return;
    try {
      await updateTask(id, { title: nextTitle });
    } finally {
      cancelEdit();
    }
  }

  async function createTask(e) {
    e.preventDefault();
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf() },
      body: JSON.stringify({
        task: { title, status: "todo", due_date: dueDate || null, description: desc || "" },
      }),
    });
    if (r.ok) {
      const t = await r.json();
      setTasks(ts => [t, ...ts]);
      setTitle("");
      setDueDate("");
      setDesc("");
    }
  }

  async function reloadTasks() {
    const r = await fetch(API);
    const data = await r.json();
    setTasks(data);
  }

  async function updateTask(id, attrs, { reload = false } = {}) {
    const r = await fetch(`${API}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf() },
      body: JSON.stringify({ task: attrs }),
    });
    if (!r.ok) throw await r.json();

    const updated = await r.json();
    if (reload) {
      await reloadTasks();         // <-- pull server-truth (neighbors included)
    } else {
      setTasks(ts => ts.map(t => (t.id === updated.id ? updated : t)));
    }
    return updated;
  }

  async function deleteTask(id) {
    const r = await fetch(`${API}/${id}`, {
      method: "DELETE",
      headers: { "X-CSRF-Token": csrf() },
    });
    if (r.status === 204) setTasks(ts => ts.filter(t => t.id !== id));
  }

  const isOverdue = iso => {
    if (!iso) return false;
    const d = new Date(iso);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  // ----- DnD handlers -----
  function handleDragStart(e, task) {
    e.dataTransfer.setData("text/plain", String(task.id));
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(task.id);
  }

  function handleColumnDragOver(e, col) {
    e.preventDefault();                // allow drop
    e.dataTransfer.dropEffect = "move";
    setHoverCol(col);
    setHoverIndex(null);               // hovering the column, not a specific item
  }

  function handleItemDragOver(e, col, idx) {
    e.preventDefault();                // allow drop on item
    e.dataTransfer.dropEffect = "move";
    setHoverCol(col);
    setHoverIndex(idx);                // remember which index we’re over
  }

  function handleDragLeave() {
    setHoverCol(null);
    setHoverIndex(null);
  }

  async function handleDrop(e, newCol) {
    e.preventDefault();

    const id = Number(e.dataTransfer.getData("text/plain"));
    const task = tasks.find(t => t.id === id);
    if (!task || !COLUMNS.includes(newCol)) {
      handleDragLeave();
      return;
    }

    const list = groups[newCol];
    let targetIndex =
      hoverCol === newCol && typeof hoverIndex === "number"
        ? hoverIndex
        : list.length; // dropped in empty space -> end

    // same-column downward correction
    if (task.status === newCol) {
      const fromIndex = groups[newCol].findIndex(t => t.id === id);
      if (fromIndex !== -1 && targetIndex > fromIndex) {
        targetIndex = Math.max(fromIndex, targetIndex - 1);
      }
    }

    // optimistic update
    const prev = tasks;
    setTasks(ts => ts.map(t =>
      t.id === id ? { ...t, status: newCol, position: targetIndex } : t
    ));

    try {
      await updateTask(id, { status: newCol, position: targetIndex }, { reload: true });
    } catch (err) {
        setTasks(prev); // revert on failure
        console.error(err);
    } finally {
        setDraggingId(null);
        handleDragLeave();
    }
  }

  return (
    <div>
      <form onSubmit={createTask} style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr auto" }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" />
        <div style={{ display: "flex", gap: 8 }}>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" />
          <button>Add Task</button>
        </div>
      </form>

      <div style={{ fontFamily: "monospace", marginTop: 8 }}>
        totals: {tasks.length} | todo: {groups.todo.length} | in_progress: {groups.in_progress.length} | done: {groups.done.length}
      </div>

      <div className="board" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 16 }}>
        {COLUMNS.map(col => (
          <div
            key={col}
            className="column"
            onDragOver={e => handleColumnDragOver(e, col)}
            onDrop={e => handleDrop(e, col)}
            onDragLeave={handleDragLeave}
            style={{
              border: "2px dashed " + (hoverCol === col ? "#4096ff" : "#ddd"),
              background: hoverCol === col ? "#f0f7ff" : "transparent",
              borderRadius: 8,
              padding: 12,
              minHeight: 120,
              transition: "background 120ms ease, border-color 120ms ease",
            }}
          >
            <h3 style={{ marginTop: 0 }}>{LABEL[col]}</h3>

            {groups[col].length === 0 ? (
              <p style={{ color: "#777", fontStyle: "italic" }}>Drop here</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {groups[col].map((t, idx) => (   
                  <li
                    key={t.id}
                    draggable
                    onDragStart={e => handleDragStart(e, t)}
                    onDragOver={e => handleItemDragOver(e, col, idx)}
                    onDrop={e => handleDrop(e, col)}   // uses hoverIndex
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      border: "1px solid #eee",
                      borderRadius: 6,
                      marginBottom: 8,
                      background: "#fff",
                      cursor: "grab",
                      outline:
                        hoverCol === col && hoverIndex === idx ? "2px solid #4096ff" : "none",
                    }}
                    aria-grabbed={draggingId === t.id}
                  >
                    <div>
                      {editingId === t.id ? (
                        <form
                          onSubmit={e => { e.preventDefault(); submitEdit(t.id); }}
                          style={{ display: "flex", gap: 6 }}
                        >
                          <input
                            ref={inputRef}
                            value={editingTitle}
                            onChange={e => setEditingTitle(e.target.value)}
                            onBlur={() => submitEdit(t.id)}
                            onKeyDown={e => { if (e.key === "Escape") cancelEdit(); }}
                            placeholder="Task title"
                          />
                          <button type="submit">Save</button>
                          <button type="button" onClick={cancelEdit}>Cancel</button>
                        </form>
                      ) : (
                        <>
                          <div onDoubleClick={() => startEdit(t)} style={{ cursor: "text", fontWeight: 600 }}>
                            {t.title}
                          </div>
                          {t.description && (
                            <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{t.description}</div>
                          )}
                          {t.due_date && t.status !== "done" && isOverdue(t.due_date) && (
                            <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 10, background: "#ffe5e5", marginTop: 4, display: "inline-block" }}>
                              Overdue: {t.due_date}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <button type="button" onClick={() => startEdit(t)}>Edit</button>
                      <button type="button" onClick={() => deleteTask(t.id)}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function csrf() {
  const el = document.querySelector('meta[name="csrf-token"]');
  return el?.getAttribute("content");
}
