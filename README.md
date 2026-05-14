# IronGuild – Demonic Pact Leagues 2026

A static single-page web app for the **IronGuild OSRS clan** to interact with the Demonic Pact Leagues 2026 event.

## Features

- 🔥 **Fiery OSRS-themed UI** – dark demonic aesthetic with animated ember particles, glowing tiles, and fire colour gradients
- 🏆 **Task Tiles** – clickable/tappable challenge cards each showing a brief description up front, expanding to a full detail modal on click (rewards, in-depth description, claim status)
- 📊 **Live Leaderboard** – auto-fetches the top 3 IronGuild players from [Wise Old Man](https://wiseoldman.net/groups/239) (group ID 239, refreshes every 5 minutes) and displays a full sorted leaderboard on click
- 🐉 **Here Be Dragons** – manually maintained list of members who have achieved Dragon Status; displayed in a dedicated modal
- 📱 **Mobile Responsive** – grid layout adapts from 2-column desktop down to single-column mobile
- 🔐 **Admin Panel** – password-protected panel (default password: `IronGuild2026!`) to:
  - Mark any challenge tile as **Claimed** with a player username
  - Remove claims
  - Add / remove Dragon Status members
  - Change the admin password (hashed with SHA-256, stored in `localStorage`)

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure, tile markup, modals |
| `styles.css`  | Fiery theme, layout, animations, responsive styles |
| `app.js`      | Interactivity, WOM API calls, admin logic, localStorage persistence |

## Usage

Open `index.html` in any modern browser – no build step or server required.

### Admin Access

1. Click **🔐 Admin** in the footer.
2. Enter the admin password (default: `IronGuild2026!`).
3. Use the admin panel that slides up from the bottom to:
   - Select a task and enter the winner's RSN to mark it **Claimed**.
   - Remove a claim if needed.
   - Add/remove Dragon Status members.
   - Change the admin password.

> **Shared claims setup:**  
> Claims now support shared storage through a JSON API endpoint.  
> Set `window.IG_SHARED_CLAIMS_ENDPOINT` before `app.js` loads (for example in `index.html`):
> ```html
> <script>window.IG_SHARED_CLAIMS_ENDPOINT = 'https://your-api.example.com/claims';</script>
> ```
> The endpoint should:
> - return either `{ "claims": { ... } }` or `{ ... }` on `GET`
> - accept `{ "claims": { ... } }` on `PUT`
>  
> If no endpoint is configured, the app automatically falls back to per-device `localStorage`.

## Challenges

| Tile | Reward |
|---|---|
| First to MAX | OSRS Bond |
| First to Dragon Tier | Ingame Icon, Discord Role |
| First to Tier 8 Relic | OSRS Bond |
| First to 3 Echo Items | OSRS Bond |
| First to 40 Pact Points | OSRS Bond |
| First to Max Combat | OSRS Bond |
| Top 3 Players | Rank Up, Discord Role |
| Here Be Dragons | Discord Role, Ingame Icon |
