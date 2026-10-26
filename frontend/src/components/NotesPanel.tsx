import { useState, type FormEvent } from "react"

import { ApiError } from "../api/client"
import { useCreateNote, useDeleteNote, useNotes } from "../api/patients"
import { formatDateTime, nowDateTimeInput } from "../lib/format"
import { Modal } from "./Modal"

export function NotesPanel({ patientId }: { patientId: string }) {
  const notes = useNotes(patientId)
  const createNote = useCreateNote(patientId)
  const deleteNote = useDeleteNote(patientId)
  const [content, setContent] = useState("")
  const [notedAt, setNotedAt] = useState(nowDateTimeInput)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) {
      setError("Write a note before saving.")
      return
    }
    const timestamp = new Date(notedAt)
    if (Number.isNaN(timestamp.getTime())) {
      setError("Enter a valid date and time.")
      return
    }
    setError(null)
    try {
      await createNote.mutateAsync({ content: trimmed, noted_at: timestamp.toISOString() })
      setContent("")
      setNotedAt(nowDateTimeInput())
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The note could not be saved.")
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-foam p-5">
      <h2 className="font-serif text-2xl">Notes</h2>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        {error && (
          <p role="alert" className="text-sm text-critical">
            {error}
          </p>
        )}
        <label className="text-sm font-medium" htmlFor="note-content">
          New note
        </label>
        <textarea
          id="note-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={4}
          maxLength={5000}
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none ring-pine/30 focus:ring-2"
          placeholder="What should the next clinician know?"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-64">
            <label htmlFor="noted-at" className="mb-1 block text-sm font-medium">
              Noted at
            </label>
            <input
              id="noted-at"
              type="datetime-local"
              value={notedAt}
              onChange={(event) => setNotedAt(event.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={createNote.isPending}
            className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {createNote.isPending ? "Saving..." : "Add note"}
          </button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {notes.isLoading && <p className="text-sm text-mist">Loading notes...</p>}
        {notes.isError && <p className="text-sm text-critical">Notes could not be loaded.</p>}
        {notes.data?.length === 0 && <p className="text-sm text-mist">No notes on this chart yet.</p>}
        {notes.data?.map((note) => (
          <article key={note.id} className="rounded-2xl border border-line bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <time className="text-xs font-medium uppercase tracking-wide text-mist" dateTime={note.noted_at}>
                {formatDateTime(note.noted_at)}
              </time>
              <button
                type="button"
                className="text-xs font-medium text-critical"
                onClick={() => setPendingDelete(note.id)}
              >
                Delete
              </button>
            </div>
            <p className="mt-2 text-sm leading-6">{note.content}</p>
          </article>
        ))}
      </div>

      {pendingDelete && (
        <Modal
          title="Delete this note?"
          body="The note is removed from the chart and from the generated summary."
          confirmLabel="Delete note"
          pending={deleteNote.isPending}
          onClose={() => setPendingDelete(null)}
          onConfirm={async () => {
            try {
              await deleteNote.mutateAsync(pendingDelete)
              setPendingDelete(null)
            } catch (caught) {
              setPendingDelete(null)
              setError(caught instanceof ApiError ? caught.message : "The note could not be deleted.")
            }
          }}
        />
      )}
    </section>
  )
}
