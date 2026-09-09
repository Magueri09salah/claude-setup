# Deploying to a Hostinger VPS

Everything on one server: PostgreSQL, the API, and the admin panel.
Follow this top to bottom. Every step tells you how to check it worked.

**Read this once before starting:** a step marked ⚠️ is destructive or can lock
you out. Do not skip its warning.

---

## Placeholders

Every `<PLACEHOLDER>` below is one of these. Decide them now and write them down.

| Placeholder | What to put | Example |
|---|---|---|
| `<DOMAIN>` | Your domain | `codeboujida.com` |
| `<SERVER_IP>` | The VPS address | `76.13.63.111` |
| `<DEPLOY_USER>` | Linux user you will work as. Never `root`. | `salah` |
| `<DB_PASSWORD>` | Database password you invent. **Letters and digits only** — symbols must be URL-encoded inside a connection string and cause hard-to-spot failures. | `Kj8mQp2xRt9vLn4w` |
| `<ADMIN_EMAIL>` | Your login for the admin panel | `owner@codeboujida.com` |
| `<ADMIN_PASSWORD>` | Password for that login. Minimum 8 characters; make it strong — it can grant free access to everything. | |
| `<R2_ACCOUNT_ID>` | Cloudflare → R2 → Account details | 32 hex characters |
| `<R2_ACCESS_KEY_ID>` | From the R2 API token screen | |
| `<R2_SECRET_ACCESS_KEY>` | From the same screen, shown once | |
| `<R2_BUCKET>` | Bucket name you created | `codeboujida-media` |

Three more values (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
`MEDIA_SIGNING_SECRET`) are **generated on the server** in Step 22. Don't invent
them yourself.

---

## Before you start

1. **DNS.** `<DOMAIN>` already points at `<SERVER_IP>`. You also need a record
   for `www`, or the HTTPS step fails for that name. In Hostinger's DNS editor
   add: type `A`, name `www`, value `<SERVER_IP>`.

   Check both from your own machine:
   ```bash
   nslookup <DOMAIN>
   nslookup www.<DOMAIN>
   ```
   ✅ Both must show `<SERVER_IP>`. DNS changes can take up to an hour.

2. **GitHub access.** If `github.com/Magueri09salah/claude-setup` is private,
   the server needs a deploy key (Step 18 covers it). If it is public, nothing
   to do.

3. **Everything is pushed.** On your laptop: `git status` shows nothing to
   commit, and `git push` reports up to date. The server installs what is on
   GitHub, not what is on your laptop.

---

# Part 1 — First connection

### Step 1. Log in as root

From your laptop:
```bash
ssh root@<SERVER_IP>
```
Accept the fingerprint with `yes`, then enter the root password Hostinger gave
you.

✅ The prompt changes to `root@something:~#`. You are on the server. Every
command from here until Step 17 runs **on the server**.

### Step 2. Update the system

```bash
apt update && apt upgrade -y
```
Takes a few minutes. If a purple screen asks about keeping a configuration file,
choose **keep the local version**. If it asks to restart services, choose **Yes**.

✅ Ends with a prompt back. `apt list --upgradable` then prints nothing but a
`Listing...` line.

### Step 3. Set the clock to UTC

```bash
timedatectl set-timezone UTC
timedatectl
```
✅ `Time zone: UTC (UTC, +0000)`.

This matters: subscription expiry is calculated with the server's local date. A
server on Casablanca time would end three-month subscriptions a day early or
late.

### Step 4. Create your user

```bash
adduser <DEPLOY_USER>
```
It asks for a password twice, then name/room/phone — press Enter through those
and confirm with `Y`.

```bash
usermod -aG sudo <DEPLOY_USER>
```

✅ Check it worked:
```bash
groups <DEPLOY_USER>
```
Output must include `sudo`.

---

# Part 2 — SSH keys, then lock the door

⚠️ **Do these in order. Never disable password login before key login works** —
that is how people lock themselves out of their own server.

