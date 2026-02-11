#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Tokamak Pilot — Infrastructure Helper
# Usage: ./infra.sh [up|down|status|restart]
# ──────────────────────────────────────────────

set -euo pipefail
cd "$(dirname "$0")"

COMPOSE="docker compose"

status() {
  echo "=== Tokamak Pilot Infrastructure ==="
  echo ""
  $COMPOSE ps 2>/dev/null || echo "No containers running."
  echo ""
  echo "Port check:"
  for port in 5432 6333 6380; do
    pid=$(lsof -ti ":$port" 2>/dev/null || true)
    if [ -n "$pid" ]; then
      name=$(lsof -i ":$port" -P 2>/dev/null | tail -1 | awk '{print $1}')
      echo "  :$port — in use (pid=$pid, $name)"
    else
      echo "  :$port — free"
    fi
  done
}

up() {
  echo "Starting Tokamak infrastructure..."

  # Stop our own containers first if they exist (clean restart)
  $COMPOSE down 2>/dev/null || true

  # Check for port conflicts
  for port in 5432 6333 6380; do
    pid=$(lsof -ti ":$port" 2>/dev/null || true)
    if [ -n "$pid" ]; then
      name=$(lsof -i ":$port" -P 2>/dev/null | tail -1 | awk '{print $1}')
      echo "WARNING: Port $port is in use by $name (pid=$pid)"
      read -p "Kill it? [y/N] " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill "$pid" 2>/dev/null && echo "  Killed pid $pid" || echo "  Could not kill pid $pid"
        sleep 1
      else
        echo "  Skipping — container on port $port may fail to start"
      fi
    fi
  done

  $COMPOSE up -d
  echo ""
  echo "Infrastructure started:"
  echo "  PostgreSQL  → localhost:5432"
  echo "  Qdrant      → localhost:6333"
  echo "  Redis       → localhost:6380"
  echo ""
  echo "Run 'pnpm dev' to start the app."
}

down() {
  echo "Stopping Tokamak infrastructure..."
  $COMPOSE down
  echo "Done."
}

restart() {
  down
  up
}

case "${1:-status}" in
  up)      up ;;
  down)    down ;;
  status)  status ;;
  restart) restart ;;
  *)
    echo "Usage: ./infra.sh [up|down|status|restart]"
    exit 1
    ;;
esac
