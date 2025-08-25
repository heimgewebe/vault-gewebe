from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Optional, Any, List
from datetime import datetime

app = FastAPI(title="Weltgewebe API", version="0.1.0")

class Event(BaseModel):
    id: str
    type: str
    ts: datetime
    actor: str
    payload: dict
    prev: Optional[str] = None
    sig: str

# In-memory event store (nur für Demo)
EVENTS: List[Event] = []

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/events")
def list_events():
    return EVENTS

@app.post("/events")
def append_event(evt: Event):
    # TODO: ed25519-Signatur verifizieren, Hash-Kette, Append-only
    EVENTS.append(evt)
    return {"ok": True, "count": len(EVENTS)}

