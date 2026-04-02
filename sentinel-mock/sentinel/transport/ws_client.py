from __future__ import annotations
import asyncio
import json
import logging
from typing import Callable, Awaitable
import websockets
from websockets.exceptions import ConnectionClosed

logger = logging.getLogger(__name__)
MessageHandler = Callable[[dict], Awaitable[None]]


class WSClient:
    RECONNECT_DELAY = 3.0

    def __init__(self, url: str, on_message: MessageHandler):
        self._url = url
        self._on_message = on_message
        self._ws = None
        self._running = False
        self._send_queue: asyncio.Queue[str] = asyncio.Queue()

    async def start(self) -> None:
        self._running = True
        while self._running:
            try:
                logger.info(f'Connecting to {self._url}')
                async with websockets.connect(self._url) as ws:
                    self._ws = ws
                    logger.info(f'Connected to {self._url}')
                    await asyncio.gather(self._recv_loop(ws), self._send_loop(ws))
            except ConnectionClosed:
                logger.warning('Connection closed, reconnecting...')
            except OSError as e:
                logger.warning(f'Connection failed: {e}, retrying in {self.RECONNECT_DELAY}s')
            except Exception as e:
                logger.error(f'Unexpected error: {e}')
            finally:
                self._ws = None
            if self._running:
                await asyncio.sleep(self.RECONNECT_DELAY)

    async def _recv_loop(self, ws) -> None:
        async for raw in ws:
            try:
                msg = json.loads(raw)
                await self._on_message(msg)
            except json.JSONDecodeError:
                logger.error(f'Invalid JSON: {raw}')
            except Exception as e:
                logger.error(f'Error handling message: {e}')

    async def _send_loop(self, ws) -> None:
        while True:
            msg = await self._send_queue.get()
            try:
                await ws.send(msg)
            except ConnectionClosed:
                await self._send_queue.put(msg)
                break

    async def send(self, data: dict) -> None:
        await self._send_queue.put(json.dumps(data))

    async def stop(self) -> None:
        self._running = False
        if self._ws:
            await self._ws.close()
