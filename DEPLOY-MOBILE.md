# Publishing codeboujida on Google Play

Written for someone who has never published an app before. Every command says
**where** you run it and **why**. Every Console step says **what to click**.

Follow it top to bottom. Do not skip a step because it looks obvious — the
skipped ones are what cause rejections.

> **iOS is not in this guide.** Do Android first, get it live, then come back
> for Part 15.

---

## What you are actually doing

Your app's code lives on your laptop. Google needs a **signed app file** built
from that code. You don't build it on your laptop — **Expo's servers (EAS)**
build it for you and hand you a file. You upload that file to the **Play
Console**, fill in a lot of forms about privacy, and Google reviews it.

```
your laptop  ──push──▶  GitHub  ──▶  EAS builds it  ──▶  .aab file
                                                            │
                                                            ▼
                                              Play Console (forms + upload)
                                                            │
                                                            ▼
                                                   Google review → live
```

**Time:** about 3 hours of work, spread over 2–7 days of waiting (identity
verification, then review).

**Cost:** $25 once, to Google. Expo and Firebase are free at your size.

---

## The three places you will work

Everything in this guide happens in one of these. When a step starts, it tells
you which.

| | Where | How to open it |
|---|---|---|
| 💻 **LAPTOP** | A terminal on your Windows machine, inside the `mobile` folder | Open PowerShell or Git Bash, then `cd C:\Users\T14s\Desktop\claude-setup\claude-setup\mobile` |
| 🖥️ **SERVER** | A terminal connected to your VPS | `ssh <DEPLOY_USER>@76.13.63.111` |
| 🌐 **BROWSER** | Play Console, Expo, or Firebase websites | Links given in each step |

⚠️ **The most common beginner mistake** is running a laptop command on the
server or vice-versa. Check the icon before every command.

---

## Placeholders

| Placeholder | What it is | Yours |
|---|---|---|
| `<DEPLOY_USER>` | Your Linux user on the VPS | |
| `<EXPO_EMAIL>` | Email for your Expo account | |
| `<GOOGLE_ACCOUNT>` | Google account that will own the app ⚠️ permanent | |
| `<DEMO_PHONE>` | Phone number of the account you give Google | |
| `<DEMO_PASSWORD>` | Its password | |

Already decided in the code — **do not change these**:

| | |
|---|---|
| App name | **codeboujida** |
| Package name | **com.codeboujida.app** ⚠️ permanent forever |
| Expo owner / slug | **codeboujida** |
| API the app calls | `https://codeboujida.com/api` |
| Privacy policy URL | `https://codeboujida.com/legal/privacy.html` |
| Account deletion URL | `https://codeboujida.com/legal/account-deletion.html` |

---

# PART 1 — Update your server first

**Why now:** the app has a "delete my account" button, and Google will open the
deletion web page during review. Both were added after your last deploy, so
right now the page returns 404 and the button would fail. Google rejects apps
for exactly this.

### Step 1.1 — Connect to the server

🖥️ **SERVER** — from your laptop terminal:
```bash
ssh <DEPLOY_USER>@76.13.63.111
```
✅ Your prompt changes to something like `salah@srv:~$`.

### Step 1.2 — Go to the project folder

🖥️ **SERVER**
```bash
cd /var/www/codeboujida
```
**Why:** all the code lives here. Git commands only work inside it.

### Step 1.3 — Download the new code

🖥️ **SERVER**
```bash
git pull --ff-only
```
**Why:** brings the account-deletion feature from GitHub onto the server.
`--ff-only` refuses to merge — if it complains, the server has local edits and
you should stop and ask, not force it.

✅ You should see file names scrolling past, including
`api/public/account-deletion.html`.
If it says `Already up to date.`, the code was already pulled — carry on.

### Step 1.4 — Install any new libraries

🖥️ **SERVER**
```bash
cd /var/www/codeboujida/api
npm ci
```
**Why:** `npm ci` installs the exact library versions the code expects. Today's
change adds no new libraries, but running it keeps the folder consistent and
takes a minute.

✅ Ends with `added NNN packages`. Warnings about "deprecated" are normal.

### Step 1.5 — Rebuild the API

