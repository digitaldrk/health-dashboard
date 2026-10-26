import { useEffect } from "react"

type ModalProps = {
  title: string
  body: string
  confirmLabel: string
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function Modal({ title, body, confirmLabel, pending = false, onConfirm, onClose }: ModalProps) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, pending])

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/40 px-4" onClick={pending ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="w-full max-w-md rounded-3xl bg-foam p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="dialog-title" className="font-serif text-2xl">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-mist">{body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            autoFocus
            className="rounded-full border border-line px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-full bg-critical px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
