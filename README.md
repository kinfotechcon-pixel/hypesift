# Hypesift

A game that trains you to tell **signal** from **hype**. Players judge real AI claims, pick the clue that decides each one, and say how sure they are. Every claim is checked against a linked source, and a new pack of eight arrives each week.

Live site: https://kinfotechcon-pixel.github.io/hypesift/

## How it deploys

The site is plain static files served by GitHub Pages from the `main` branch. **Every push to `main` publishes automatically** at the same link. There is nothing to build.

| File | Purpose |
|---|---|
| `index.html`, `style.css`, `app.js` | The game |
| `packs.js` | **The weekly case-file packs and badge tips. This is the file you edit each week.** |
| `config.js` | Backend settings (Supabase URL and public key) |
| `backend.js` | Connects the leaderboard and suggestion form to Supabase |
| `supabase/schema.sql` | Database tables and security rules |
| `scripts/validate-packs.js` | Checks `packs.js` before it is committed |

## Adding a weekly pack

1. In `packs.js`, add a `PACK_W` array of 8 cases (copy an existing one), add it to `PACKS`, and add any new pattern name to `TIPS`.
2. Run `node scripts/validate-packs.js`. It must print `packs.js is valid`.
3. Commit and push to `main`. The live site updates within a minute or two.

## Turning on the leaderboard and suggestions (Supabase)

The game works without a backend. The leaderboard, crowd comparison and "Suggest a claim" form switch on once `config.js` is filled in.

1. Create a free project at https://supabase.com.
2. Go to **Authentication > Sign In / Providers** and enable **Allow anonymous sign-ins**. Players never see a sign-up form; each browser gets a random id.
3. Open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it.
4. Go to **Project Settings > API**. Copy the **Project URL** and the **anon public** key into `config.js`.
5. Commit and push.

The anon key is meant to be public. The security rules in `schema.sql` mean each player can only write their own row. **Never put the `service_role` key anywhere in this repository.**

Notes:
- Suggestions are visible only to the player who sent them and to you in the Supabase **Table Editor** (`submissions` table).
- Nicknames on the board are opt-in and chosen by players. You can edit or delete any row in the Table Editor if a nickname needs moderating.
- Free Supabase projects pause after a week with no activity. Resume from the dashboard if that happens.
- Clearing browser data starts a player over with a new anonymous id.
