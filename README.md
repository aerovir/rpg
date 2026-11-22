# Нижний контур

Киберпанк-RPG для Telegram Mini App.

A PvE-first cyberpunk RPG built as a Telegram Mini App. The first playable slice has a short server-resolved mission, three character builds, persistent local profiles, and Telegram `initData` authentication.

## Run locally

- Node.js 20 or newer
- `npm start`
- Open `http://localhost:3000` in a browser. Outside Telegram, the server creates a local development profile.

For Telegram authentication, add your bot token to `.env` as `BOT_TOKEN=...`, expose this server over HTTPS, then configure its URL as the Mini App URL with BotFather. `npm start` loads `.env` automatically. The backend validates the signed `Telegram.WebApp.initData`; it never trusts a Telegram user object supplied by the client. Dev authentication is disabled when `NODE_ENV=production`.

The server stores profiles in `data/players.json`. This is suitable for local prototyping; use a transactional database before running multiple server instances or accepting real player contracts.

## Playable slice

- Pick Netrunner, Ghost, or Enforcer.
- Start the “Ghost in the Wire” data-retrieval mission.
- Resolve approach, encounter, and extraction choices on the server.
- Earn credits, experience, and reputation; the profile persists across reloads.
- Install the Synapse Key implant to alter available outcomes.

## Project documents

- [Game concept and MVP](docs/game-design.md)
