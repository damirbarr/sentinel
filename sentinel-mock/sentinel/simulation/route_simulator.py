from __future__ import annotations
import math
import time
import asyncio
import logging
from sentinel.simulation.vehicle_state import VehicleState
from sentinel.models.status import VehiclePosition

logger = logging.getLogger(__name__)


def _build_route(start_lat: float, start_lng: float) -> list[VehiclePosition]:
    waypoints = []
    radius_deg = 0.01
    for i in range(8):
        angle = math.radians(i * 45)
        waypoints.append(VehiclePosition(
            lat=start_lat + radius_deg * math.sin(angle),
            lng=start_lng + radius_deg * math.cos(angle),
            heading=(i * 45 + 90) % 360,
        ))
    return waypoints


def _bearing(p1: VehiclePosition, p2: VehiclePosition) -> float:
    lat1, lon1 = math.radians(p1.lat), math.radians(p1.lng)
    lat2, lon2 = math.radians(p2.lat), math.radians(p2.lng)
    dlon = lon2 - lon1
    x = math.sin(dlon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def _distance_m(p1: VehiclePosition, p2: VehiclePosition) -> float:
    R = 6_371_000.0
    lat1, lat2 = math.radians(p1.lat), math.radians(p2.lat)
    dlat = lat2 - lat1
    dlng = math.radians(p2.lng - p1.lng)
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


class RouteSimulator:
    ARRIVAL_THRESHOLD_M = 30.0
    UPDATE_INTERVAL = 0.5

    def __init__(self, state: VehicleState):
        self.state = state
        self._route = _build_route(state.position.lat, state.position.lng)
        self._idx = 0
        self._running = False

    async def run(self) -> None:
        self._running = True
        last = time.monotonic()
        while self._running:
            await asyncio.sleep(self.UPDATE_INTERVAL)
            now = time.monotonic()
            delta = now - last
            last = now
            target = self._route[self._idx]
            if _distance_m(self.state.position, target) < self.ARRIVAL_THRESHOLD_M:
                self._idx = (self._idx + 1) % len(self._route)
                target = self._route[self._idx]
            self.state.heading = _bearing(self.state.position, target)
            self.state.position = VehiclePosition(
                lat=self.state.position.lat,
                lng=self.state.position.lng,
                heading=self.state.heading,
            )
            self.state.update_position(delta)

    def stop(self) -> None:
        self._running = False
