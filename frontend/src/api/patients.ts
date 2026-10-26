import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "./client"
import type { Note, Patient, PatientPage, PatientQuery, PatientWrite, Stats, Summary } from "./types"

function patientSearch(params: PatientQuery) {
  const query = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.pageSize),
    sort: params.sort,
    order: params.order,
  })
  if (params.search.trim()) query.set("search", params.search.trim())
  if (params.status) query.set("status", params.status)
  return query.toString()
}

function invalidatePanel(queryClient: ReturnType<typeof useQueryClient>, patientId?: string) {
  queryClient.invalidateQueries({ queryKey: ["patients"] })
  queryClient.invalidateQueries({ queryKey: ["stats"] })
  if (patientId) {
    queryClient.invalidateQueries({ queryKey: ["patient", patientId] })
    queryClient.invalidateQueries({ queryKey: ["notes", patientId] })
    queryClient.invalidateQueries({ queryKey: ["summary", patientId] })
  }
}

export function usePatients(params: PatientQuery) {
  return useQuery({
    queryKey: ["patients", params],
    queryFn: () => api<PatientPage>(`/patients?${patientSearch(params)}`),
    placeholderData: keepPreviousData,
  })
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: ["patient", id],
    queryFn: () => api<Patient>(`/patients/${id}`),
    enabled: Boolean(id),
  })
}

export function useNotes(id: string | undefined) {
  return useQuery({
    queryKey: ["notes", id],
    queryFn: () => api<Note[]>(`/patients/${id}/notes`),
    enabled: Boolean(id),
  })
}

export function useSummary(id: string | undefined) {
  return useQuery({
    queryKey: ["summary", id],
    queryFn: () => api<Summary>(`/patients/${id}/summary`),
    enabled: Boolean(id),
  })
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => api<Stats>("/stats"),
  })
}

export function useCreatePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PatientWrite) =>
      api<Patient>("/patients", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (patient) => invalidatePanel(queryClient, patient.id),
  })
}

export function useUpdatePatient(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PatientWrite) =>
      api<Patient>(`/patients/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: (patient) => invalidatePanel(queryClient, patient.id),
  })
}

export function useDeletePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/patients/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidatePanel(queryClient),
  })
}

export function useCreateNote(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { content: string; noted_at: string }) =>
      api<Note>(`/patients/${patientId}/notes`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => invalidatePanel(queryClient, patientId),
  })
}

export function useDeleteNote(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) =>
      api<void>(`/patients/${patientId}/notes/${noteId}`, { method: "DELETE" }),
    onSuccess: () => invalidatePanel(queryClient, patientId),
  })
}
