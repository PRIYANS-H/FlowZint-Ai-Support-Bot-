import os
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker
from pgvector.sqlalchemy import Vector
from datetime import datetime, timezone

_raw = os.environ.get("SUPABASE_DB_URL", "")
# Supabase provides postgresql:// URLs; psycopg3 needs postgresql+psycopg://
if _raw.startswith("postgresql://") and "+psycopg" not in _raw:
    DATABASE_URL = _raw.replace("postgresql://", "postgresql+psycopg://", 1)
else:
    DATABASE_URL = _raw

engine       = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10) if DATABASE_URL else None
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None
Base         = declarative_base()


class Message(Base):
    __tablename__ = "messages"
    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), index=True)
    role       = Column(String(8))        # "user" | "bot"
    text       = Column(Text)
    sentiment  = Column(String(16))       # "positive" | "neutral" | "negative"
    cat        = Column(String(32))
    conf       = Column(Float)
    escalated  = Column(Boolean, default=False)
    ts         = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Ticket(Base):
    __tablename__ = "tickets"
    id         = Column(Integer, primary_key=True, index=True)
    ticket_ref = Column(String(16))       # e.g. "#1051"
    session_id = Column(String(64))
    customer   = Column(String(128))
    issue      = Column(Text)
    priority   = Column(String(8))        # "high" | "med" | "low"
    status     = Column(String(16))       # "open" | "escalated" | "resolved"
    trigger    = Column(String(64))
    ts         = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SentimentLog(Base):
    __tablename__ = "sentiment_logs"
    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), index=True)
    sentiment  = Column(String(16))
    score      = Column(Float)
    ts         = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ChurnScore(Base):
    __tablename__ = "churn_scores"
    id           = Column(Integer, primary_key=True, index=True)
    session_id   = Column(String(64), unique=True, index=True)
    customer     = Column(String(128))
    score        = Column(Float)
    risk_level   = Column(String(8))
    driver       = Column(String(128))
    action       = Column(String(256))
    ts           = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class FAQ(Base):
    __tablename__ = "faqs"
    id        = Column(Integer, primary_key=True, index=True)
    question  = Column(Text)
    answer    = Column(Text)
    category  = Column(String(64))
    embedding = Column(Vector(384))       # all-MiniLM-L6-v2 dimensions


class SelfCorrection(Base):
    __tablename__ = "self_corrections"
    id         = Column(Integer, primary_key=True, index=True)
    question   = Column(Text)
    answer     = Column(Text)
    embedding  = Column(Vector(384))
    category   = Column(String(32), default="self_corrected")
    reviewed   = Column(Boolean, default=False)
    ts         = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


def get_db():
    if SessionLocal is None:
        yield None   # generator must always yield; caller checks for None
        return
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    if engine is not None:
        Base.metadata.create_all(bind=engine)