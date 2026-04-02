from __future__ import annotations
import math
import time
from dataclasses import dataclass, field
from sentinel.models.status import VehiclePosition


@dataclass
class VehicleState:
    vehicle_id: str
    position: VehiclePosition
    speed_kmh: float = 30.0
    normal_speed_kmh: float = 30.0
    degraded_speed_kmh: float = 10.0
    heading: float = 0.0
    last_update: float = field(default_factory=time.monotonic)
    current_decision: str = 'NORMAL'
    cautious_mode: bool = False  # True when in CAUTION geofence zone

    def update_position(self, delta_seconds: float) -> None:
        dist_m = (self.speed_kmh / 3.6) * delta_seconds
        R = 6_371_000.0
        lat_rad = math.radians(self.position.lat)
        heading_rad = math.radians(self.heading)
        delta_lat = (dist_m * math.cos(heading_rad)) / R
        delta_lng = (dist_m * math.sin(heading_rad)) / (R * math.cos(lat_rad))
        self.position = VehiclePosition(
            lat=self.position.lat + math.degrees(delta_lat),
            lng=self.position.lng + math.degrees(delta_lng),
            heading=self.heading,
        )
        self.last_update = time.monotonic()
