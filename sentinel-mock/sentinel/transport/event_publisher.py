from __future__ import annotations
import asyncio
import json
import logging
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)


def _obstacle_polygon(lat: float, lng: float, radius_m: float = 60.0) -> list[dict]:
    """Generate a small square polygon around a point."""
    d = radius_m / 111_000.0  # degrees per meter
    return [
        {'lat': lat + d, 'lng': lng - d},
        {'lat': lat + d, 'lng': lng + d},
        {'lat': lat - d, 'lng': lng + d},
        {'lat': lat - d, 'lng': lng - d},
    ]


class EventPublisher:
    def __init__(self, api_base_url: str, vehicle_id: str):
        self._base = api_base_url.rstrip('/')
        self._vehicle_id = vehicle_id
        self._published: list[str] = []  # event IDs we published

    async def publish_network(self, severity: str) -> None:
        event = {
            'type': 'NETWORK',
            'payload': {'severity': severity, 'vehicleId': self._vehicle_id},
            'durationMinutes': 3,
        }
        await self._post(event)

    async def publish_obstacle(self, lat: float, lng: float) -> None:
        event = {
            'type': 'GEOFENCE',
            'payload': {
                'type': 'CAUTION',
                'label': f'Obstacle: {self._vehicle_id}',
                'polygon': _obstacle_polygon(lat, lng),
            },
            'durationMinutes': 3,
        }
        await self._post(event)

    async def clear_all(self) -> None:
        ids = list(self._published)
        self._published.clear()
        for eid in ids:
            await self._delete(eid)

    async def _post(self, event: dict) -> None:
        loop = asyncio.get_event_loop()

        def _do_post():
            data = json.dumps(event).encode()
            req = urllib.request.Request(
                f'{self._base}/api/events',
                data=data,
                headers={'Content-Type': 'application/json'},
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                return json.loads(resp.read())

        try:
            result = await loop.run_in_executor(None, _do_post)
            eid = result.get('id')
            if eid:
                self._published.append(eid)
                logger.info(f'{self._vehicle_id}: published {event["type"]} event {eid}')
        except Exception as exc:
            logger.warning(f'{self._vehicle_id}: failed to publish event: {exc}')

    async def _delete(self, event_id: str) -> None:
        loop = asyncio.get_event_loop()

        def _do_delete():
            req = urllib.request.Request(
                f'{self._base}/api/events/{event_id}',
                method='DELETE',
            )
            with urllib.request.urlopen(req, timeout=5):
                pass

        try:
            await loop.run_in_executor(None, _do_delete)
            logger.info(f'{self._vehicle_id}: deleted event {event_id}')
        except Exception as exc:
            logger.warning(f'{self._vehicle_id}: failed to delete event {event_id}: {exc}')
