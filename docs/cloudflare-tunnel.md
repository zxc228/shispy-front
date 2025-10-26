# Cloudflare Tunnel: stable domain for Front + Game Server

This repo already supports a single domain exposing both the Vite dev server and the Socket.IO game server via the same origin. For quick dev, the `trycloudflare.com` tunnel is ephemeral. For a stable URL (so you don't have to update Telegram settings every time), use a Named Tunnel on a domain you control.

## Quick (ephemeral) — already wired
- Front only: `npm run dev:twa` (Vite + tunnel for 5173)
- Front+Game (dev mode): `npm run dev:tunnel:game` (Vite + game server + tunnel)
- Front+Game (test mode): `npm run dev:twa:game` (Vite --mode test + game server + tunnel)

The tunnel domain changes per run. The Socket.IO endpoint is available at `https://<tunnel-domain>/game` (proxied to localhost:4000 by Vite).

On Windows PowerShell:

```powershell
npm install
npm run dev:tunnel:game
```

## Stable (Named Tunnel)
Requires a Cloudflare account and a domain managed by Cloudflare.

1) Login and create tunnel
```sh
cloudflared tunnel login
cloudflared tunnel create shipsy
```

2) Create config file (e.g., `%USERPROFILE%/.cloudflared/config.yml` on Windows)
```yaml
tunnel: shipsy
credentials-file: C:\\Users\\<YOU>\\.cloudflared\\<UUID>.json

ingress:
  - hostname: dev.yourdomain.com
    service: http://localhost:5173
  - hostname: dev.yourdomain.com
    path: /game
    service: http://localhost:4000
  - service: http_status:404
```
Note: Order matters. Some versions require separate ingress blocks per hostname; alternatively use path matching in a single block if supported.

3) Route DNS
```sh
cloudflared tunnel route dns shipsy dev.yourdomain.com
```

4) Run the tunnel
```sh
cloudflared tunnel run shipsy
```

Now your stable domain `https://dev.yourdomain.com` serves:
- `/` -> Vite dev server
- `/game` -> Socket.IO game server

Update `.env` (optional) so the client uses same-origin path:
```
VITE_GAME_WS_URL=/game
```

## Notes
- Keep the tunnel process running to preserve the endpoint.
- For production, place both front and server behind your regular reverse proxy (Nginx/CF) with the same routing.
