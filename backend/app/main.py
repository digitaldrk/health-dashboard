import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

from alembic.config import Config
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from alembic import command
from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.middleware import RequestLoggingMiddleware
from app.models import Note, Patient  # noqa: F401
from app.routers import patients, stats
from app.seed import seed_if_empty

logger = logging.getLogger("app")


def run_migrations() -> None:
    settings = get_settings()
    root = Path(__file__).resolve().parents[1]
    config = Config(str(root / "alembic.ini"))
    config.set_main_option("script_location", str(root / "alembic"))
    config.set_main_option("sqlalchemy.url", settings.database_url.replace("%", "%%"))

    last_error: Exception | None = None
    for attempt in range(15):
        try:
            command.upgrade(config, "head")
            return
        except OperationalError as exc:
            last_error = exc
            logger.warning("Database not ready (attempt %s/15)", attempt + 1)
            time.sleep(1)
    assert last_error is not None
    raise last_error


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    if settings.run_migrations:
        run_migrations()
    else:
        Base.metadata.create_all(bind=engine)
    if settings.seed_on_startup:
        db = SessionLocal()
        try:
            inserted = seed_if_empty(db)
            if inserted:
                logger.info("Seeded %s patients", inserted)
            else:
                logger.info("Patient seed skipped; the table already has rows")
        finally:
            db.close()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(
        level=settings.log_level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    app = FastAPI(
        title="JB Medical API",
        version="1.0.0",
        summary="Patient panel, clinical notes, and chart summaries for the staff dashboard.",
        lifespan=lifespan,
        redirect_slashes=False,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestLoggingMiddleware)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_request: Request, exc: RequestValidationError):
        errors = []
        for error in exc.errors():
            parts = [str(part) for part in error["loc"] if part not in {"body", "query", "path"}]
            field = parts[0] if parts else ""
            message = error["msg"]
            prefix = "Value error, "
            if message.startswith(prefix):
                message = message[len(prefix) :]
            errors.append({"field": field, "message": message})
        return JSONResponse(
            status_code=422,
            content={"detail": "Validation failed", "errors": jsonable_encoder(errors)},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, _exc: Exception):
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    @app.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(stats.router)
    app.include_router(patients.router)
    return app


app = create_app()
