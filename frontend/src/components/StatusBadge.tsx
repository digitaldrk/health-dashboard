import type { PatientStatus } from "../api/types"
import { formatStatus } from "../lib/format"

const tones: Record<PatientStatus, string> = {
  active: "bg-moss text-pine",
  inactive: "bg-line text-ink",
  critical: "bg-orange-100 text-critical",
  discharged: "bg-sky-100 text-sky-900",
}

export function StatusBadge({ status }: { status: PatientStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[status]}`}>
      {formatStatus(status)}
    </span>
  )
}
