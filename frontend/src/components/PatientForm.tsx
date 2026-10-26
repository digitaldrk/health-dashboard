import { zodResolver } from "@hookform/resolvers/zod"
import { useRef, useState, type FormEvent } from "react"
import { Controller, useForm, type UseFormSetError } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"

import { ApiError } from "../api/client"
import { useCreatePatient, useUpdatePatient } from "../api/patients"
import type { Patient, PatientWrite } from "../api/types"
import { BLOOD_TYPES, PATIENT_STATUSES, STATUS_LABELS } from "../api/types"
import { emptyPatientForm, patientSchema, type PatientFormValues } from "../lib/patientSchema"
import { ChipField, SelectField, TextField } from "./Fields"

const fieldNames = new Set([
  "first_name",
  "last_name",
  "date_of_birth",
  "email",
  "phone",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "postal_code",
  "blood_type",
  "status",
  "allergies",
  "conditions",
  "last_visit",
])

function toForm(patient: Patient): PatientFormValues {
  return {
    first_name: patient.first_name,
    last_name: patient.last_name,
    date_of_birth: patient.date_of_birth,
    email: patient.email,
    phone: patient.phone ?? "",
    address_line1: patient.address_line1,
    address_line2: patient.address_line2 ?? "",
    city: patient.city,
    state: patient.state,
    postal_code: patient.postal_code,
    blood_type: patient.blood_type,
    status: patient.status,
    allergies: patient.allergies,
    conditions: patient.conditions,
    last_visit: patient.last_visit ?? "",
  }
}

function toPayload(values: PatientFormValues): PatientWrite {
  return {
    ...values,
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim() || null,
    address_line2: values.address_line2.trim() || null,
    last_visit: values.last_visit || null,
  }
}

function applyServerErrors(error: ApiError, setError: UseFormSetError<PatientFormValues>) {
  if (error.status === 409) {
    setError("email", { message: error.message })
    return
  }
  for (const item of error.errors) {
    if (fieldNames.has(item.field)) {
      setError(item.field as keyof PatientFormValues, { message: item.message })
    }
  }
}

export function PatientForm({ patient }: { patient?: Patient }) {
  const navigate = useNavigate()
  const createPatient = useCreatePatient()
  const updatePatient = useUpdatePatient(patient?.id ?? "")
  const [formError, setFormError] = useState<string | null>(null)
  const [listReset, setListReset] = useState(0)
  const pendingLists = useRef({ allergies: "", conditions: "" })
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: patient ? toForm(patient) : emptyPatientForm,
  })

  async function onSubmit(values: PatientFormValues) {
    setFormError(null)
    try {
      const saved = patient
        ? await updatePatient.mutateAsync(toPayload(values))
        : await createPatient.mutateAsync(toPayload(values))
      navigate(`/patients/${saved.id}`)
    } catch (error) {
      if (error instanceof ApiError) {
        applyServerErrors(error, setError)
        setFormError(error.message)
        return
      }
      setFormError("Something went wrong while saving this chart.")
    }
  }

  function flushPendingLists() {
    for (const name of ["allergies", "conditions"] as const) {
      const pending = pendingLists.current[name].trim()
      if (!pending) continue
      const current = getValues(name)
      if (current.some((item) => item.toLowerCase() === pending.toLowerCase())) continue
      setValue(name, [...current, pending])
    }
    pendingLists.current = { allergies: "", conditions: "" }
    setListReset((value) => value + 1)
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    flushPendingLists()
    void handleSubmit(onSubmit)(event)
  }

  return (
    <form onSubmit={submitForm} className="space-y-6" noValidate>
      {formError && (
        <div role="alert" className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-critical">
          {formError}
        </div>
      )}

      <section className="rounded-3xl border border-line bg-foam p-5">
        <h2 className="font-serif text-xl">Personal</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextField id="first_name" label="First name" autoComplete="given-name" error={errors.first_name?.message} {...register("first_name")} />
          <TextField id="last_name" label="Last name" autoComplete="family-name" error={errors.last_name?.message} {...register("last_name")} />
          <TextField id="date_of_birth" label="Date of birth" type="date" error={errors.date_of_birth?.message} {...register("date_of_birth")} />
          <TextField id="last_visit" label="Last visit" type="date" error={errors.last_visit?.message} {...register("last_visit")} />
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-foam p-5">
        <h2 className="font-serif text-xl">Contact</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextField id="email" label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <TextField id="phone" label="Phone" type="tel" autoComplete="tel" error={errors.phone?.message} {...register("phone")} />
          <TextField id="address_line1" label="Street" autoComplete="address-line1" error={errors.address_line1?.message} {...register("address_line1")} />
          <TextField id="address_line2" label="Apartment or suite" autoComplete="address-line2" error={errors.address_line2?.message} {...register("address_line2")} />
          <TextField id="city" label="City" autoComplete="address-level2" error={errors.city?.message} {...register("city")} />
          <TextField id="state" label="State or region" autoComplete="address-level1" error={errors.state?.message} {...register("state")} />
          <TextField id="postal_code" label="Postal code" autoComplete="postal-code" error={errors.postal_code?.message} {...register("postal_code")} />
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-foam p-5">
        <h2 className="font-serif text-xl">Medical</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <SelectField id="blood_type" label="Blood type" error={errors.blood_type?.message} {...register("blood_type")}>
            {BLOOD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === "unknown" ? "Unknown" : type}
              </option>
            ))}
          </SelectField>
          <SelectField id="status" label="Status" error={errors.status?.message} {...register("status")}>
            {PATIENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </SelectField>
          <Controller
            name="conditions"
            control={control}
            render={({ field, fieldState }) => (
              <ChipField
                key={`conditions-${listReset}`}
                id="conditions"
                label="Conditions"
                values={field.value}
                onChange={field.onChange}
                onPendingChange={(value) => {
                  pendingLists.current.conditions = value
                }}
                error={fieldState.error?.message}
                placeholder="Add a condition"
              />
            )}
          />
          <Controller
            name="allergies"
            control={control}
            render={({ field, fieldState }) => (
              <ChipField
                key={`allergies-${listReset}`}
                id="allergies"
                label="Allergies"
                values={field.value}
                onChange={field.onChange}
                onPendingChange={(value) => {
                  pendingLists.current.allergies = value
                }}
                error={fieldState.error?.message}
                placeholder="Add an allergy"
              />
            )}
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-pine px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : patient ? "Save changes" : "Create patient"}
        </button>
        <Link
          to={patient ? `/patients/${patient.id}` : "/patients"}
          className="rounded-full border border-line bg-foam px-5 py-2.5 text-sm font-medium"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
