from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import StatsRead
from app.services.patients import patient_stats

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=StatsRead)
def read_stats(db: Session = Depends(get_db)) -> StatsRead:
    return patient_stats(db)