🖥️ **SERVER**
```bash
npm run build
```
**Why:** the server runs compiled JavaScript, not the TypeScript you wrote.
Without this, your new code exists on disk but is never executed.

✅ Silent success. Check the file was produced:
```bash
ls -l dist/index.js
```

### Step 1.6 — Apply database changes

🖥️ **SERVER**
```bash
npx prisma migrate deploy
```
**Why:** applies any new database tables. Today there are none, but running it
is how you find that out safely.

✅ `No pending migrations to apply.` — that is the expected answer today.

### Step 1.7 — Restart the API

🖥️ **SERVER**
```bash
cd /var/www/codeboujida
pm2 reload ecosystem.config.js --update-env
```
**Why:** the old code is still in memory. `reload` swaps it for the new build
without dropping requests.

✅ A table appears with `codeboujida-api` and status **online**.

### Step 1.8 — Prove it worked

🖥️ **SERVER**
```bash
curl -s -o /dev/null -w "deletion page: %{http_code}\n" https://codeboujida.com/legal/account-deletion.html
curl -s -o /dev/null -w "delete route:  %{http_code}\n" -X DELETE https://codeboujida.com/api/auth/me
curl -s https://codeboujida.com/api/health
```

✅ You need exactly:
```
deletion page: 200
delete route:  401
{"ok":true,"storage":"r2"}
```