### Step 5. Create a key on your laptop

**On your laptop**, not the server. Open a new terminal:
```bash
ssh-keygen -t ed25519 -C "<DOMAIN> deploy"
```
Press Enter for the default location. A passphrase is optional but recommended.

✅ Two files now exist: `~/.ssh/id_ed25519` (private — never share) and
`~/.ssh/id_ed25519.pub` (public).

Print the public one:
```bash
cat ~/.ssh/id_ed25519.pub
```
✅ One line starting `ssh-ed25519 AAAA...`. Copy the whole line.

### Step 6. Install the key on the server

Back in the **server** terminal (still root):
```bash
mkdir -p /home/<DEPLOY_USER>/.ssh
nano /home/<DEPLOY_USER>/.ssh/authorized_keys
```
Paste the line. Save with `Ctrl+O`, `Enter`, then exit with `Ctrl+X`.

```bash
chmod 700 /home/<DEPLOY_USER>/.ssh
chmod 600 /home/<DEPLOY_USER>/.ssh/authorized_keys
chown -R <DEPLOY_USER>:<DEPLOY_USER> /home/<DEPLOY_USER>/.ssh
```

✅ Verify:
```bash
ls -la /home/<DEPLOY_USER>/.ssh
```
`authorized_keys` shows `-rw-------` and is owned by `<DEPLOY_USER>`.

### Step 7. Test the key — before changing anything

⚠️ **Keep the root terminal open.** Open a **second terminal on your laptop**:
```bash
ssh <DEPLOY_USER>@<SERVER_IP>
```

