#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE"
  echo "Copy .env.example to .env and fill in the tunnel settings."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

PORT="${PORT:-3000}"
TUNNEL_CLEANUP="${TUNNEL_CLEANUP:-1}"
TMP_DIR=""

: "${TUNNEL_NAME:?TUNNEL_NAME is required in .env}"
: "${TUNNEL_HOSTNAME:?TUNNEL_HOSTNAME is required in .env}"

cd "$ROOT_DIR"

STARTED_LAKEBED=0

if nc -z 127.0.0.1 "$PORT" >/dev/null 2>&1; then
  echo "Using existing service on http://localhost:$PORT"
else
  npx lakebed dev . --port "$PORT" &
  LAKEBED_PID=$!
  STARTED_LAKEBED=1
fi

cleanup() {
  if [ "$STARTED_LAKEBED" -eq 1 ]; then
    kill "$LAKEBED_PID" 2>/dev/null || true
  fi
  if [ -n "$TMP_DIR" ] && [ -d "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
}

trap cleanup EXIT INT TERM

until nc -z 127.0.0.1 "$PORT" >/dev/null 2>&1; do
  sleep 1
done

echo "Lakebed: http://localhost:$PORT"
echo "Tunnel: https://$TUNNEL_HOSTNAME"

TMP_DIR="$(mktemp -d)"
CRED_FILE="$TMP_DIR/tunnel-credentials.json"
CONFIG_FILE="$TMP_DIR/config.yml"

cloudflared tunnel token --cred-file "$CRED_FILE" "$TUNNEL_NAME" >/dev/null

if [ "$TUNNEL_CLEANUP" = "1" ]; then
  cloudflared tunnel cleanup "$TUNNEL_NAME" >/dev/null 2>&1 || true
fi

cat > "$CONFIG_FILE" <<EOF
tunnel: $TUNNEL_NAME
credentials-file: $CRED_FILE
ingress:
  - hostname: $TUNNEL_HOSTNAME
    service: http://127.0.0.1:$PORT
  - service: http_status:404
EOF

cloudflared tunnel --config "$CONFIG_FILE" run
