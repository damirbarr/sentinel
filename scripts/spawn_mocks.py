#!/usr/bin/env python3
"""Spawn N mock vehicles in random locations around SF."""
import argparse
import random
import subprocess
import signal
import sys
import os

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--n', type=int, default=3)
    parser.add_argument('--python', required=True)
    parser.add_argument('--backend-url', default='ws://localhost:3001/ws/sentinels')
    parser.add_argument('--max-distance', type=float, default=1.0)
    parser.add_argument('--chaos', action='store_true')
    args = parser.parse_args()

    procs = []
    for i in range(args.n):
        vid = f'vehicle-{i + 1:03d}'
        lat = 37.7749 + random.uniform(-0.018, 0.018)
        lng = -122.4194 + random.uniform(-0.018, 0.018)
        cmd = [
            args.python, '-m', 'sentinel.main',
            '--vehicle-id', vid,
            '--backend-url', args.backend_url,
            '--lat', str(lat),
            '--lng', str(lng),
            '--max-constraint-distance', str(args.max_distance),
        ]
        if args.chaos:
            cmd.append('--chaos')
        print(f'  → Spawning {vid} at ({lat:.4f}, {lng:.4f})')
        procs.append(subprocess.Popen(cmd, cwd=os.path.join(os.path.dirname(__file__), '..', 'sentinel-mock')))

    print(f'  {args.n} vehicle(s) running. Ctrl+C to stop all.\n')

    def _stop(sig, frame):
        print('\n  Stopping all vehicles...')
        for p in procs:
            p.terminate()
        for p in procs:
            try:
                p.wait(timeout=3)
            except subprocess.TimeoutExpired:
                p.kill()
        sys.exit(0)

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)
    for p in procs:
        p.wait()

if __name__ == '__main__':
    main()
