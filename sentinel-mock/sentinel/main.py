from __future__ import annotations
import asyncio
import logging
from sentinel.config import parse_config
from sentinel.transport.ws_client import WSClient
from sentinel.simulation.vehicle_state import VehicleState
from sentinel.simulation.route_simulator import RouteSimulator
from sentinel.policy.decision_engine import DecisionEngine
from sentinel.reporting.reporter import Reporter
from sentinel.models.status import VehiclePosition

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')
logger = logging.getLogger(__name__)


async def run(config) -> None:
    state = VehicleState(
        vehicle_id=config.vehicle_id,
        position=VehiclePosition(lat=config.start_lat, lng=config.start_lng, heading=0.0),
    )
    engine = DecisionEngine(vehicle_id=config.vehicle_id)
    simulator = RouteSimulator(state)

    reporter: Reporter  # forward ref

    async def on_message(msg: dict) -> None:
        await reporter.handle_backend_message(msg)

    client = WSClient(url=config.backend_url, on_message=on_message)
    reporter = Reporter(
        vehicle_id=config.vehicle_id,
        state=state,
        engine=engine,
        client=client,
        status_interval=config.status_interval,
    )

    connect_task = asyncio.create_task(client.start())
    await asyncio.sleep(1.0)
    await reporter.register()

    await asyncio.gather(connect_task, simulator.run(), reporter.run_periodic_reporting())


def main() -> None:
    config = parse_config()
    logger.info(f'Starting Sentinel mock: {config.vehicle_id}')
    try:
        asyncio.run(run(config))
    except KeyboardInterrupt:
        logger.info('Sentinel mock stopped')


if __name__ == '__main__':
    main()
