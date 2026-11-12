# VATRA on a self-managed VPS

This is an **optional second deployment target**. The current GitHub Pages
site and its `404.html` fallback remain unchanged until the VPS has passed
testing and the public DNS is intentionally switched.

## What changes?

- Caddy serves `/id123`, `/VATRA/id123`, `/club123`, and
  `/VATRA/club123` using an **internal rewrite** to the existing
  `profile.html` or `club.html`: HTTP **200**, no 404 document and no
  redirect.
- Existing clean pages under `/VATRA/` also return HTTP 200.
- Truly unknown paths return HTTP 404 and the VATRA 404 page.
- All Supabase Auth, RLS, and storage stay with Supabase; no database migration.
- The VPS build copies only public site files and compiles an **exact hostname**
  check. It does not weaken the GitHub Pages official-host policy.

## Requirements

An Ubuntu VPS, a domain you control, SSH access with keys, Node.js 20+,
Git, Caddy 2, and TCP ports 80 and 443 reachable. Caddy obtains and renews
HTTPS certificates automatically when public DNS points to this server.

### Prepare the web build

```bash
git clone https://github.com/MykolaKolisnyk/VATRA.git /srv/vatra/src
cd /srv/vatra/src
VATRA_DOMAIN=vatra.example.org node deploy/vps/build.mjs
```

Replace **vatra.example.org** with your real domain. Output:
`/srv/vatra/src/dist/vps/VATRA/`.

Copy **only** the built output to Caddy's document root:

```bash
sudo mkdir -p /srv/vatra/www
sudo rsync -a --delete /srv/vatra/src/dist/vps/ /srv/vatra/www/
sudo cp /srv/vatra/src/deploy/vps/Caddyfile /etc/caddy/Caddyfile
```

Set the Caddy service environment, not a hard-coded domain in the repository:

```bash
sudo systemctl edit caddy
```

Add the following override, replacing the example hostname:

```ini
[Service]
Environment=VATRA_DOMAIN=vatra.example.org
```

Then apply it:

```bash
sudo systemctl daemon-reload
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

Make sure your A/AAAA DNS records point to the VPS and ports 80/443 are
reachable **before** obtaining HTTPS certificates. Caddy requires persistent
write access to its normal certificate storage directory.

### Verify actual HTTP responses

```bash
curl -I https://vatra.example.org/id123
curl -I https://vatra.example.org/club123
curl -I https://vatra.example.org/VATRA/id123
curl -I https://vatra.example.org/this-route-does-not-exist
```

The first three should start with `HTTP/2 200` (or HTTP/1.1 200).
The unknown route should return `404`. A real profile ID must exist in
Supabase to show that member's data; the static server cannot validate IDs.
Unknown numeric IDs can return HTTP 200 for the HTML shell while the app
displays its member-not-found state.

Also test both languages, sign-in, profile photos, password reset, saved
posts, and real-world sharing on the new HTTPS domain before switching public
links.

### Supabase Auth checklist

Before making the VPS domain public, add the new HTTPS origin and its
relevant routes to **Supabase Authentication → URL Configuration → Redirect
URLs**. Confirm the reset, verification, and registration email links all use
the intended official host. Keep existing GitHub Pages URLs until the
migration is complete.

### Update the site later

```bash
cd /srv/vatra/src
git pull --ff-only
VATRA_DOMAIN=vatra.example.org node deploy/vps/build.mjs
sudo rsync -a --delete dist/vps/ /srv/vatra/www/
sudo systemctl reload caddy
```

Avoid committing API keys, private certificates, or SSH credentials.
Use firewall rules and restrict SSH to key-based access. Maintain backups,
automated security updates and server monitoring. Do not stop GitHub Pages
or change DNS until the VPS has been tested with real domain and credentials.
