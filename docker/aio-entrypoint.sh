#!/bin/sh
set -e

# Start cloudflared tunnel in background if token is provided
if [ -n "$TUNNEL_TOKEN" ]; then
  echo "Starting Cloudflare Tunnel..."
  cloudflared tunnel --no-autoupdate run --token "$TUNNEL_TOKEN" &
else
  echo "WARNING: No TUNNEL_TOKEN set – Cloudflare Tunnel will not start."
  echo "         Pass -e TUNNEL_TOKEN=<your-token> to enable it."
fi

# Start the ChargeFlow server
exec npx tsx server/index.ts