- **200** = Google can read the deletion page ✅
- **401** = the delete route exists and correctly refuses a stranger ✅
  (404 here means the code didn't land — repeat 1.3 to 1.7)
- **storage: r2** = media is going to Cloudflare, not the server disk ✅

### Step 1.9 — Leave the server

🖥️ **SERVER**
```bash
exit
```
**Everything from here on is on your laptop or in a browser.**

---

# PART 2 — Your Expo account

**What Expo/EAS is:** a service that compiles your app on their computers.
You avoid installing Android Studio, the Java SDK and 20 GB of tooling.

### Step 2.1 — Create the account

🌐 **BROWSER** → [expo.dev/signup](https://expo.dev/signup)

- Sign up with `<EXPO_EMAIL>`
- ⚠️ **Username must be exactly `codeboujida`** — your `app.json` says
  `"owner": "codeboujida"`, and a mismatch fails every build.
- Confirm the verification email.

✅ Log in at [expo.dev](https://expo.dev) and check the username shown top-right
is `codeboujida`.

### Step 2.2 — Install the build tool

💻 **LAPTOP** — any folder, this installs globally:
```bash
npm install -g eas-cli
```
**Why:** `eas` is the command that talks to Expo's build servers.

✅ Check:
```bash
eas --version
```
Prints a version number. If it says "command not found", close the terminal and
open a new one — Windows needs it reopened after a global install.

### Step 2.3 — Log in

💻 **LAPTOP**
```bash
eas login
```
Enter your Expo email and password.

✅ Confirm:
```bash
eas whoami
```
Must print **`codeboujida`**. If it prints anything else, run `eas logout` and
log in with the right account — this is checked against `app.json` on every
build.

---

# PART 3 — Connect your code to Expo

### Step 3.1 — Go to the mobile folder

💻 **LAPTOP**
```bash
cd C:\Users\T14s\Desktop\claude-setup\claude-setup\mobile
```
⚠️ **Every command from here to Part 7 runs in this folder.** EAS reads
`app.json` and `eas.json` from the current directory; run it one level up and it
finds nothing.

### Step 3.2 — Create the Expo project

💻 **LAPTOP**
```bash
eas init
```
It asks: *"Would you like to create a project for @codeboujida/codeboujida?"* →
**Yes**.

**Why:** this creates a project on Expo's side and writes its unique ID into
your `app.json`. The old ID was deliberately removed because it belonged to a
different Expo account — push notifications sent with someone else's project ID
never arrive.

✅ Check the ID landed:
```bash
node -p "require('./app.json').expo.extra.eas.projectId"
```
Prints a long id like `a1b2c3d4-....`

### Step 3.3 — Save that change ⚠️ important

💻 **LAPTOP**
```bash
git add app.json
git commit -m "mobile: link EAS project"
git push
```

**Why this matters:** EAS builds from your **committed** code, not from the
files on your disk. Uncommitted changes are invisible to the build. Forget this
and you'll spend an hour wondering why your fix isn't in the app.

✅ `git status` prints `nothing to commit, working tree clean`.

---

# PART 4 — Push notifications (Firebase)

**Why:** Android requires Google's own delivery service (FCM) to wake an app.
Expo forwards your notifications to it, but only if you give Expo a key.

Skip this and the app works fine — the daily live-broadcast alert simply never
arrives. **Do it now**, because adding it later needs a new build.

### Step 4.1 — Create a Firebase project

🌐 **BROWSER** → [console.firebase.google.com](https://console.firebase.google.com)

1. **Create a project**
2. Name: `codeboujida` → **Continue**
3. Google Analytics: toggle **off** (you don't need it) → **Create project**
4. Wait for it, then **Continue**

### Step 4.2 — Register the Android app

🌐 **BROWSER** — in the project, on the overview page:

1. Click the **Android** icon (a robot)
2. **Android package name:** `com.codeboujida.app` — ⚠️ exactly this, it must
   match your app or notifications go nowhere
3. App nickname: `codeboujida`
4. Skip the SHA-1 field
5. **Register app**
6. It offers `google-services.json` — you can download it, but **you don't need
   it**; EAS handles this. Click through **Next → Next → Continue to console**.

### Step 4.3 — Create the key Expo needs

🌐 **BROWSER** — in Firebase:

1. Click the **⚙️ gear** next to "Project Overview" → **Project settings**
2. Open the **Service accounts** tab
3. Click **Generate new private key** → confirm **Generate key**
4. A `.json` file downloads

⚠️ **That file is a password to your Firebase project.** Never put it in the
repo. Keep it with your other secrets; delete it from Downloads afterwards.

### Step 4.4 — Give the key to Expo

💻 **LAPTOP** — in the `mobile` folder:
```bash
eas credentials
```

Answer the menu:
1. Platform → **Android**
2. Build profile → **production**
3. → **Google Service Account**
4. → **Manage your Google Service Account Key for Push Notifications (FCM V1)**
5. → **Set up a Google Service Account Key**
6. Give it the path to the `.json` file you downloaded, e.g.
   `C:\Users\T14s\Downloads\codeboujida-firebase-adminsdk-xxxxx.json`

✅ The menu then shows a configured FCM V1 key. Press `Ctrl+C` to exit.

---

# PART 5 — Check everything before building

💻 **LAPTOP** — in the `mobile` folder.

### Step 5.1 — Does the code compile?

```bash
npx tsc --noEmit
```
**Why:** catches type errors now, in 30 seconds, instead of 20 minutes into a
cloud build.

✅ Prints nothing at all. Any output is an error to fix first.

### Step 5.2 — Is the configuration right?

```bash
node -e "const c=require('./app.json').expo; console.log(c.name,'|',c.owner,'|',c.android.package,'|',c.android.permissions.join(','))"
node -e "console.log(require('./eas.json').build.production.env.EXPO_PUBLIC_API_URL)"
```

✅ Expect exactly:
```
codeboujida | codeboujida | com.codeboujida.app | POST_NOTIFICATIONS,RECEIVE_BOOT_COMPLETED
https://codeboujida.com/api
```

❌ If you see `RECORD_AUDIO`, you are on old code — `git pull` on your laptop.
That permission alone gets the app rejected, because nothing in it records
audio.

### Step 5.3 — Is everything committed?

```bash
git status
```
✅ `working tree clean`. If not, commit and push — see Step 3.3 for why.

---

# PART 6 — Build a test version, and set up the reviewer account

⚠️ **Do not build the Play version yet.** The Play file (`.aab`) cannot be
installed on a phone directly, so you cannot test it. Build an installable APK
from identical code first.

### Step 6.1 — Start the test build

💻 **LAPTOP**
```bash
eas build --profile preview --platform android
```

**Why `preview`:** that profile produces an `.apk` you can install by hand, and
it points at your real server `https://codeboujida.com/api`.

The first Android build asks:
> *Generate a new Android Keystore?* → **Yes**

⚠️ **What a keystore is:** the signing identity of your app. Google only accepts
updates signed with the same one, **forever**. EAS stores it for you.

### Step 6.2 — Wait

The terminal prints a link like `https://expo.dev/accounts/codeboujida/...`.
Building takes **10–25 minutes**. You can close the terminal — the build runs on
Expo's servers, and the link shows progress.

✅ Ends with `Build successful` and a download link.

### Step 6.3 — Back up the keystore ⚠️ do this once

💻 **LAPTOP**
```bash
eas credentials
```
Android → **preview** → **Keystore** → **Download existing keystore**.

Store the file and the printed passwords with your other secrets.

**Why:** if your Expo account is ever lost, this file is the only thing that
lets you keep updating your published app. Without it you must publish a brand
new listing and every user has to reinstall.

### Step 6.4 — Install it on a real Android phone

🌐 **BROWSER on the phone** — open the build link, tap the download, and allow
"install from unknown sources" when Android asks.

**Why a real phone:** an emulator won't show you notification delivery, RTL
rendering with real Arabic fonts, or how the app behaves offline.

### Step 6.5 — Test it properly

📱 **ON THE PHONE** — tick every box:

- [ ] The icon under the app is named **codeboujida**
- [ ] **No microphone permission** is ever requested
- [ ] Register a new account — it succeeds (this proves it reaches your server)
- [ ] Content downloads on first launch
- [ ] Open a series, answer questions, finish, see results
- [ ] Turn on **airplane mode** → the quiz still works (it's offline-first)
- [ ] Settings → **مدة كل سؤال** → choose **بدون مؤقت** → start a quiz →
      **no countdown appears and it never auto-submits**
- [ ] Settings → **حذف حسابي نهائياً** → confirm → you are signed out, and that
      account can no longer log in
- [ ] A locked series shows **مقفل** and opens the WhatsApp screen — with **no
      price and no payment wording anywhere**

✅ If anything fails here, fix it before Part 7. Fixing an app after it is on
the store takes days instead of minutes.

---

## The account you will give to Google

Now that the app runs on a phone, create the account Google's reviewer will use.

**What it is:** an ordinary student account in your own app — one phone number
and one password, exactly like a real candidate creates. Nothing to do with your
Google or Expo accounts. You unlock it yourself from the admin panel, then type
those two values into a Play Console form in Step 10.2.

**Why it decides whether you pass review:** your app hides its content behind a
lock only you can open. A reviewer who registers normally sees empty screens,
concludes the app is broken, and rejects it. This is the single most common
reason a first submission fails.

### Step 6.6 — Register the account

📱 **ON THE PHONE**, in the app you just installed — tap **إنشاء حساب**:

| Field | Value |
|---|---|
| اسم المستخدم | `googleplay` |
| رقم الهاتف | `0600000000` |
| كلمة المرور | a password you choose (8+ characters) |
| آخر 3 أرقام من البطاقة | `123` |

The phone number is **never verified by SMS**, so it does not have to be a real
line you own.

✅ You land in the app, logged in, with everything locked.

**Write these down** — Step 10.2 needs them:
```
<DEMO_PHONE>    = 0600000000
<DEMO_PASSWORD> = the one you just chose
```

*(If you would rather not type on the phone, the same account can be created
from 💻 **LAPTOP** with one command:)*
```bash
curl.exe -s -X POST https://codeboujida.com/api/auth/register -H "Content-Type: application/json" -d "{\"username\":\"googleplay\",\"phone\":\"0600000000\",\"password\":\"CHANGEME123\",\"cinLast3\":\"123\"}"
```
On Windows use `curl.exe`, not `curl` — in PowerShell plain `curl` is a
different command and fails confusingly. Success prints JSON containing
`"accessToken"`.

### Step 6.7 — Unlock it from your admin panel

🌐 **BROWSER** → `https://codeboujida.com/admin`

1. Log in with your admin email and password
2. Left menu → **المجموعة المجانية**
3. Click **إضافة أرقام**
4. Paste `0600000000` into the box
5. In the note field type: `Google Play review`
6. Click **إضافة**

**Why this works:** adding a number to that list grants full access to whoever
registered with it — which you just did.

✅ The number appears in the table, and the **الحساب** column shows the
`googleplay` account.

### Step 6.8 — Prove the reviewer will see content

📱 **ON THE PHONE** — still logged in as `googleplay`:

- [ ] Pull down to refresh / reopen the app so it re-syncs
- [ ] Open a series that was **مقفل** a moment ago — **it must open now**
- [ ] A lesson and the practical videos open too

✅ If this works, the reviewer's experience will work. If it does not, they will
reject the app — do not continue until it does.

⚠️ **Access lasts 3 months.** Put a reminder in your calendar: if it expires,
your next update is rejected because the reviewer gets locked out. Renewing is
one click — admin → **المستخدمون** → **تجديد 3 أشهر**.

---

# PART 7 — Build the file for Google

### Step 7.1 — Build it

💻 **LAPTOP** — in the `mobile` folder:
```bash
eas build --profile production --platform android
```

**Why a different profile:** this one produces an **`.aab`** (Android App
Bundle), the only format Google Play accepts, and it automatically increments
the version number so it can never collide with something already uploaded.

✅ 10–25 minutes, then `Build successful`.

### Step 7.2 — Download it

🌐 **BROWSER** — open the build link → **Download**. You get a file ending in
`.aab`. Remember where it saved.

---

# PART 8 — Create your Google Play developer account

### Step 8.1 — Register

🌐 **BROWSER** → [play.google.com/console](https://play.google.com/console)

1. Sign in with `<GOOGLE_ACCOUNT>` — ⚠️ **this account owns the app forever and
   cannot be transferred to another person.** Use the one that should own the
   business.
2. Choose account type: **Personal** or **Organisation**
   - **Organisation** requires a D-U-N-S number and takes longer
   - **Personal** is fine for a first launch
3. Pay the **$25** one-time fee
4. Complete identity verification (ID document, address)

⚠️ **Verification can take 1–3 days.** Start this early — you can do Parts 1–8
while waiting.

✅ You reach the Play Console dashboard with a "Create app" button.

---

# PART 9 — Create the app listing

### Step 9.1 — Create the app

🌐 **BROWSER** → Play Console → **Create app** (top right)

| Field | Value |
|---|---|
| App name | `codeboujida` |
| Default language | `العربية (ar)` |
| App or game | **App** |
| Free or paid | **Free** ⚠️ permanent — a free app can never become paid |

Tick both declarations, then **Create app**.

✅ You land on the app dashboard with a task list.

### Step 9.2 — Understand the dashboard

Google shows two groups of tasks. You must finish **all** of them:

- **Set up your app** — the policy forms (Part 10)
- **Create and publish a release** — uploading your file (Part 11)

Work through them in the order below, not the order Google shows.

---

# PART 10 — The forms (this is where people get stuck)

🌐 **BROWSER** — all of these are under **Policy → App content** in the left
menu, unless stated otherwise.

### Step 10.1 — Privacy policy

**App content** → **Privacy policy** → **Start**

Paste:
```
https://codeboujida.com/legal/privacy.html
```
**Save.**

### Step 10.2 — App access ⚠️ the critical one

**App content** → **App access** → **Start**

1. Choose **All or some functionality is restricted**
2. Click **Add new instructions**
3. Fill in:
   - Name: `Full content access`
   - Username: `<DEMO_PHONE>` — the values you wrote down in Step 6.6
   - Password: `<DEMO_PASSWORD>`
   - Any other instructions:
     ```
     Log in with the phone number and password above.
     Full content is already enabled on this account by the driving school.
     Content is in Arabic. The app works offline after the first sync.
     ```
4. **Add** → **Save**

**Why:** without this the reviewer cannot see your locked content and rejects
the app.

### Step 10.3 — Ads

**App content** → **Ads** → **Start** → **No, my app does not contain ads** →
**Save**.

### Step 10.4 — Content rating

**App content** → **Content rating** → **Start**

1. Enter your email
2. Category: **Reference, News, or Educational**
3. Answer the questionnaire — for this app everything is **No**: no violence, no
   sexual content, no profanity, no drugs, no gambling, no user-generated
   content, no location sharing
4. **Save** → **Submit**

✅ You receive ratings like PEGI 3 / Everyone.

### Step 10.5 — Target audience

**App content** → **Target audience and content** → **Start**

1. Age groups: tick **18 and over** only
   **Why:** a driving-licence app is for adults. Ticking a child age group
   triggers Google's Families policy, which is a much stricter review.
2. "Appeal to children": **No**
3. **Save**

### Step 10.6 — Data safety ⚠️ be accurate

**App content** → **Data safety** → **Start**

Answer:

| Question | Answer |
|---|---|
| Does your app collect or share user data? | **Yes** |
| Is all data encrypted in transit? | **Yes** |
| Do you provide a way to request data deletion? | **Yes** |
| Deletion URL | `https://codeboujida.com/legal/account-deletion.html` |

Then tick these data types:

| Category | Type | Collected | Shared | Purpose |
|---|---|---|---|---|
| Personal info | **Name** (the username) | Yes | No | Account management |
| Personal info | **Phone number** | Yes | No | Account management |
| Personal info | **Other info** (3 digits of ID card) | Yes | No | Account management |
| App activity | **Other actions** (quiz results) | Yes | No | App functionality |
| Device IDs | **Device or other IDs** | Yes | No | App functionality |

For each, mark it **Required** (not optional) — the app cannot work without an
account.

**Save** → **Next** → **Submit**.

### Step 10.7 — Government apps / financial features / health

**App content** → each of these → answer **No** → **Save**.

### Step 10.8 — Store listing

Left menu → **Grow → Store presence → Main store listing**

| Field | What to write |
|---|---|
| App name | `codeboujida` |
| Short description (80 chars) | `تطبيق التحضير لامتحان رخصة السياقة بالمغرب — دروس وسلاسل وامتحانات` |
| Full description | Describe the series, lessons, road signs, practical videos and live sessions. Do **not** mention prices, subscriptions or payment. |

**Graphics you must upload:**

| Asset | Size | How to get it |
|---|---|---|
| App icon | 512×512 PNG | Export from `mobile/assets/images/icon.png` |
| Feature graphic | 1024×500 PNG/JPG | Make one in Canva — app name on the yellow/dark theme |
| Phone screenshots | min 2, max 8 | Take them on the phone from Part 6: home, a quiz question, lessons grid, results, live section |

**Save.**

---

# PART 11 — Upload and test through Play

⚠️ **Never send the first build straight to production.** Internal testing
installs in minutes with no review — it is how you discover a broken build
privately.

### Step 11.1 — Create the internal test

🌐 **BROWSER** → left menu → **Test and release → Testing → Internal testing**
→ **Create new release**

1. **App signing:** accept Google Play App Signing (the default) → **Continue**
2. **App bundles:** drag in the `.aab` from Step 7.2
3. Release name: fills in automatically (e.g. `1`)
4. Release notes, inside the `<ar-AR>` tags:
   ```
   الإصدار الأول.
   ```
5. **Next** → **Save and publish** (or **Start rollout to Internal testing**)

### Step 11.2 — Add yourself as a tester

🌐 **BROWSER** — same page → **Testers** tab

1. **Create email list** → name it `me` → add your Gmail address → **Save**
2. Tick the list → **Save changes**
3. Copy the **join link** at the bottom of the page

### Step 11.3 — Install from Play

📱 **ON THE PHONE** — open the join link in a browser, tap **Accept the
invitation**, then **Download it on Google Play**.

⚠️ First uninstall the APK from Part 6 — it was signed differently and Android
refuses to replace it.

✅ The app installs from the Play Store.

### Step 11.4 — Final test

📱 **ON THE PHONE**, on this Play-installed build:

- [ ] Everything from the Step 6.5 checklist still passes
- [ ] **A push notification arrives** — this is the only place FCM can be
      verified. Wait for the daily live reminder, or set the live time in the
      admin panel to a few minutes from now
- [ ] Tapping the notification opens the app on the live screen

---

# PART 12 — Go live

### Step 12.1 — Promote to production

🌐 **BROWSER** → **Test and release → Production** → **Create new release**

1. Click **Add from library** and pick the same bundle you tested — do **not**
   build a new one
2. Same release notes
3. **Next** → **Save** → **Go to overview** → **Send for review**

### Step 12.2 — Use a staged rollout

On the review screen, set the rollout percentage to **20%**.

**Why:** if something is badly broken, only a fifth of users get it and you can
halt the rollout. Raise it to 100% after a few days of clean crash reports.

### Step 12.3 — Wait

✅ Status becomes **In review**. A first review usually takes **1–7 days**.
Google emails you either way.

If rejected, the email names the exact policy — see Part 14.

---

# PART 13 — Updating the app later

**Most changes need no update at all.** Series, questions, lessons, videos, shop
products and live times all come from your server — press **نشر** in the admin
panel and phones pick them up on their next sync.

You only need a new release when the **app's code** changes:

💻 **LAPTOP** — in the `mobile` folder:
```bash
git pull
npx tsc --noEmit
git status                # must be clean — EAS builds committed code only
eas build --profile production --platform android
eas submit --profile production --platform android
```

`eas submit` uploads straight to the **internal** track (already configured in
`eas.json`). Test it there, then promote to production in the Console exactly as
in Step 12.1.

The version number increments itself, so you can never clash with a version
already on the store.

⚠️ **Never change `com.codeboujida.app`.** A different package name is a
different app: existing users keep the old one and never receive updates.

---

# PART 14 — When something goes wrong

### Build fails: "owner does not match" / "not authorized"
💻 Run `eas whoami`. It must print `codeboujida`. If not:
```bash
eas logout
eas login
```

### Build fails during "Install dependencies"
Your lockfile disagrees with `package.json`:
```bash
cd mobile
npm install
git add package-lock.json
git commit -m "sync lockfile"
git push
```

### My change isn't in the build
It wasn't committed. EAS builds from git, not from your disk:
```bash
git status && git add -A && git commit -m "..." && git push
```

### The app installs but every screen is empty
It cannot reach the server. Check from your laptop:
```bash
curl -s https://codeboujida.com/api/health
```
If that answers, you probably installed a `development` build — that profile
points at a LAN IP on purpose. Use `preview` or `production`.

### Rejected: "Account deletion"
The URL 404s or the reviewer couldn't find the button. Re-check Step 1.8, then
reply pointing at **الإعدادات → الحساب → حذف حسابي نهائياً**.

### Rejected: "Payments" / "In-app purchases"
A reviewer read the unlock screen as selling something. Reply with:
> The app sells nothing. Full content is enabled by the driving school as part
> of a student's enrolment, arranged outside the app. The shop section lists
> physical items only, which Play billing policy exempts. There is no price,
> checkout or payment flow anywhere in the app.

### Rejected: "Broken functionality" / "Cannot access content"
The demo account expired or was never unlocked. Fix it (admin → المستخدمون →
**تجديد 3 أشهر**), confirm you can log in as that account, then resubmit.

### Push notifications never arrive
Only testable on a Play or preview build, never in Expo Go. Re-check Part 4,
especially that the Firebase package name is exactly `com.codeboujida.app`.

---

# PART 15 — iOS, later

Once Android is live, iOS reuses everything you built here.

**What's different:**

1. **$99/year** Apple Developer Program, and a company account needs a
   **D-U-N-S number** that can take 1–2 weeks. Start it early.
2. 💻 `eas build --profile production --platform ios` — EAS handles the
   certificates.
3. 💻 `eas submit --platform ios` uploads to App Store Connect.
4. **TestFlight** is Apple's internal testing, the equivalent of Part 11.
5. **App Privacy** answers mirror your Data safety table from Step 10.6.
6. **Account deletion is required by Apple too** — same URL, same button.
7. Apple reviews **every** update, usually within a day or two.

**One extra risk:** Apple's Guideline 3.1.1 on external purchases is applied
more strictly than Google's. The same answer applies — access is granted by the
driving school, nothing is sold in the app — but reply in the review thread
rather than changing the app.

Your bundle identifier is already `com.codeboujida.app`, matching Android.
