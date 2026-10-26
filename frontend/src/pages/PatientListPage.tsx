import { useState } from "react"
import { Link } from "react-router-dom"

import { usePatients } from "../api/patients"
import { PATIENT_STATUSES, STATUS_LABELS, type PatientQuery, type PatientStatus } from "../api/types"
import { StatusBadge } from "../components/StatusBadge"
import { formatDate } from "../lib/format"
import { useDebouncedValue } from "../lib/useDebouncedValue"
import { usePageTitle } from "../lib/usePageTitle"

export function PatientListPage() {
  usePageTitle("Patients")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"" | PatientStatus>("")
  const [sort, setSort] = useState<PatientQuery["sort"]>("name")
  const [order, setOrder] = useState<PatientQuery["order"]>("asc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const debouncedSearch = useDebouncedValue(search, 250)

  const query = usePatients({
    page,
    pageSize,
    search: debouncedSearch,
    status,
    sort,
    order,
  })

  if (query.data && query.data.pages > 0 && page > query.data.pages) {
    setPage(query.data.pages)
  }

  const total = query.data?.total ?? 0
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">Patients</h1>
          <p className="text-sm text-mist" aria-live="polite">
            {query.isFetching && !query.isLoading ? "Updating results. " : ""}
            Showing {from}–{to} of {total}
          </p>
        </div>
        <Link to="/patients/new" className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-white">
          New patient
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Search name or email"
          aria-label="Search patients"
          className="rounded-xl border border-line bg-foam px-3 py-2 text-sm"
        />
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as "" | PatientStatus)
            setPage(1)
          }}
          className="rounded-xl border border-line bg-foam px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {PATIENT_STATUSES.map((item) => (
            <option key={item} value={item}>
              {STATUS_LABELS[item]}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort patients"
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as PatientQuery["sort"])
            setPage(1)
          }}
          className="rounded-xl border border-line bg-foam px-3 py-2 text-sm"
        >
          <option value="name">Name</option>
          <option value="age">Age</option>
          <option value="last_visit">Last visit</option>
          <option value="status">Status</option>
        </select>
        <button
          type="button"
          className="rounded-xl border border-line bg-foam px-3 py-2 text-sm"
          onClick={() => {
            setOrder(order === "asc" ? "desc" : "asc")
            setPage(1)
          }}
        >
          {order === "asc" ? "Ascending" : "Descending"}
        </button>
      </div>

      {query.isError && (
        <div role="alert" className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-critical">
          The patient list could not be loaded.
          <button type="button" className="ml-2 font-medium underline" onClick={() => query.refetch()}>
            Try again
          </button>
        </div>
      )}

      {query.isLoading && (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-2xl bg-line/80" />
          ))}
        </div>
      )}

      {query.data && query.data.items.length === 0 && (
        <div className="rounded-3xl border border-dashed border-line bg-foam px-6 py-12 text-center">
          <p className="font-serif text-2xl">No matching patients</p>
          <p className="mt-2 text-sm text-mist">Try another name, or clear the status filter.</p>
        </div>
      )}

      {query.data && query.data.items.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-3xl border border-line bg-foam md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-mist">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">Patient</th>
                  <th className="px-4 py-3 font-medium" scope="col">Age</th>
                  <th className="px-4 py-3 font-medium" scope="col">Last visit</th>
                  <th className="px-4 py-3 font-medium" scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((patient) => (
                  <tr key={patient.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <Link to={`/patients/${patient.id}`} className="font-medium hover:underline">
                        {patient.full_name}
                      </Link>
                      <p className="text-xs text-mist">{patient.email}</p>
                    </td>
                    <td className="px-4 py-3">{patient.age}</td>
                    <td className="px-4 py-3">{formatDate(patient.last_visit)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={patient.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {query.data.items.map((patient) => (
              <Link
                key={patient.id}
                to={`/patients/${patient.id}`}
                className="rounded-2xl border border-line bg-foam p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{patient.full_name}</p>
                    <p className="text-xs text-mist">{patient.email}</p>
                  </div>
                  <StatusBadge status={patient.status} />
                </div>
                <p className="mt-3 text-sm text-mist">
                  Age {patient.age} · {formatDate(patient.last_visit)}
                </p>
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <label className="flex items-center gap-2 text-mist">
              Rows
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setPage(1)
                }}
                className="rounded-lg border border-line bg-foam px-2 py-1"
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-full border border-line px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {query.data.pages === 0 ? 0 : page} of {query.data.pages}
              </span>
              <button
                type="button"
                disabled={page >= query.data.pages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-full border border-line px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
