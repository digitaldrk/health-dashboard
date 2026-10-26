import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react"

const controlClass =
  "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none ring-pine/30 placeholder:text-mist/70 focus:ring-2"

export function TextField({
  id,
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={controlClass}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-critical">
          {error}
        </p>
      )}
    </div>
  )
}

export function SelectField({
  id,
  label,
  error,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={controlClass}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-critical">
          {error}
        </p>
      )}
    </div>
  )
}

export function ChipField({
  id,
  label,
  values,
  onChange,
  onPendingChange,
  error,
  placeholder,
}: {
  id: string
  label: string
  values: string[]
  onChange: (values: string[]) => void
  onPendingChange?: (value: string) => void
  error?: string
  placeholder: string
}) {
  const [draft, setDraft] = useState("")

  function updateDraft(value: string) {
    setDraft(value)
    onPendingChange?.(value)
  }

  function commit(raw: string) {
    const next = raw.trim()
    updateDraft("")
    if (!next || values.some((item) => item.toLowerCase() === next.toLowerCase())) return
    onChange([...values, next])
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <div className="rounded-xl border border-line bg-white px-3 py-2">
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <button
              key={value}
              type="button"
              className="rounded-full bg-moss px-2.5 py-1 text-xs font-medium text-pine"
              onClick={() => onChange(values.filter((item) => item !== value))}
            >
              {value} <span aria-hidden="true">×</span>
              <span className="sr-only">Remove {value}</span>
            </button>
          ))}
        </div>
        <input
          id={id}
          value={draft}
          onChange={(event) => updateDraft(event.target.value)}
          className="mt-2 w-full bg-transparent text-sm outline-none placeholder:text-mist/70"
          placeholder={placeholder}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== ",") return
            event.preventDefault()
            commit(draft)
          }}
        />
      </div>
      <p id={`${id}-hint`} className="mt-1 text-xs text-mist">
        Press Enter to add. Text still in the box is saved with the chart.
      </p>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-critical">
          {error}
        </p>
      )}
    </div>
  )
}
