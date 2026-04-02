from __future__ import annotations
import asyncio
import logging
from sentinel.models.status import VehicleStatusPayload, SentinelMessage, VehiclePosition
from sentinel.simulation.vehicle_state import VehicleState
from sentinel.policy.decision_engine import DecisionEngine
from sentinel.models.events import ActiveConstraint, parse_constraint
from sentinel.transport.ws_client import WSClient

logger = logging.getLogger(__name__)


class Reporter:
    def __init__(self, vehicle_id: str, state: VehicleState, engine: DecisionEngine,
                 client: WSClient, status_interval: float):
        self.vehicle_id = vehicle_id
        self.state = state
        self.engine = engine
        self.client = client
        self.status_interval = status_interval
        self._constraints: list[ActiveConstraint] = []
        self._last_decision = 'NORMAL'

    async def register(self) -> None:
        msg = SentinelMessage(
            type='REGISTER',
            vehicleId=self.vehicle_id,
            payload={
                'vehicleId': self.vehicle_id,
                'position': {
                    'lat': self.state.position.lat,
                    'lng': self.state.position.lng,
                    'heading': self.state.position.heading,
                },
            },
        )
        await self.client.send(msg.to_dict())
        logger.info(f'Registered {self.vehicle_id}')

    async def handle_backend_message(self, msg: dict) -> None:
        if msg.get('type') == 'CONSTRAINT_UPDATE':
            raw = msg.get('constraints', [])
            self._constraints = [parse_constraint(c) for c in raw]
            logger.info(f'{self.vehicle_id}: received {len(self._constraints)} constraint(s)')
            await self._evaluate_and_report(force=True)

    async def _evaluate_and_report(self, force: bool = False) -> None:
        decision, codes = self.engine.evaluate(
            self._constraints,
            lat=self.state.position.lat,
            lng=self.state.position.lng,
        )
        changed = decision != self._last_decision
        if changed:
            event_msg = SentinelMessage(
                type='EVENT_REPORT',
                vehicleId=self.vehicle_id,
                payload={
                    'event': 'DECISION_CHANGED',
                    'previousDecision': self._last_decision,
                    'newDecision': decision,
                    'reasonCodes': codes,
                    'description': (
                        f'Decision changed from {self._last_decision} to {decision}. '
                        f'Reasons: {", ".join(codes) if codes else "none"}'
                    ),
                },
            )
            await self.client.send(event_msg.to_dict())
            logger.info(f'{self.vehicle_id}: {self._last_decision} -> {decision} ({", ".join(codes)})')
        self._last_decision = decision
        if force or changed:
            await self._send_status(decision, codes)

    async def _send_status(self, decision: str, codes: list[str]) -> None:
        speed = self.state.speed_kmh if decision == 'NORMAL' else (
            self.state.degraded_speed_kmh if decision == 'DEGRADED_SPEED' else 0.0
        )
        payload = VehicleStatusPayload(
            position=VehiclePosition(
                lat=self.state.position.lat,
                lng=self.state.position.lng,
                heading=self.state.position.heading,
            ),
            speedKmh=speed,
            decision=decision,  # type: ignore[arg-type]
            reasonCodes=codes,
            activeConstraintIds=[c.id for c in self._constraints if c.active],
        )
        msg = SentinelMessage(type='STATUS_UPDATE', vehicleId=self.vehicle_id, payload=payload.to_dict())
        await self.client.send(msg.to_dict())

    async def run_periodic_reporting(self) -> None:
        while True:
            await asyncio.sleep(self.status_interval)
            decision, codes = self.engine.evaluate(
                self._constraints, lat=self.state.position.lat, lng=self.state.position.lng
            )
            self._last_decision = decision
            await self._send_status(decision, codes)
