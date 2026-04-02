from __future__ import annotations
import math
from sentinel.models.events import ActiveConstraint, WeatherPayload, GeofencePayload, NetworkPayload, LatLng
from sentinel.policy.reason_codes import ReasonCode

DecisionState = str  # 'NORMAL' | 'DEGRADED_SPEED' | 'SAFE_STOP_RECOMMENDED' | 'REROUTE_RECOMMENDED'

_PRIORITY = {'SAFE_STOP_RECOMMENDED': 3, 'REROUTE_RECOMMENDED': 2, 'DEGRADED_SPEED': 1, 'NORMAL': 0}


def _point_in_polygon(lat: float, lng: float, polygon: list[LatLng]) -> bool:
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i].lng, polygon[i].lat
        xj, yj = polygon[j].lng, polygon[j].lat
        if ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6_371_000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def _eval_weather(p: WeatherPayload, lat: float, lng: float) -> tuple[DecisionState, list[str]]:
    # If weather has a geographic zone, check if vehicle is inside
    if hasattr(p, 'center') and p.center is not None and hasattr(p, 'radiusMeters') and p.radiusMeters:
        dist = _haversine_m(lat, lng, p.center.lat, p.center.lng)
        if dist > p.radiusMeters:
            return 'NORMAL', []  # vehicle outside weather zone
    code_map = {
        'HEAVY_RAIN': ReasonCode.WEATHER_HEAVY_RAIN,
        'FOG': ReasonCode.WEATHER_FOG,
        'STRONG_WIND': ReasonCode.WEATHER_STRONG_WIND,
        'LOW_VISIBILITY': ReasonCode.WEATHER_LOW_VISIBILITY,
        'SNOW': ReasonCode.WEATHER_HEAVY_RAIN,
        'ICE': ReasonCode.WEATHER_LOW_VISIBILITY,
    }
    code = code_map.get(p.condition, ReasonCode.WEATHER_HEAVY_RAIN).value
    if p.severity in ('HIGH', 'EXTREME'):
        return 'SAFE_STOP_RECOMMENDED', [code]
    return 'DEGRADED_SPEED', [code]


def _eval_geofence(p: GeofencePayload, lat: float, lng: float) -> tuple[DecisionState, list[str]]:
    if not _point_in_polygon(lat, lng, p.polygon):
        return 'NORMAL', []
    if p.type == 'FORBIDDEN':
        return 'SAFE_STOP_RECOMMENDED', [ReasonCode.IN_GEOFENCE_FORBIDDEN_ZONE.value]
    if p.type == 'SLOW':
        return 'DEGRADED_SPEED', [ReasonCode.IN_GEOFENCE_SLOW_ZONE.value]
    return 'DEGRADED_SPEED', [ReasonCode.IN_GEOFENCE_CAUTION_ZONE.value]


def _eval_network(p: NetworkPayload, vehicle_id: str) -> tuple[DecisionState, list[str]]:
    if p.vehicleId and p.vehicleId != vehicle_id:
        return 'NORMAL', []
    if p.severity == 'LOST':
        return 'SAFE_STOP_RECOMMENDED', [ReasonCode.NETWORK_LOST.value]
    return 'DEGRADED_SPEED', [ReasonCode.NETWORK_POOR.value]


class DecisionEngine:
    def __init__(self, vehicle_id: str):
        self.vehicle_id = vehicle_id

    def evaluate(self, constraints: list[ActiveConstraint], lat: float, lng: float) -> tuple[DecisionState, list[str]]:
        overall: DecisionState = 'NORMAL'
        codes: list[str] = []

        for c in constraints:
            if not c.active:
                continue
            if c.type == 'WEATHER':
                d, cc = _eval_weather(c.payload, lat, lng)  # type: ignore[arg-type]
            elif c.type == 'GEOFENCE':
                d, cc = _eval_geofence(c.payload, lat, lng)  # type: ignore[arg-type]
            elif c.type == 'NETWORK':
                d, cc = _eval_network(c.payload, self.vehicle_id)  # type: ignore[arg-type]
            else:
                continue
            if _PRIORITY.get(d, 0) > _PRIORITY.get(overall, 0):
                overall = d
            codes.extend(cc)

        unique = list(dict.fromkeys(codes))
        if len([c for c in unique if not c.startswith('MULTI')]) > 1:
            unique.append(ReasonCode.MULTI_FACTOR_RISK.value)
        return overall, unique
