# Shipsy Real-time Game RFC (MVP)

Status: Draft

## Goal
Introduce an authoritative real-time game service for 1v1 Battles without breaking existing REST APIs. The front will keep using current endpoints for lobby/create/join/wallet; in-battle flow moves to WebSocket events.

## Key rules (assumptions)
- Coin toss at battle start decides who goes first.
- Each player has a personal chess clock: initial time 25 seconds; after each move, that player receives +3 seconds increment.
- One hidden cell (treasure) per player on a 4x4 grid.
- Players move strictly in turns. A move targets one enemy cell.
- Win conditions: hit the opponent's treasure.
- On timeout, the player who runs out of time loses (technical defeat).

## Auth
- Reuse existing JWT (Telegram-auth) via `Authorization: Bearer` token.
- On socket connect, client provides token in the `auth` payload or query; server validates and attaches `tuid`.

## Namespacing / Rooms
- Namespace: `/game`.
- Room per game: `game:<gameId>`.

## Events

Client -> Server
- `join_game` { gameId }
  - Join room, get current state.
- `place_secret` { cell }
  - Place secret cell (once per player at start phase). Server transitions to next phase when both placed, then performs coin toss.
- `move` { cell, moveId }
  - Attempt a move (idempotent; server ignores duplicates).
- `concede` {}
  - Player resigns; opponent wins.
- `pong` {}
  - Optional heartbeat reply.

Server -> Client (broadcast to room or unicast)
- `state` { version, phase, players: { a:{tuid,timeLeft}, b:{tuid,timeLeft} }, turn, yourGrid, enemyGridPublic }
  - Authoritative snapshot. Client derives UI from this.
- `toss` { firstTurn: 'a'|'b', seed }
  - Result of coin toss; triggers animation client-side.
- `move_result` { by, cell, result: 'hit'|'miss', winner?, rewards? }
  - Immediate outcome of a move. If `winner` present -> terminal state.
- `timeout` { player }
  - Player ran out of time; terminal state follows as `state`/`game_over`.
- `game_over` { winner, reason: 'hit'|'timeout'|'concede', rewards }
- `error` { code, message }

## Phases
- `waiting_players` -> `placing` -> `toss` -> `turn_a`/`turn_b` -> `finished`

## Timers
- Server owns timers. Each player has `timeLeft` that counts down only during their turn.
- On each confirmed move, server applies +3s increment to the mover's clock, then switches turn.
- Timer tick granularity is server-side only; clients rely on periodic `state` or drift-tolerant countdown.

## Reconnect & Idempotency
- Client includes `lastVersion` on `join_game`; server sends a fresh `state` if diverged.
- `moveId` must be unique per client; server stores recent ids to deduplicate.

## Persistence & Wallet
- In-memory state for MVP (Map by gameId). TTL cleanup on finish.
- On terminal state, server notifies wallet/backend to settle rewards (existing REST), then emits `game_over`.

## Backward compatibility
- Existing REST flows for create/join/lobby remain unchanged.
- Client keeps REST polling as fallback if socket unavailable, but prefers socket events.

## Minimal rollout plan
1) Socket server: connect/join/toss/state skeleton.
2) Front: socket provider + Battle reads `toss` to animate and respects `state` for turn/timer.
3) Add timer & move validation on server; wire concede.
4) Redis adapter for scale-out (later).
