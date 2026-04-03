from __future__ import annotations
import argparse
import re
from dataclasses import dataclass


def _ws_to_http(ws_url: str) -> str:
    """ws://host:port/ws/sentinels -> http://host:port"""
    url = re.sub(r'^ws', 'http', ws_url)
    url = re.sub(r'/ws/.*$', '', url)
    return url


@dataclass
class SentinelConfig:
    vehicle_id: str
    backend_url: str
    api_base_url: str
    status_interval: float
    start_lat: float
    start_lng: float
    max_constraint_distance_km: float  # 0 = disabled
    chaos_mode: bool


def parse_config() -> SentinelConfig:
    parser = argparse.ArgumentParser(description='Sentinel Mock Vehicle')
    parser.add_argument('--vehicle-id', required=True, help='Unique vehicle ID')
    parser.add_argument('--backend-url', default='ws://localhost:3001/ws/sentinels')
    parser.add_argument('--status-interval', type=float, default=1.0)
    parser.add_argument('--lat', type=float, default=37.7749)
    parser.add_argument('--lng', type=float, default=-122.4194)
    parser.add_argument('--max-constraint-distance', type=float, default=1.0,
        help='Ignore geofence/weather constraints whose nearest point is farther than this (km). 0 = disabled.')
    parser.add_argument('--chaos', action='store_true', default=False,
        help='Randomly simulate internal signals every ~5 seconds.')
    args = parser.parse_args()
    return SentinelConfig(
        vehicle_id=args.vehicle_id,
        backend_url=args.backend_url,
        api_base_url=_ws_to_http(args.backend_url),
        status_interval=args.status_interval,
        start_lat=args.lat,
        start_lng=args.lng,
        max_constraint_distance_km=args.max_constraint_distance,
        chaos_mode=args.chaos,
    )
