import { useParams } from "react-router-dom"

import { ApiError } from "../api/client"
import { usePatient } from "../api/patients"
import { PatientForm } from "../components/PatientForm"
import { usePageTitle } from "../lib/usePageTitle"
import { NotFoundPage } from "./NotFoundPage"

export function PatientFormPage() {
  const { id } = useParams()
  const patientQuery = usePatient(id)
  usePageTitle(id ? "Edit patient" : "New patient")

  if (id && patientQuery.isLoading) {
    return <p className="text-sm text-mist">Loading chart...</p>
  }

  if (id && patientQuery.error instanceof ApiError && (patientQuery.error.status === 404 || patientQuery.error.status === 422)) {
    return <NotFoundPage />
  }

  if (id && patientQuery.isError) {
    return (
      <div role="alert" className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-critical">
        This chart could not be loaded.
        <button type="button" className="ml-2 font-medium underline" onClick={() => patientQuery.refetch()}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-4xl">{id ? "Edit patient" : "New patient"}</h1>
        <p className="mt-1 text-sm text-mist">
          Personal details, contact information, and the medical items the desk needs on the chart.
        </p>
      </div>
      <PatientForm key={patientQuery.data?.id ?? "new"} patient={patientQuery.data} />
    </div>
  )
}
