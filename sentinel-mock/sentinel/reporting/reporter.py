from __future__ import annotations
import asyncio
import logging
from sentinel.models.status import VehicleStatusPayload, SentinelMessage, VehiclePosition
from sentinel.simulation.vehicle_state import VehicleState
from sentinel.policy.decision_engine import DecisionEngine
from sentinel.models.events import ActiveConstraint, parse_constraint
from sentinel.transport.ws_client import WSClient
from sentinel.policy.reason_codes import ReasonCode

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
        self._simulated: dict = {}  # simulated conditions from operator commands

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
        elif msg.get('type') == 'VEHICLE_COMMAND':
            await self._handle_command(msg.get('command', ''), msg.get('payload', {}))

    async def _handle_command(self, command: str, payload: dict) -> None:
        if command == 'SIMULATE_NETWORK_DEGRADED':
            self._simulated['network'] = 'DEGRADED'
        elif command == 'SIMULATE_NETWORK_LOST':
            self._simulated['network'] = 'LOST'
        elif command == 'SIMULATE_PERCEPTION_ALARM':
            self._simulated['perception'] = payload.get('message', 'Perception fault detected')
        elif command == 'SIMULATE_OBSTACLE_DETECTED':
            self._simulated['obstacle'] = True
        elif command == 'SIMULATE_SENSOR_FAULT':
            self._simulated['sensor_fault'] = payload.get('description', 'Sensor malfunction')
        elif command == 'CLEAR_SIMULATION':
            self._simulated = {}
        else:
            logger.warning(f'{self.vehicle_id}: unknown command {command!r}')
            return
        logger.info(f'{self.vehicle_id}: applied simulation {command}')
        await self._evaluate_and_report(force=True)

    def _apply_simulated(self, decision: str, codes: list[str]) -> tuple[str, list[str]]:
        priority = {'SAFE_STOP_RECOMMENDED': 3, 'REROUTE_RECOMMENDED': 2, 'DEGRADED_SPEED': 1, 'NORMAL': 0}
        new_codes = list(codes)

        if 'network' in self._simulated:
            sev = self._simulated['network']
            if sev == 'LOST':
                if priority.get('SAFE_STOP_RECOMMENDED', 0) > priority.get(decision, 0):
                    decision = 'SAFE_STOP_RECOMMENDED'
                new_codes.append(ReasonCode.NETWORK_LOST.value)
            else:
                if priority.get('DEGRADED_SPEED', 0) > priority.get(decision, 0):
                    decision = 'DEGRADED_SPEED'
                new_codes.append(ReasonCode.NETWORK_POOR.value)

        if 'obstacle' in self._simulated:
            decision = 'SAFE_STOP_RECOMMENDED'
            new_codes.append(ReasonCode.SENSOR_OBSTACLE_DETECTED.value)

        if 'perception' in self._simulated:
            if priority.get('DEGRADED_SPEED', 0) > priority.get(decision, 0):
                decision = 'DEGRADED_SPEED'
            new_codes.append(ReasonCode.PERCEPTION_ALARM.value)

        if 'sensor_fault' in self._simulated:
            if priority.get('DEGRADED_SPEED', 0) > priority.get(decision, 0):
                decision = 'DEGRADED_SPEED'
            new_codes.append(ReasonCode.SENSOR_FAULT.value)

        # Deduplicate
        unique = list(dict.fromkeys(new_codes))
        if len([c for c in unique if not c.startswith('MULTI')]) > 1 and ReasonCode.MULTI_FACTOR_RISK.value not in unique:
            unique.append(ReasonCode.MULTI_FACTOR_RISK.value)
        return decision, unique

    def _compute_speed(self, decision: str, codes: list[str]) -> float:
        if decision in ('SAFE_STOP_RECOMMENDED', 'REROUTE_RECOMMENDED'):
            return 0.0
        if decision == 'DEGRADED_SPEED':
            # Count distinct degrading sources (weather, geofence, network, simulated)
            sources = set()
            for code in codes:
                if code.startswith('WEATHER'):
                    sources.add('weather')
                elif code.startswith('IN_GEOFENCE') or code.startswith('GEOFENCE'):
                    sources.add('geofence')
                elif code.startswith('NETWORK'):
                    sources.add('network')
                elif code in ('PERCEPTION_ALARM', 'SENSOR_FAULT'):
                    sources.add('internal')
            n = max(1, len(sources))
            # Each additional source reduces speed by 25% (floor at 30% of degraded)
            factor = max(0.3, 1.0 - (n - 1) * 0.25)
            return round(self.state.degraded_speed_kmh * factor, 1)
        return self.state.normal_speed_kmh

    async def _evaluate_and_report(self, force: bool = False) -> None:
        decision, codes = self.engine.evaluate(
            self._constraints,
            lat=self.state.position.lat,
            lng=self.state.position.lng,
        )
        # Apply simulated conditions (override/augment)
        if self._simulated:
            decision, codes = self._apply_simulated(decision, codes)
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
        else:
            # Keep state in sync even when no status message is sent
            speed = self._compute_speed(decision, codes)
            self.state.speed_kmh = speed
            self.state.current_decision = decision
            self.state.cautious_mode = 'IN_GEOFENCE_CAUTION_ZONE' in codes

    async def _send_status(self, decision: str, codes: list[str]) -> None:
        speed = self._compute_speed(decision, codes)
        self.state.speed_kmh = speed
        self.state.current_decision = decision
        self.state.cautious_mode = 'IN_GEOFENCE_CAUTION_ZONE' in codes
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
            if self._simulated:
                decision, codes = self._apply_simulated(decision, codes)
            self._last_decision = decision
            await self._send_status(decision, codes)
            # _send_status writes speed/decision/cautious_mode to state
