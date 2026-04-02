from __future__ import annotations
import asyncio
import logging
import signal
import select
import threading
from sentinel.config import parse_config
from sentinel.transport.ws_client import WSClient
from sentinel.simulation.vehicle_state import VehicleState
from sentinel.simulation.route_simulator import RouteSimulator
from sentinel.policy.decision_engine import DecisionEngine
from sentinel.reporting.reporter import Reporter
from sentinel.models.status import VehiclePosition

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')
logger = logging.getLogger(__name__)


async def interactive_console(vehicle_id: str, reporter, stop_event: asyncio.Event) -> None:
    import sys
    loop = asyncio.get_event_loop()
    _stop_flag = threading.Event()

    # Mirror the asyncio stop_event into a threading event for the executor
    async def _watch_stop():
        await stop_event.wait()
        _stop_flag.set()
    asyncio.ensure_future(_watch_stop())

    def _read_line(prompt: str) -> str | None:
        sys.stdout.write(prompt)
        sys.stdout.flush()
        # Poll stdin with timeout so we can check _stop_flag
        while not _stop_flag.is_set():
            if sys.stdin.isatty():
                ready = select.select([sys.stdin], [], [], 0.5)[0]
                if ready:
                    return sys.stdin.readline().rstrip('\n')
            else:
                # Non-TTY (piped): blocking read is fine
                line = sys.stdin.readline()
                return line.rstrip('\n') if line else None
        return None

    print(f'\n  [{vehicle_id}] Sentinel interactive console ready.')
    print(f'  Press Enter or type a number to simulate a condition.\n')

    MENU = (
        f'\n  ┌─ {vehicle_id} ──────────────────────────┐\n'
        '  │  1. Perception Alarm               │\n'
        '  │  2. Network Degraded               │\n'
        '  │  3. Network Lost                   │\n'
        '  │  4. Obstacle Detected (STOP)        │\n'
        '  │  5. Sensor Fault                   │\n'
        '  │  6. Clear All Simulations          │\n'
        '  └────────────────────────────────────┘\n'
        '  > '
    )

    while not stop_event.is_set():
        try:
            choice = await loop.run_in_executor(None, lambda: _read_line(MENU))
            if choice is None:
                break
            choice = choice.strip()

            if choice == '1':
                msg = await loop.run_in_executor(None, lambda: _read_line('  Perception message (Enter for default): '))
                if msg is None:
                    break
                await reporter._handle_command('SIMULATE_PERCEPTION_ALARM', {'message': msg or 'Perception fault detected'})
                print(f'  ↑ [{vehicle_id}] Perception alarm sent.')
            elif choice == '2':
                await reporter._handle_command('SIMULATE_NETWORK_DEGRADED', {})
                print(f'  ↑ [{vehicle_id}] Network degraded.')
            elif choice == '3':
                await reporter._handle_command('SIMULATE_NETWORK_LOST', {})
                print(f'  ↑ [{vehicle_id}] Network lost → SAFE STOP.')
            elif choice == '4':
                await reporter._handle_command('SIMULATE_OBSTACLE_DETECTED', {})
                print(f'  ↑ [{vehicle_id}] OBSTACLE DETECTED → emergency stop.')
            elif choice == '5':
                desc = await loop.run_in_executor(None, lambda: _read_line('  Fault description (Enter for default): '))
                if desc is None:
                    break
                await reporter._handle_command('SIMULATE_SENSOR_FAULT', {'description': desc or 'Sensor malfunction'})
                print(f'  ↑ [{vehicle_id}] Sensor fault reported.')
            elif choice == '6':
                await reporter._handle_command('CLEAR_SIMULATION', {})
                print(f'  ↑ [{vehicle_id}] All simulations cleared.')
            elif choice == '':
                pass  # just redraw menu
            else:
                print(f'  Invalid choice: {choice!r}')
        except (EOFError, KeyboardInterrupt, asyncio.CancelledError):
            break
        except Exception as e:
            logger.error(f'Interactive console error: {e}')


async def run(config) -> None:
    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()
    loop.add_signal_handler(signal.SIGINT, stop_event.set)
    loop.add_signal_handler(signal.SIGTERM, stop_event.set)

    state = VehicleState(
        vehicle_id=config.vehicle_id,
        position=VehiclePosition(lat=config.start_lat, lng=config.start_lng, heading=0.0),
    )
    engine = DecisionEngine(vehicle_id=config.vehicle_id, max_constraint_distance_km=config.max_constraint_distance_km)
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

    try:
        await asyncio.gather(
            connect_task,
            simulator.run(),
            reporter.run_periodic_reporting(),
            interactive_console(config.vehicle_id, reporter, stop_event),
        )
    except asyncio.CancelledError:
        pass
    finally:
        loop.remove_signal_handler(signal.SIGINT)
        loop.remove_signal_handler(signal.SIGTERM)


def main() -> None:
    config = parse_config()
    logger.info(f'Starting Sentinel mock: {config.vehicle_id}')
    try:
        asyncio.run(run(config))
    except KeyboardInterrupt:
        pass
    logger.info('Sentinel mock stopped')


if __name__ == '__main__':
    main()
