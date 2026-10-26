export const PATIENT_STATUSES = ["active", "inactive", "critical", "discharged"] as const
export type PatientStatus = (typeof PATIENT_STATUSES)[number]

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"] as const
export type BloodType = (typeof BLOOD_TYPES)[number]

export const STATUS_LABELS: Record<PatientStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  critical: "Critical",
  discharged: "Discharged",
}

export type Patient = {
  id: string
  first_name: string
  last_name: string
  full_name: string
  date_of_birth: string
  age: number
  email: string
  phone: string | null
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  postal_code: string
  blood_type: BloodType
  status: PatientStatus
  allergies: string[]
  conditions: string[]
  last_visit: string | null
  created_at: string
  updated_at: string
}

export type PatientWrite = {
  first_name: string
  last_name: string
  date_of_birth: string
  email: string
  phone: string | null
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  postal_code: string
  blood_type: BloodType
  status: PatientStatus
  allergies: string[]
  conditions: string[]
  last_visit: string | null
}

export type PatientPage = {
  items: Patient[]
  total: number
  page: number
  page_size: number
  pages: number
}

export type PatientQuery = {
  page: number
  pageSize: number
  search: string
  status: "" | PatientStatus
  sort: "name" | "age" | "last_visit" | "status"
  order: "asc" | "desc"
}

export type Note = {
  id: string
  patient_id: string
  content: string
  noted_at: string
  created_at: string
}

export type Summary = {
  patient_id: string
  summary: string
  highlights: {
    name: string
    age: number
    blood_type: string
    status: string
    conditions: string[]
    allergies: string[]
    note_count: number
  }
}

export type Stats = {
  total_patients: number
  by_status: Record<PatientStatus, number>
  note_count: number
}

export type FieldError = {
  field: string
  message: string
}
