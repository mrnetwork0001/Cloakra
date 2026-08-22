# Deploying Cloakra

Five minutes on Vercel. The app is a static-plus-client Next.js build — no
server secrets, no databases.

## Steps

1. **Import the repo** at [vercel.com/new](https://vercel.com/new) →
   `mrnetwork0001/Cloakra`.
2. **Root Directory: `client`** — this is the one setting that matters.
   (`vercel.json` at the repo root pins the framework and build command; the
   `prebuild` hook syncs `strk20.json` into the client automatically.)
3. **Environment variable** (Production + Preview):
   - `NEXT_PUBLIC_STARKNET_RPC_URL` = your Alchemy Starknet **mainnet** RPC URL
     (same value as `client/.env.local`).
4. Deploy.
5. **After the first deploy:** in the Alchemy dashboard, add the Vercel domain
   (`*.vercel.app` or your custom domain) to the API key's **allowed origins**.
   The key ships to browsers by design (`NEXT_PUBLIC_`); domain restriction is
   the control that matters.

## Hackathon notes

- **Do not fill `demo_url` in `strk20.json`.** The sprint hub auto-detects the
  most recent successful deployment that Vercel reports to GitHub — declaring
  it is only a fallback.
- The deployment must be reachable publicly (no Vercel password protection).

## Sanity checklist after deploy

- [ ] Landing page renders; module cards + Submission proof section visible
- [ ] Proof panel shows all three hashes green (`ACCEPTED_ON_L2 · SUCCEEDED`)
- [ ] Wallet connect works from the deployed origin (Ready installed)
- [ ] No password protection; share the URL in a private window to confirm
