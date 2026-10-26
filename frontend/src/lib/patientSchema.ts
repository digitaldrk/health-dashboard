import { z } from "zod"

import { BLOOD_TYPES, PATIENT_STATUSES } from "../api/types"
import { todayInputValue } from "./format"

const phonePattern = /^[0-9+().\-\s]{7,20}$/

export const patientSchema = z
  .object({
    first_name: z.string().trim().min(1, "First name is required").max(80),
    last_name: z.string().trim().min(1, "Last name is required").max(80),
    date_of_birth: z
      .string()
      .min(1, "Date of birth is required")
      .refine((value) => value >= "1900-01-01", "Date of birth must be on or after 1900-01-01")
      .refine((value) => value <= todayInputValue(), "Date of birth cannot be in the future"),
    email: z.string().trim().email("Enter a valid email"),
    phone: z
      .string()
      .trim()
      .refine((value) => value === "" || phonePattern.test(value), "Enter a valid phone number"),
    address_line1: z.string().trim().min(1, "Street address is required").max(120),
    address_line2: z.string().trim().max(120),
    city: z.string().trim().min(1, "City is required").max(80),
    state: z.string().trim().min(1, "State or region is required").max(50),
    postal_code: z.string().trim().min(1, "Postal code is required").max(12),
    blood_type: z.enum(BLOOD_TYPES),
    status: z.enum(PATIENT_STATUSES),
    allergies: z.array(z.string().trim().min(1).max(80)).max(20, "No more than 20 entries"),
    conditions: z.array(z.string().trim().min(1).max(80)).max(20, "No more than 20 entries"),
    last_visit: z.string(),
  })
  .superRefine((value, context) => {
    if (!value.last_visit) return
    if (value.last_visit > todayInputValue()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["last_visit"],
        message: "Last visit cannot be in the future",
      })
    }
    if (value.date_of_birth && value.last_visit < value.date_of_birth) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["last_visit"],
        message: "Last visit cannot be before date of birth",
      })
    }
  })

export type PatientFormValues = z.infer<typeof patientSchema>

export const emptyPatientForm: PatientFormValues = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  email: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  blood_type: "unknown",
  status: "active",
  allergies: [],
  conditions: [],
  last_visit: "",
}
