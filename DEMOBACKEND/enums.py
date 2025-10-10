# enums.py

from enum import Enum
from typing import Optional, Dict, Any

from pydantic import BaseModel


class AllianceType(Enum):
    """Enum representing the alliance types in a match (Red or Blue)."""
    RED = "red"
    BLUE = "blue"


class MatchType(Enum):
    """Enum representing the match types (Qualifying, Semifinal, Final)."""
    QUALIFIER = "qm"
    SEMIFINAL = "sf"
    FINAL = "f"

class MatchTypeBM(BaseModel):
    match_type: MatchType


class StatusType(Enum):
    """Enum representing the different statuses of a match during scouting."""
    UNCLAIMED = "unclaimed"
    PRE = "pre"
    AUTO = "auto"
    TELEOP = "teleop"
    POST = "post"
    OFFLINE = "offline"
    SUBMITTED = "submitted"


class FullData(BaseModel):
    alliance: AllianceType
    scouter: str
    match_type: MatchType
    auto: Optional[Dict[str, Any]] = None
    teleop: Optional[Dict[str, Any]] = None
    postmatch: Optional[Dict[str, Any]] = None


class SessionPermissions(BaseModel):
    dev: bool
    admin: bool
    match_scouting: bool
    pit_scouting: bool


class SessionInfo(BaseModel):
    name: str
    permissions: SessionPermissions

class PasscodeBody(BaseModel):
    passcode: str