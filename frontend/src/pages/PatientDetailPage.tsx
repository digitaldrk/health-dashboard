import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { ApiError } from "../api/client"
import { useDeletePatient, usePatient, useSummary } from "../api/patients"
import { NotesPanel } from "../components/NotesPanel"
import { StatusBadge } from "../components/StatusBadge"
import { Modal } from "../components/Modal"
import { formatDate, formatStatus } from "../lib/format"
import { usePageTitle } from "../lib/usePageTitle"
import { NotFoundPage } from "./NotFoundPage"

export function PatientDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const patientQuery = usePatient(id)
  const summaryQuery = useSummary(id)
  const deletePatient = useDeletePatient()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const patient = patientQuery.data

  usePageTitle(patient ? patient.full_name : "Patient")

  if (patientQuery.isLoading) {
    return <p className="text-sm text-mist">Loading chart...</p>
  }

  if (patientQuery.error instanceof ApiError && (patientQuery.error.status === 404 || patientQuery.error.status === 422)) {
    return <NotFoundPage />
  }

  if (!patient) {
    return (
      <div role="alert" className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-critical">
        This chart could not be loaded.
        <button type="button" className="ml-2 font-medium underline" onClick={() => patientQuery.refetch()}>
          Try again
        </button>
      </div>
    )
  }

  const address = [patient.address_line1, patient.address_line2, `${patient.city}, ${patient.state} ${patient.postal_code}`]
    .filter(Boolean)
    .join(", ")

  return (
    <div className="space-y-6">
      <Link to="/patients" className="text-sm font-medium text-pine">
        Back to patients
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">{patient.full_name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-mist">
            <span>Age {patient.age}</span>
            <span aria-hidden="true">·</span>
            <span>Blood type {patient.blood_type === "unknown" ? "unknown" : patient.blood_type}</span>
            <StatusBadge status={patient.status} />
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/patients/${patient.id}/edit`} className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-white">
            Edit
          </Link>
          <button
            type="button"
            className="rounded-full border border-line px-4 py-2 text-sm font-medium"
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-line bg-foam p-5">
          <h2 className="font-serif text-2xl">Chart</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-mist">Date of birth</dt>
              <dd>{formatDate(patient.date_of_birth)}</dd>
            </div>
            <div>
              <dt className="text-mist">Last visit</dt>
              <dd>{formatDate(patient.last_visit)}</dd>
            </div>
            <div>
              <dt className="text-mist">Email</dt>
              <dd>{patient.email}</dd>
            </div>
            <div>
              <dt className="text-mist">Phone</dt>
              <dd>{patient.phone || "Not recorded"}</dd>
            </div>
            <div>
              <dt className="text-mist">Address</dt>
              <dd>{address}</dd>
            </div>
            <div>
              <dt className="text-mist">Conditions</dt>
              <dd>{patient.conditions.length ? patient.conditions.join(", ") : "None recorded"}</dd>
            </div>
            <div>
              <dt className="text-mist">Allergies</dt>
              <dd>{patient.allergies.length ? patient.allergies.join(", ") : "None recorded"}</dd>
            </div>
            <div>
              <dt className="text-mist">Status</dt>
              <dd>{formatStatus(patient.status)}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-line bg-foam p-5">
          <h2 className="font-serif text-2xl">Summary</h2>
          {summaryQuery.isLoading && <p className="mt-4 text-sm text-mist">Writing the summary...</p>}
          {summaryQuery.isError && (
            <p className="mt-4 text-sm text-critical">
              The summary could not be generated.
              <button type="button" className="ml-2 font-medium underline" onClick={() => summaryQuery.refetch()}>
                Try again
              </button>
            </p>
          )}
          {summaryQuery.data && (
            <>
              <p className="mt-4 text-sm leading-7">{summaryQuery.data.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {summaryQuery.data.highlights.conditions.map((condition) => (
                  <span key={condition} className="rounded-full bg-moss px-2.5 py-1 text-xs text-pine">
                    {condition}
                  </span>
                ))}
                {summaryQuery.data.highlights.allergies.map((allergy) => (
                  <span key={allergy} className="rounded-full bg-orange-100 px-2.5 py-1 text-xs text-critical">
                    Allergy: {allergy}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <NotesPanel patientId={patient.id} />

      {confirming && (
        <Modal
          title={`Delete ${patient.full_name}?`}
          body="This removes the chart and every note attached to it."
          confirmLabel="Delete patient"
          pending={deletePatient.isPending}
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            try {
              await deletePatient.mutateAsync(patient.id)
              navigate("/patients")
            } catch (caught) {
              setConfirming(false)
              setError(caught instanceof ApiError ? caught.message : "The patient could not be deleted.")
            }
          }}
        />
      )}
    </div>
  )
}
