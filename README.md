# JB Medical

Staff dashboard for a medical practice.

## Decisions

- **TanStack Query** manages server state. Local UI state stays in components, so there's no need for a separate store.
- **React Hook Form and Zod** validate the chart form before it is sent. The API validates again and returns field errors.
- **Tailwind** for styles, I've worked on a couple apps with Tailwind.
- **SQLAlchemy and Alembic** since I'm used to ORM and migrations. Startup runs migrations, then seeds the database only when `patients` is empty.
- **Summaries are templated** no external model or API key is required.
- **Auth is out of scope** so routes assume a staff member already inside the practice. Resource URLs can later sit behind an auth dependency without changing shape.

## Run with Docker

```bash
docker compose up --build
```

- App: http://localhost:5173
- API docs(default for FastAPI): http://localhost:8000/docs
- Health: `curl http://localhost:8000/health`

## Tests

```bash
cd backend
source .venv/bin/activate
ruff check .
pytest
```

Validation errors return `422`:

```json
{ "detail": "Validation failed", "errors": [{ "field": "email", "message": "..." }] }
```

A duplicate email returns `409`. Unknown patients and notes return `404`. Unexpected failures return `500` with no stack trace. Request logs include the method, path, and status, and omit query strings.

## Screens

- `/` desk, with status counts and recent visits
- `/patients` searchable, filterable, sortable list
- `/patients/new` and `/patients/:id/edit` chart form
- `/patients/:id` chart, summary, and notes
- any other path shows a 404 page
