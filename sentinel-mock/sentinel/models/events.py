from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal, Optional


@dataclass
class LatLng:
    lat: float
    lng: float


@dataclass
class WeatherPayload:
    condition: Literal['HEAVY_RAIN', 'FOG', 'STRONG_WIND', 'LOW_VISIBILITY', 'SNOW', 'ICE']
    severity: Literal['LOW', 'MODERATE', 'HIGH', 'EXTREME']
    durationMinutes: Optional[int] = None
    description: Optional[str] = None


@dataclass
class GeofencePayload:
    type: Literal['FORBIDDEN', 'CAUTION', 'SLOW']
    polygon: list[LatLng] = field(default_factory=list)
    label: Optional[str] = None
    validUntil: Optional[str] = None


@dataclass
class NetworkPayload:
    severity: Literal['DEGRADED', 'UNSTABLE', 'LOST']
    vehicleId: Optional[str] = None
    description: Optional[str] = None


@dataclass
class ActiveConstraint:
    id: str
    type: Literal['WEATHER', 'GEOFENCE', 'NETWORK']
    payload: WeatherPayload | GeofencePayload | NetworkPayload
    createdAt: str
    clearedAt: Optional[str] = None
    active: bool = True


def parse_constraint(data: dict) -> ActiveConstraint:
    """Parse a raw constraint dict from the backend into a typed ActiveConstraint."""
    t = data['type']
    p = data['payload']
    if t == 'WEATHER':
        payload: WeatherPayload | GeofencePayload | NetworkPayload = WeatherPayload(
            condition=p['condition'],
            severity=p['severity'],
            durationMinutes=p.get('durationMinutes'),
            description=p.get('description'),
        )
    elif t == 'GEOFENCE':
        polygon = [LatLng(lat=c['lat'], lng=c['lng']) for c in p.get('polygon', [])]
        payload = GeofencePayload(
            type=p['type'],
            polygon=polygon,
            label=p.get('label'),
            validUntil=p.get('validUntil'),
        )
    else:  # NETWORK
        payload = NetworkPayload(
            severity=p['severity'],
            vehicleId=p.get('vehicleId'),
            description=p.get('description'),
        )
    return ActiveConstraint(
        id=data['id'],
        type=t,  # type: ignore[arg-type]
        payload=payload,
        createdAt=data['createdAt'],
        clearedAt=data.get('clearedAt'),
        active=data.get('active', True),
    )
