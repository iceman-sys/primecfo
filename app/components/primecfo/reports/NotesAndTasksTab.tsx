"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, StickyNote, CheckSquare } from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";

const mockTasks = [
  { id: "1", title: "Review Q4 financials", due: "2024-11-20", dueLabel: "Due Nov 20", done: false, priority: "High" as const },
  { id: "2", title: "Send invoice #1230 reminder", due: "2024-11-18", dueLabel: "Due Nov 18", done: true, priority: "Medium" as const },
  { id: "3", title: "Update budget forecast", due: "2024-11-25", dueLabel: "Due Nov 25", done: false, priority: "Medium" as const },
];

export default function NotesAndTasksTab() {
  const { selectedClient: client } = useClientContext();
  const queryClient = useQueryClient();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  useEffect(() => {
    setNotes(client?.notes ?? "");
    if (!client) setEditingNotes(false);
  }, [client?.id, client?.notes]);

  const handleSaveNotes = async () => {
    if (!client?.id) return;
    setNotesError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: client.id, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save notes");
      setEditingNotes(false);
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    } catch (e) {
      setNotesError(e instanceof Error ? e.message : "Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  if (!client) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center text-slate-400">
        Select a client from the sidebar to view notes and tasks.
      </div>
    );
  }

  const displayNotes = editingNotes ? notes : (client.notes ?? notes);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-teal-400" />
            Client notes
          </h3>
          {!editingNotes ? (
            <button
              type="button"
              onClick={() => {
                setNotes(client.notes ?? "");
                setEditingNotes(true);
              }}
              className="text-sm text-teal-400 hover:text-teal-300"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingNotes(false)}
                className="text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={saving}
                className="text-sm px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-500 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </div>
        {notesError && (
          <p className="text-sm text-red-400 mb-3">{notesError}</p>
        )}
        {editingNotes ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-64 px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none"
            placeholder="Add notes about this client..."
          />
        ) : (
          <p className="text-slate-300 whitespace-pre-wrap min-h-[8rem]">
            {displayNotes || "No notes yet. Click Edit to add notes."}
          </p>
        )}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-violet-400" />
            Tasks & reminders
          </h3>
          <button
            type="button"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          {mockTasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                task.done ? "bg-slate-700/20 border-slate-600/50" : "bg-amber-500/5 border-amber-500/20"
              }`}
            >
              <input
                type="checkbox"
                checked={task.done}
                readOnly
                className="w-4 h-4 rounded border-slate-500 text-teal-600 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.done ? "text-slate-400 line-through" : "text-white"}`}>
                  {task.title}
                </p>
                <p className="text-xs text-slate-500">{task.dueLabel}</p>
              </div>
              {!task.done && (
                <span
                  className={`shrink-0 px-2 py-0.5 text-xs rounded ${
                    task.priority === "High"
                      ? "bg-amber-500/20 text-amber-400"
                      : task.priority === "Medium"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-slate-600 text-slate-400"
                  }`}
                >
                  {task.priority}
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4">Task management coming soon.</p>
      </div>
    </div>
  );
}
