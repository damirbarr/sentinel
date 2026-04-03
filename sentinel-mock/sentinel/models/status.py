from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal

DecisionState = Literal[
    'NORMAL',
    'DEGRADED_SPEED',
    'SAFE_STOP_RECOMMENDED',
    'REROUTE_RECOMMENDED',
]

ReasonCode = Literal[
    'WEATHER_HEAVY_RAIN',
    'WEATHER_LOW_VISIBILITY',
    'WEATHER_STRONG_WIND',
    'WEATHER_FOG',
    'GEOFENCE_AHEAD',
    'IN_GEOFENCE_FORBIDDEN_ZONE',
    'IN_GEOFENCE_SLOW_ZONE',
    'IN_GEOFENCE_CAUTION_ZONE',
    'NETWORK_POOR',
    'NETWORK_LOST',
    'MULTI_FACTOR_RISK',
]


@dataclass
class VehiclePosition:
    lat: float
    lng: float
    heading: float  # 0-360 degrees


@dataclass
class VehicleStatusPayload:
    position: VehiclePosition
    speedKmh: float
    decision: DecisionState
    reasonCodes: list[str] = field(default_factory=list)
    activeConstraintIds: list[str] = field(default_factory=list)
    affectingConstraintIds: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            'position': {
                'lat': self.position.lat,
                'lng': self.position.lng,
                'heading': self.position.heading,
            },
            'speedKmh': self.speedKmh,
            'decision': self.decision,
            'reasonCodes': self.reasonCodes,
            'activeConstraintIds': self.activeConstraintIds,
            'affectingConstraintIds': self.affectingConstraintIds,
        }


@dataclass
class SentinelMessage:
    type: Literal['REGISTER', 'STATUS_UPDATE', 'EVENT_REPORT']
    vehicleId: str
    payload: dict

    def to_dict(self) -> dict:
        return {
            'type': self.type,
            'vehicleId': self.vehicleId,
            'payload': self.payload,
        }
