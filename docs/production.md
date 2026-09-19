# Production

The Astro site is hosted by Vercel in `beejsbjs-projects/personal-site`.
Cloudflare remains the authoritative DNS provider. The portfolio does not need
the bjslab tunnel to serve public visitors.

## Release workflow

1. Push a feature branch and review its Vercel preview through the pull request.
2. Merge accepted work into `main`.
3. Vercel builds that commit and promotes it only when the build command succeeds.

Vercel is connected to `beejsbj/personal-site`, with `main` as the production
branch and Git deployments enabled. Preview/deployment URLs require Vercel
authentication under the current project protection setting; the production
domain is public.

The project uses the Astro preset and Node.js 22.x. Install command:

```sh
corepack pnpm@10.6.5 install --frozen-lockfile
```

Build command:

```sh
corepack pnpm@10.6.5 check && corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test
```

These settings live in the Vercel project. `astro.config.mjs` selects the Vercel
adapter, and `vercel.json` preserves legacy path and query-string redirects.
The root PHP files and `docker-compose.yaml` do not serve the Astro deployment.

## Domain boundary

At the September 20, 2026 cutover, Vercel supplied `76.76.21.21` as the target
for both `burooj.dev` and `www.burooj.dev`. Both records are DNS-only A records
in Cloudflare. Vercel redirects `www` to the apex with HTTP 308 and manages HTTPS.
Future changes should use the targets shown by `vercel domains inspect`, rather
than assuming this address is permanent.

Keep other subdomains, the wildcard tunnel record, mail records, and Cloudflare
nameservers unchanged. An exact local AdGuard rewrite of `burooj.dev` to the old
bjslab origin must be removed for LAN/Tailscale clients to follow public DNS.

## Verification

Verify the public domain without a logged-in browser: homepage, About, Projects,
a project detail, Lab, Resume, style guide, images, sitemap, legacy redirects,
and an intentional 404. Confirm `www` redirects to the apex and HTTPS validates.
Check local DNS separately: a public cutover can succeed while a local override
still serves the old site.

## Rollback

The old PHP app on bjslab is retained temporarily, with Coolify automatic
deployment disabled so future `main` pushes cannot replace the rollback image.
Do not redeploy or delete it until the new production site is accepted.

For an Astro release regression, restore a known-good deployment in Vercel.
For a hosting cutover rollback, restore the prior apex/www Cloudflare records
from the scoped bjslab backup, then verify public and local HTTPS. The prior
Cloudflare Tunnel routes and old app remain available. Operational backup
locations and exact record IDs belong in the Cockpit cutover receipt; no
credentials belong in this repository.
