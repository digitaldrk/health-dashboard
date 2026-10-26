import { Link } from "react-router-dom"

import { usePatients, useStats } from "../api/patients"
import { PATIENT_STATUSES, STATUS_LABELS } from "../api/types"
import { formatDate } from "../lib/format"
import { usePageTitle } from "../lib/usePageTitle"
import { StatusBadge } from "../components/StatusBadge"

const barColor: Record<(typeof PATIENT_STATUSES)[number], string> = {
  active: "#14635b",
  inactive: "#8a8175",
  critical: "#9a3412",
  discharged: "#1d4e89",
}

export function DashboardPage() {
  usePageTitle("Desk")
  const stats = useStats()
  const recent = usePatients({
    page: 1,
    pageSize: 5,
    search: "",
    status: "",
    sort: "last_visit",
    order: "desc",
  })
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-mist">{today}</p>
          <h1 className="font-serif text-4xl">Desk</h1>
        </div>
        <Link to="/patients/new" className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-white">
          New patient
        </Link>
      </div>

      {stats.isError && (
        <p role="alert" className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-critical">
          The panel counts could not be loaded.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Patients" value={stats.data?.total_patients} />
        <Stat label="Active" value={stats.data?.by_status.active} />
        <Stat label="Needs attention" value={stats.data?.by_status.critical} />
        <Stat label="Notes" value={stats.data?.note_count} />
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-line bg-foam p-5">
          <h2 className="font-serif text-2xl">Panel by status</h2>
          <div className="mt-4 space-y-4">
            {PATIENT_STATUSES.map((status) => {
              const count = stats.data?.by_status[status] ?? 0
              const total = stats.data?.total_patients ?? 0
              const width = total ? Math.round((count / total) * 100) : 0
              return (
                <div key={status}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{STATUS_LABELS[status]}</span>
                    <span className="text-mist">
                      {count}
                      <span className="sr-only"> of {total} patients</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-line">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${width}%`, background: barColor[status] }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-foam p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Recent visits</h2>
            <Link to="/patients" className="text-sm font-medium text-pine">
              All patients
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {recent.data?.items.map((patient) => (
              <li key={patient.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <Link to={`/patients/${patient.id}`} className="font-medium hover:underline">
                    {patient.full_name}
                  </Link>
                  <p className="text-xs text-mist">{formatDate(patient.last_visit)}</p>
                </div>
                <StatusBadge status={patient.status} />
              </li>
            ))}
            {recent.data?.items.length === 0 && (
              <li className="py-6 text-sm text-mist">No patients on the panel yet.</li>
            )}
          </ul>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-3xl border border-line bg-foam px-4 py-4">
      <p className="text-sm text-mist">{label}</p>
      <p className="mt-1 font-serif text-3xl">{value ?? "—"}</p>
    </div>
  )
}
