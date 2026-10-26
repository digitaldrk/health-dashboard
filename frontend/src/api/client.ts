import type { FieldError } from "./types"

export class ApiError extends Error {
  status: number
  errors: FieldError[]

  constructor(status: number, message: string, errors: FieldError[] = []) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errors = errors
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError(0, "Network request failed. Check that the API is running.")
  }

  if (response.status === 204) {
    return undefined as T
  }

  const body = (await response.json().catch(() => null)) as
    | { detail?: unknown; errors?: FieldError[] }
    | null

  if (!response.ok) {
    const detail = body && typeof body.detail === "string" ? body.detail : "Request failed"
    const errors = body && Array.isArray(body.errors) ? body.errors : []
    throw new ApiError(response.status, detail, errors)
  }

  return body as T
}