✅ You get a prompt as `<DEPLOY_USER>@...:~$` **without being asked for a
password** (a key passphrase prompt is fine — that's your key, not the server).

❌ If it asks for the account password, the key is not installed correctly.
Redo Step 6. **Do not continue until this works.**

### Step 8. Disable root login and password authentication

⚠️ Only if Step 7 succeeded.

In the **root** terminal:
```bash
nano /etc/ssh/sshd_config
```
Find these lines (use `Ctrl+W` to search). Uncomment them if they start with `#`
and set them exactly:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```
Save and exit.

```bash
sshd -t
```
✅ Prints **nothing**. Any output is a syntax error — fix it before continuing,
or SSH will fail to restart.

```bash
systemctl restart ssh
```

✅ Test from a **third** terminal:
```bash
ssh <DEPLOY_USER>@<SERVER_IP>     # must still work
ssh root@<SERVER_IP>              # must now be refused
```
The second should say `Permission denied (publickey)`. That is success.

Now close the root terminal. **Everything after this runs as `<DEPLOY_USER>`,
using `sudo` where needed.**

---

# Part 3 — Firewall and hardening

### Step 9. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```
Answer `y` when it warns about disrupting SSH — you allowed OpenSSH first.

✅ Check:
```bash
sudo ufw status
```
```
Status: active
22/tcp   ALLOW  Anywhere
80/tcp   ALLOW  Anywhere
443/tcp  ALLOW  Anywhere
```
Nothing else should be listed. Port 4000 is deliberately absent — the API is
reachable only through nginx.

### Step 10. fail2ban

Blocks IPs that repeatedly fail to log in.
```bash
sudo apt install -y fail2ban
sudo tee /etc/fail2ban/jail.local > /dev/null <<'EOF'
[sshd]
enabled = true
backend = systemd
maxretry = 5
bantime = 1h
findtime = 10m
EOF
sudo systemctl restart fail2ban
```

✅ Check:
```bash
sudo fail2ban-client status sshd
```
Shows a `Status for the jail: sshd` block with counters at 0. If it errors with
"Failed to access socket", wait five seconds and retry.

### Step 11. Automatic security updates

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```
Choose **Yes** on the prompt.

✅ Check:
```bash
cat /etc/apt/apt.conf.d/20auto-upgrades
```
Both lines must end in `"1";`.

### Step 12. Swap — not needed

Your VPS has 8 GB of RAM. The API idles around 250 MB and PostgreSQL a few
hundred more, so swap would never be touched. Skip this.

*(Only if you ever move to a 1–2 GB server:)*
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

# Part 4 — Install the software

### Step 13. Node.js 22

This project needs Node **20 or 22** — versions 21 and 23 are excluded by Vite.
Use 22, the same version the code was built on.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

✅ Check:
```bash
node -v    # must print v22.something
npm -v     # prints 10.x or 11.x
```
❌ If `node -v` shows v18 or v12, the NodeSource step failed. Re-run it.

### Step 14. PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
```

✅ Check:
```bash
psql --version
sudo systemctl status postgresql --no-pager
```
The version must be **12 or higher** (one migration needs it). Status shows
`active (exited)` — normal for this package; the real service is
`postgresql@<version>-main`, also active.

### Step 15. nginx, certbot, and helpers

```bash
sudo apt install -y nginx certbot python3-certbot-nginx git rsync
```

✅ Check:
```bash
sudo systemctl status nginx --no-pager
```
Shows `active (running)`.

Now open `http://<SERVER_IP>` in a browser: you should see the **"Welcome to
nginx!"** page. That proves DNS-independent connectivity and that the firewall
allows port 80.

### Step 16. pm2

```bash
sudo npm install -g pm2
```

✅ Check:
```bash
pm2 -v
```
Prints a version number like `6.x`.

---

# Part 5 — Database

### Step 17. Create the database and a limited user

```bash
sudo -u postgres psql
```
The prompt becomes `postgres=#`. Paste these one at a time, replacing
`<DB_PASSWORD>`:

```sql
CREATE ROLE codeboujida_app WITH LOGIN PASSWORD '<DB_PASSWORD>'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

CREATE DATABASE codeboujida OWNER codeboujida_app ENCODING 'UTF8' TEMPLATE template0;

REVOKE ALL ON DATABASE codeboujida FROM PUBLIC;
GRANT CONNECT ON DATABASE codeboujida TO codeboujida_app;
```
Each should answer `CREATE ROLE`, `CREATE DATABASE`, `REVOKE`, `GRANT`.

Switch into the new database and lock its schema:
```sql
\c codeboujida
ALTER SCHEMA public OWNER TO codeboujida_app;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO codeboujida_app;
```

✅ Confirm the user has no dangerous rights:
```sql
\du
```
The `codeboujida_app` row's "Attributes" column must be **empty**. If it says
Superuser or Create DB, drop the role and redo it.

Exit with:
```sql
\q
```

✅ Final check — log in as the app user:
```bash
psql "postgresql://codeboujida_app:<DB_PASSWORD>@127.0.0.1:5432/codeboujida" -c "SELECT current_user, current_database();"
```
Prints `codeboujida_app | codeboujida`. If it says password authentication
failed, the password in this command doesn't match Step 17.

---

# Part 6 — The code

### Step 18. Clone the repository

```bash
sudo mkdir -p /var/www
sudo chown <DEPLOY_USER>:<DEPLOY_USER> /var/www
git clone https://github.com/Magueri09salah/claude-setup.git /var/www/codeboujida
```

**If the repo is private**, this asks for credentials. Instead, create a key on
the server and add it to GitHub:
```bash
ssh-keygen -t ed25519 -C "vps deploy key"     # Enter through all prompts
cat ~/.ssh/id_ed25519.pub
```
Copy that line into GitHub → your repo → Settings → Deploy keys → Add deploy key
(read access is enough). Then clone with SSH:
```bash
git clone git@github.com:Magueri09salah/claude-setup.git /var/www/codeboujida
```

✅ Check:
```bash
ls /var/www/codeboujida
```
You should see `api  admin  mobile  nginx  scripts  ecosystem.config.js`.

### Step 19. Create the log and backup directories

`ecosystem.config.js` writes logs to a fixed path, so it must exist first.
```bash
sudo mkdir -p /var/log/codeboujida /var/backups/codeboujida
sudo chown <DEPLOY_USER>:<DEPLOY_USER> /var/log/codeboujida /var/backups/codeboujida
sudo chmod 700 /var/backups/codeboujida
```

✅ Check:
```bash
ls -ld /var/log/codeboujida /var/backups/codeboujida
```
Both owned by `<DEPLOY_USER>`; the backups directory shows `drwx------`.

### Step 20. Make the scripts executable

```bash
chmod +x /var/www/codeboujida/scripts/*.sh
```
✅ `ls -l /var/www/codeboujida/scripts/` shows `-rwxr-xr-x` on both files.

---

# Part 7 — Configuration

### Step 21. Start from the template

```bash
cd /var/www/codeboujida/api
cp .env.production.example .env
chmod 600 .env
```
✅ `ls -l .env` shows `-rw-------`. Only your user can read it.

### Step 22. Generate the three secrets

Run this **three times**, once per secret, and keep the outputs separate:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
✅ Each prints a different 64-character hex string.

### Step 23. Fill in the file

```bash
nano .env
```

Set these values. Everything else in the file is already correct.

| Line | Value |
|---|---|
| `DATABASE_URL` | `postgresql://codeboujida_app:<DB_PASSWORD>@127.0.0.1:5432/codeboujida?schema=public` |
| `DIRECT_DATABASE_URL` | **the same string again** |
| `JWT_ACCESS_SECRET` | first generated secret |
| `JWT_REFRESH_SECRET` | second — must differ from the first |
| `MEDIA_SIGNING_SECRET` | third |
| `APP_BASE_URL` | `https://<DOMAIN>/api` — the `/api` part is required |
| `R2_ACCOUNT_ID` | `<R2_ACCOUNT_ID>` |
| `R2_ACCESS_KEY_ID` | `<R2_ACCESS_KEY_ID>` |
| `R2_SECRET_ACCESS_KEY` | `<R2_SECRET_ACCESS_KEY>` |
| `R2_BUCKET` | `<R2_BUCKET>` |
| `SEED_ADMIN_EMAIL` | `<ADMIN_EMAIL>` |
| `SEED_ADMIN_PASSWORD` | `<ADMIN_PASSWORD>` |

Leave `CORS_ORIGINS`, `MOCK_WEBHOOK_SECRET` and `ALLOW_LOCAL_STORAGE` **empty**,
and leave `NODE_ENV=production`, `PAYMENTS_ENABLED=false`,
`SEED_DEMO_CONTENT=false` as they are.

Save with `Ctrl+O`, `Enter`, `Ctrl+X`.

✅ Check nothing was left as a placeholder:
```bash
grep -n "<" .env
```
Prints **nothing**. Any output is a value you forgot to replace.

### Step 24. The admin panel needs no configuration

```bash
cd /var/www/codeboujida/admin
cp .env.production.example .env
```
Leave `VITE_API_URL` empty. The panel then calls the relative `/api` on whatever
domain it was loaded from — which is exactly right here.

---

# Part 8 — Build and initialise

### Step 25. Install and build the API

```bash
cd /var/www/codeboujida/api
npm ci
```
Takes 1–3 minutes.

✅ Ends with `added NNN packages`. Warnings about deprecated packages are normal;
**`npm error` is not**.

```bash
npx prisma generate
```
✅ `Generated Prisma Client (v6.x) to ./node_modules/@prisma/client`.

### Step 26. Create the tables

```bash
npx prisma migrate deploy
```
✅ Lists 19 migrations and ends with **`All migrations have been successfully
applied.`**

❌ `P1012` means `DIRECT_DATABASE_URL` is empty — go back to Step 23.
❌ `P1000` means the database password is wrong.

### Step 27. Create your admin account

```bash
npx prisma db seed
```
✅ Prints:
```
Seeded: admin <ADMIN_EMAIL> (demo content skipped — set SEED_DEMO_CONTENT=true to include it)
```
"demo content skipped" is what you want — production starts empty.

❌ If it says `SEED_ADMIN_PASSWORD is required`, that line is empty in `.env`.

⚠️ This is the only account that can reach the panel. If you mistype the
password here, fix `.env` and run the command again — it updates the existing
account rather than creating a second one.

### Step 28. Compile the API

```bash
npm run build
```
✅ Silent success. Confirm the output exists:
```bash
ls dist/index.js
```

### Step 29. Build the admin panel

```bash
cd /var/www/codeboujida/admin
npm ci
npm run build
```
The build takes about a minute. A warning that chunks are larger than 500 kB is
expected — ignore it.

✅ Confirm the assets carry the `/admin/` prefix:
```bash
grep -o 'src="[^"]*"' dist/index.html
```
Must print `src="/admin/assets/index-....js"`. If the path lacks `/admin/`, the
panel will render blank — stop and tell me.

---

# Part 9 — Run the API

### Step 30. Start it

```bash
cd /var/www/codeboujida
pm2 start ecosystem.config.js
```
✅ A table appears with `codeboujida-api`, status **online**, ↺ (restarts) **0**.

❌ Status `errored` means the app crashed on boot. See Step 31 — the log names
the exact cause, usually a missing `.env` value.

### Step 31. Read the startup line

```bash
pm2 logs codeboujida-api --lines 20 --nostream
```
✅ You are looking for exactly this:
```
API listening on 127.0.0.1:4000 (env: production, storage: r2, payments: disabled)
```
Every part matters:
- `127.0.0.1` — not reachable from the internet directly ✅
- `env: production` ✅
- **`storage: r2`** — if this says `local`, an R2 value is wrong ✅
- `payments: disabled` ✅

### Step 32. Test the API locally

```bash
curl http://127.0.0.1:4000/health
```
✅ `{"ok":true,"storage":"r2"}`

### Step 33. Survive a reboot

```bash
pm2 startup
```
This **prints a command** starting with `sudo env PATH=...`. Copy that entire
line and run it.

```bash
pm2 save
```
✅ `Successfully saved in /home/<DEPLOY_USER>/.pm2/dump.pm2`.

---

# Part 10 — nginx

### Step 34. Install the site config

```bash
sudo cp /var/www/codeboujida/nginx/codeboujida.conf /etc/nginx/sites-available/codeboujida
sudo ln -sf /etc/nginx/sites-available/codeboujida /etc/nginx/sites-enabled/codeboujida
sudo rm -f /etc/nginx/sites-enabled/default
```
The last line removes the "Welcome to nginx" placeholder site. ⚠️ Only that
symlink is deleted; the original file stays in `sites-available`.

### Step 35. Let nginx read the panel

nginx runs as `www-data` and must be able to traverse into your home-less app
directory:
```bash
sudo chmod o+x /var/www /var/www/codeboujida /var/www/codeboujida/admin
```

### Step 36. Test and reload

```bash
sudo nginx -t
```
✅ Exactly:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```
❌ Any other output is a syntax error with a line number. Fix it before
reloading — reloading a broken config leaves the old one running, but you will
think your change took effect.

```bash
sudo systemctl reload nginx
```

✅ Test over plain HTTP:
```bash
curl -i http://<DOMAIN>/api/health
```
Look for `HTTP/1.1 200 OK` and `{"ok":true,"storage":"r2"}`.

```bash
curl -i -o /dev/null -s -w "%{http_code} %{redirect_url}\n" http://<DOMAIN>/
```
✅ `302 http://<DOMAIN>/admin/`

---

# Part 11 — HTTPS

### Step 37. Get the certificate

```bash
sudo certbot --nginx -d <DOMAIN> -d www.<DOMAIN>
```
It asks for an email (for expiry warnings), the terms of service (`Y`), and
optionally a mailing list (`N`).

✅ `Congratulations! You have successfully enabled HTTPS on https://<DOMAIN>`

❌ "Timeout during connect" or "DNS problem" means the `www` record from the
prerequisites is missing or hasn't propagated. Wait, then re-run.

Certbot edits your nginx config in place, adding the certificate lines and an
HTTP→HTTPS redirect. You don't need to change anything yourself.

### Step 38. Confirm renewal is automatic

```bash
sudo systemctl status certbot.timer --no-pager
sudo certbot renew --dry-run
```
✅ The timer is `active (waiting)`, and the dry run ends with
`Congratulations, all simulated renewals succeeded`.

Certificates last 90 days and renew automatically at about 60.

---

# Part 12 — Backups

### Step 39. Run one by hand first

```bash
/var/www/codeboujida/scripts/backup.sh
```
✅ Output ends with `ok — <size>` and `on disk: 1 backup(s)`. The size will be
small (a nearly empty database) but must be more than 1 KB — the script fails
loudly below that.

### Step 40. Schedule it nightly

```bash
crontab -e
```
Choose nano if asked. Add this line at the bottom:
```cron
15 3 * * * /var/www/codeboujida/scripts/backup.sh >> /var/log/codeboujida/backup.log 2>&1
```
Save and exit.

✅ Check:
```bash
crontab -l
```
Your line is listed. It runs at 03:15 UTC daily and keeps 14 days of dumps.

--- // tobe check after

# Post-deploy checklist

Run these in order. Every one should pass before you call it done.

**1. API answers over HTTPS**
```bash
curl -s https://<DOMAIN>/api/health
```
✅ `{"ok":true,"storage":"r2"}`

**2. HTTP redirects to HTTPS**
```bash
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://<DOMAIN>/api/health
```
✅ `301 -> https://<DOMAIN>/api/health`

**3. Root redirects to the panel**
```bash
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://<DOMAIN>/
```
✅ `302 -> https://<DOMAIN>/admin/`

**4. The panel's HTML loads**
```bash
curl -s https://<DOMAIN>/admin/ | head -5
```
✅ HTML containing `<div id="root">`.

**5. Its assets load** — this is the one that catches a wrong base path
```bash
ASSET=$(curl -s https://<DOMAIN>/admin/ | grep -o '/admin/assets/[^"]*\.js' | head -1)
echo "$ASSET"
curl -s -o /dev/null -w "%{http_code}\n" "https://<DOMAIN>$ASSET"
```
✅ A path starting `/admin/assets/`, then `200`.

**6. Deep links survive a refresh**
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<DOMAIN>/admin/users
```
✅ `200` (nginx serves index.html and the router takes over). A `404` means the
SPA fallback is wrong.

**7. Login works**
```bash
curl -s -X POST https://<DOMAIN>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"<ADMIN_EMAIL>","password":"<ADMIN_PASSWORD>"}' | head -c 120
```
✅ JSON containing `accessToken`.
❌ `{"error":"..."}` means the seed used different credentials — re-run Step 27.

**8. The mock payment routes are gone**
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://<DOMAIN>/api/mock-pay/x/complete
```
✅ `404`. Anything else means `PAYMENTS_ENABLED` is not false.

**9. Direct port access is blocked**
```bash
curl -s -m 5 http://<SERVER_IP>:4000/health
```
✅ Fails to connect. The API must only be reachable through nginx.

**10. In a browser:** open `https://<DOMAIN>/admin`, log in, and confirm the
padlock icon shows. Upload one question image, then check the Cloudflare R2
dashboard — an object should appear under `questions/`.

**11. It survives a reboot**
```bash
sudo reboot
```
Wait a minute, reconnect, then:
```bash
pm2 status
curl -s https://<DOMAIN>/api/health
```
✅ `codeboujida-api` is online again and health responds.

---

# Deploying an update later

On your laptop: commit and push. Then:

```bash
ssh <DEPLOY_USER>@<SERVER_IP>
cd /var/www/codeboujida
./scripts/deploy.sh
```

The script pulls, installs, runs migrations, rebuilds both packages, reloads pm2
and checks health. It is safe to run repeatedly and stops at the first error
without leaving a half-deployed server.

✅ Ends with `Deploy complete`.

⚠️ **If the update includes a database migration**, take a backup first:
```bash
./scripts/backup.sh && ./scripts/deploy.sh
```

**After changing `api/.env`**, the script is not needed — just:
```bash
pm2 reload ecosystem.config.js --update-env
```

**After changing `admin/.env`**, you must rebuild — Vite bakes those values in:
```bash
cd admin && npm run build
```

---

# Reading logs

| What | Command |
|---|---|
| API output (yours) | `pm2 logs codeboujida-api --lines 100` |
| API errors only | `tail -100 /var/log/codeboujida/api.error.log` |
| Is it running / restarting? | `pm2 status` — watch the ↺ column |
| nginx errors | `sudo tail -100 /var/log/nginx/error.log` |
| nginx traffic | `sudo tail -100 /var/log/nginx/access.log` |
| PostgreSQL | `sudo tail -100 /var/log/postgresql/postgresql-*-main.log` |
| Backups | `tail -50 /var/log/codeboujida/backup.log` |
| Blocked SSH attempts | `sudo fail2ban-client status sshd` |
| Live traffic as it happens | `sudo tail -f /var/log/nginx/access.log` |

`pm2 logs` streams until you press `Ctrl+C`. Add `--nostream` to print and exit.

A rising ↺ count in `pm2 status` means the app is crash-looping. Read
`api.error.log` — the reason is always in the last few lines.

---

# The five most likely failures

### 1. `502 Bad Gateway` on every page

**Cause:** the API isn't running. nginx is fine; it has nothing to talk to.

```bash
pm2 status                                   # is it online?
tail -30 /var/log/codeboujida/api.error.log  # why did it stop?
```
Nearly always a bad value in `api/.env`. The app names the variable it rejected.
Fix it, then `pm2 restart codeboujida-api`.

### 2. The panel is blank, or a white page with no error

**Cause:** JavaScript files are 404ing — a base-path or permissions problem.

Open the browser console (F12). If you see 404s for `/assets/...` **without**
`/admin/`, the panel was built with the wrong base: rebuild with
`cd /var/www/codeboujida/admin && npm run build`.

If the paths are right but still 404, nginx cannot read the folder — re-run
Step 35, then `sudo tail -20 /var/log/nginx/error.log` and look for "Permission
denied".

### 3. The panel loads but every button fails

**Cause:** the API is unreachable from the browser.

```bash
curl -s https://<DOMAIN>/api/health
```
If that fails, the `location /api/` block isn't working — check
`sudo nginx -t` and that you copied the config from the repo unmodified. The
trailing slash in `proxy_pass http://127.0.0.1:4000/;` is what strips the `/api`
prefix; without it every route 404s.

### 4. Uploads fail, or images don't appear

**Cause A — storage:** run `curl -s https://<DOMAIN>/api/health`. If it says
`"storage":"local"`, an R2 value is wrong. Fix `.env` and
`pm2 reload ecosystem.config.js --update-env`.

**Cause B — size:** a `413` error means the file exceeded nginx's limit. The
supplied config allows 512 MB (`client_max_body_size`). If you changed it, put
it back.

### 5. `prisma migrate deploy` fails

- **`P1012`** — `DIRECT_DATABASE_URL` is empty. It must repeat `DATABASE_URL`.
- **`P1000`** — wrong database password.
- **`P1001`** — PostgreSQL isn't running: `sudo systemctl status postgresql`.
- **"already exists"** — the database isn't empty. ⚠️ Do **not** run
  `migrate reset`; it deletes everything. Back up first, then ask for help.

---

# Afterwards: the mobile app

The phone app talks to the API directly, so it needs rebuilding to reach the new
address. `mobile/eas.json` already points its production profile at
`https://<DOMAIN>/api`.

```bash
cd mobile
eas build --profile production --platform android
```

Installed test builds keep calling your old LAN address until they are replaced.
