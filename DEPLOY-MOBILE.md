# Publishing the mobile app

From a finished codebase to an app on Google Play, then on the App Store.

Follow it top to bottom. Every step says how to check it worked. A step marked
⚠️ is permanent or can cost you days if you get it wrong.

**Android first.** iOS is Part 9 — the build steps are nearly identical, the
paperwork is not.

---

## Placeholders

| Placeholder | What to put | Example |
|---|---|---|
| `<EXPO_ACCOUNT>` | Your Expo account name — must match `owner` in app.json | `codeboujida` |
| `<GOOGLE_ACCOUNT>` | The Google account that will own the app | |
| `<DEMO_PHONE>` | Phone number of the reviewer demo account you create | `0600000000` |
| `<DEMO_PASSWORD>` | Its password | |
| `<APPLE_ID>` | Apple account, for Part 9 only | |

Values already fixed in the repo — do not change them:

| | |
|---|---|
| App name | **codeboujida** |
| Android package | **com.codeboujida.app** ⚠️ permanent once published |
| API the app calls | `https://codeboujida.com/api` |
| Privacy policy | `https://codeboujida.com/legal/privacy.html` |
| Account deletion | `https://codeboujida.com/legal/account-deletion.html` |

---

# Part 0 — Before anything

### Step 1. Deploy the API first

The account-deletion page is new and Google will check the URL. It only exists
on the server after a deploy.

```bash
ssh <DEPLOY_USER>@<SERVER_IP>
cd /var/www/codeboujida && ./scripts/deploy.sh
```

✅ Verify both pages answer:
```bash
curl -s -o /dev/null -w "privacy:  %{http_code}\n" https://codeboujida.com/legal/privacy.html
curl -s -o /dev/null -w "deletion: %{http_code}\n" https://codeboujida.com/legal/account-deletion.html
```
Both must be **200**. A 404 on the deletion page means the code isn't pushed or
deployed yet — fix that before touching the Play Console.

### Step 2. Create the reviewer's demo account

⚠️ **The single most common reason a first submission is rejected.** Your
content sits behind a lock that opens only when *you* add a number to the
allowlist. A reviewer cannot do that, sees empty screens, and rejects the app as
broken or incomplete.

1. Install the app (or use your phone) and register a normal account with
   `<DEMO_PHONE>` / `<DEMO_PASSWORD>`
2. Open `https://codeboujida.com/admin` → **المجموعة المجانية**
3. Add `<DEMO_PHONE>` with the note `Google Play review`
4. Open **المستخدمون**, find it, confirm the الاشتراك column shows time left

✅ Log into the app as that account and confirm you can open a premium series
and a lesson. If you can't, the reviewer can't either.

⚠️ The term is **three months**. Set a reminder to renew it, or a future update
gets rejected because the demo account expired.

### Step 3. Install the build tools

On your laptop:
```bash
npm install -g eas-cli
eas --version
```
✅ Prints a version. Then:
```bash
eas login
eas whoami
```
✅ Prints `<EXPO_ACCOUNT>`. It **must** match `owner` in `mobile/app.json`
(currently `codeboujida`), or every build fails with an ownership error.

---

# Part 1 — Link the EAS project

### Step 4. Create the project

```bash
cd mobile
eas init
```
It asks to create a project for `@<EXPO_ACCOUNT>/codeboujida` — accept.

✅ Check it wrote the id back:
```bash
node -p "require('./app.json').expo.extra.eas.projectId"
```
✅ A UUID. It was deliberately left empty in the repo because the previous id
belonged to a different Expo account — push tokens minted against an account you
don't own can never be delivered.

⚠️ **Commit this change.** The project id must be in the repo, or the next build
from a clean checkout creates a *second* project.

```bash
git add app.json && git commit -m "mobile: link EAS project" && git push
```

---

# Part 2 — Push notifications (Firebase)

Skip this and the app still works — the daily live-broadcast notification just
never arrives on Android. Do it before launch, not after.

### Step 5. Create the Firebase project

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → name it `codeboujida`
2. Google Analytics is optional — you don't need it
3. Inside the project: **Add app** → **Android**
4. Android package name: **`com.codeboujida.app`** — must match exactly
5. Download **`google-services.json`** when offered

✅ The file downloads and its `package_name` reads `com.codeboujida.app`.

### Step 6. Give Expo permission to send

Expo's push service talks to Firebase on your behalf and needs a service
account key:

1. Firebase → ⚙️ **Project settings** → **Service accounts**
2. **Generate new private key** → a `.json` file downloads
3. ⚠️ Treat it like a password. Never commit it.

Upload it to EAS:
```bash
eas credentials
```
Choose **Android** → **production** → **Google Service Account** → **Manage your
Google Service Account Key for Push Notifications (FCM V1)** → upload the file.

✅ `eas credentials` then lists a configured FCM V1 key for the project.

---

# Part 3 — Build

### Step 7. Sanity-check the configuration

```bash
cd mobile
npx tsc --noEmit
node -e "const c=require('./app.json').expo; console.log(c.name, '|', c.android.package, '|', c.android.permissions.join(','), '|', c.owner)"
node -e "console.log(require('./eas.json').build.production.env.EXPO_PUBLIC_API_URL)"
```

✅ Expect exactly:
```
codeboujida | com.codeboujida.app | POST_NOTIFICATIONS,RECEIVE_BOOT_COMPLETED | codeboujida
https://codeboujida.com/api
```
❌ If `RECORD_AUDIO` appears, you're on an old checkout — that permission gets
the app rejected because nothing in it records audio.

### Step 8. Build the release bundle

```bash
eas build --profile production --platform android
```
This runs on Expo's servers and takes **10–25 minutes**. The first build asks to
generate an Android keystore — **answer yes and let EAS manage it.**

⚠️ That keystore signs your app **forever**. If it is ever lost, you can never
update this app again; you'd have to publish a new listing and every user would
have to reinstall. EAS keeps it safe, but take your own copy once:
```bash
eas credentials
# Android → production → Keystore → Download
```
Store it with your other secrets.

✅ The build ends with a URL and `Build successful`. It produces an **.aab** —
that's what Play wants. Download it.

❌ If it fails, read the log section that turned red. The most common causes are
in Part 8.

### Step 9. Test the real bundle before uploading

An .aab can't be installed directly. Build an APK from the same code:
```bash
eas build --profile preview --platform android
```
Install it on a real Android phone and check:

- [ ] The app is named **codeboujida** under the icon
- [ ] Register a new account — it works against the live server
- [ ] Sync downloads content (needs the API to have content published)
- [ ] Run a quiz, finish it, see the results
- [ ] Turn on airplane mode → the quiz still works offline
- [ ] Settings → **بدون مؤقت** → a quiz has no countdown and never auto-submits
- [ ] Settings → **حذف حسابي نهائياً** → the account is deleted and you're signed out
- [ ] No microphone permission prompt appears, ever

✅ Everything passes before you upload. Fixing an app after it's on the store is
far slower than fixing it now.

---

# Part 4 — Create the Play listing

### Step 10. Developer account

[play.google.com/console](https://play.google.com/console) — **$25 one time**,
paid with `<GOOGLE_ACCOUNT>`. Identity verification can take a few days, so do
this early.

⚠️ Open it with the account that should **own** the app. A developer account
cannot be transferred to another person later.

### Step 11. Create the app

**Create app** →
- App name: **codeboujida**
- Default language: **العربية** (add French as a second language if you like)
- App or game: **App**
- Free or paid: **Free**

⚠️ **Free is permanent.** A free app can never become paid. Since access is
arranged by the school outside the app, free is correct.

### Step 12. Store listing

You need, at minimum:

| Asset | Requirement |
|---|---|
| App icon | 512×512 PNG |
| Feature graphic | 1024×500 PNG or JPG |
| Phone screenshots | at least 2, up to 8 |
| Short description | max 80 characters |
| Full description | max 4000 characters |

Take screenshots from the preview APK in Step 9: home, a quiz question, the
lessons grid, the results screen, and the live section.

### Step 13. The policy forms

This is where apps get stuck. Four sections, all mandatory:

**Privacy policy** → `https://codeboujida.com/legal/privacy.html`

**Data safety** — declare honestly what the app collects:

| Data | Collected | Why |
|---|---|---|
| Phone number | yes | account identity and login |
| Name (username) | yes | account identity |
| Other ID (3 digits of the ID card) | yes | password recovery only |
| App activity (quiz results) | yes | showing the candidate their progress |
| Device identifiers / push token | yes | notifications and device limit |

Encrypted in transit: **yes** (HTTPS). Users can request deletion: **yes**.

**Account deletion URL** → `https://codeboujida.com/legal/account-deletion.html`

**App access** — choose *"All or some functionality is restricted"* and give:
```
Login: <DEMO_PHONE>
Password: <DEMO_PASSWORD>
Note: full content is enabled by the driving school on this account.
```

**Content rating** — fill the questionnaire. An education app with no violence,
gambling or user-generated content rates as suitable for everyone.

**Target audience** — 18+ is the honest answer for a driving-licence app.

**Ads** — declare **no ads**.

---

# Part 5 — Upload and test on the store

### Step 14. Internal testing first

⚠️ **Never send the first build straight to production.** Internal testing
installs in minutes with no review, and lets you catch a broken build before
anyone sees it.

Play Console → **Testing → Internal testing** → **Create new release** → upload
the `.aab` from Step 8 → add your own email as a tester → **Review release** →
**Start rollout**.

✅ You get an opt-in link. Open it on your phone, accept, install from Play.

### Step 15. Test the installed app

Repeat the Step 9 checklist on the **Play-installed** build, plus:

- [ ] A push notification arrives (have the admin panel trigger a live, or wait
      for the daily one)
- [ ] The app opens from the notification onto the live screen

✅ Push working here proves Part 2 was done correctly. This is the only place it
can be verified.

### Step 16. Submit for review

**Production** → **Create new release** → reuse the same bundle → **Review
release** → **Start rollout to production**.

✅ Status becomes "In review". First reviews typically take **a few days**;
updates are usually much faster.

**Use a staged rollout** — start at 20%. If something is badly wrong you halt it
before it reaches everyone.

❌ If it's rejected, the email names the exact policy. The likely ones for this
app are in Part 8.

---

# Part 6 — Updating later

**Most changes need no update at all.** Series, questions, lessons, videos, shop
products and live times all come from your API — you press **نشر** in the admin
panel and phones pick them up on their next sync. The store is only involved
when the **app's code** changes.

When it does:

```bash
cd mobile
npx tsc --noEmit
eas build --profile production --platform android
eas submit --profile production --platform android
```

The version number increments automatically (`autoIncrement` in `eas.json`), so
you can never collide with a version already on the store.

`eas submit` uploads to the **internal** track first (that's the configured
default). Promote it to production in the Console once you've checked it.

⚠️ **Never change `com.codeboujida.app`.** Changing the package name creates a
completely different app: existing users keep the old one forever and get no
updates.

---

# Part 7 — After launch

- **Play Console → Quality → Crashes and ANRs** — check weekly. The app has no
  crash reporting of its own, so this is your only view.
- **Renew the demo account every three months** or the next update is rejected.
- **Target API level** — Google raises the minimum every August. When you get
  the warning email, upgrading the Expo SDK and rebuilding is the fix.
- **Reviews** — replying is free and visibly improves ratings.

---

# Part 8 — When it goes wrong

### Build fails: "owner does not match"
`owner` in `app.json` is `codeboujida`; `eas whoami` prints something else.
Log in with the right account, or fix `owner`.

### Build fails during "Install dependencies"
Almost always a lockfile that doesn't match `package.json`. On your laptop:
```bash
cd mobile && npm install && git add package-lock.json && git commit -m "sync lockfile" && git push
```

### The app installs but every screen is empty
It cannot reach the API. Check on the phone's network:
```bash
curl -s https://codeboujida.com/api/health
```
If that works, you likely built a profile whose `EXPO_PUBLIC_API_URL` points
somewhere else — `development` deliberately points at a LAN IP.

### Rejected: "Account deletion"
The URL 404s, or the in-app path is missing. Both exist in this codebase —
confirm Step 1 actually deployed, then reply to the rejection pointing at
Settings → الحساب → حذف حسابي نهائياً.

### Rejected: "Payments" or "In-app purchases"
A reviewer read the unlock screen as selling digital content. Every purchase
word was removed from the app for exactly this reason — the screen asks the
school to enable access and never mentions money. Reply explaining that access
is granted by the driving school as part of enrolment, that nothing is sold in
the app, and that the shop lists **physical** goods only, which store billing
rules exempt.

### Rejected: "Broken functionality"
The reviewer couldn't get past the lock. The demo account expired or was never
added. Renew it (المجموعة المجانية → +3 أشهر) and resubmit.

---

# Part 9 — iOS, afterwards

The build is the easy half; the account is not.

**What's different:**

1. **Apple Developer Program — $99/year**, and for a company account you need a
   **D-U-N-S number**, which can take a week or two to obtain. Start early.
2. **`eas build --profile production --platform ios`** — EAS handles
   certificates and provisioning profiles for you.
3. **`eas submit --platform ios`** uploads to App Store Connect.
4. **TestFlight** is Apple's internal testing, equivalent to Step 14.
5. **App Privacy** answers mirror the Data Safety table in Step 13.
6. **Account deletion is required on iOS too** — same URL, same in-app path.
7. Apple reviews **every** update, typically within a day or two. Rejections
   come with a specific guideline number and a reply thread.

**One Apple-specific risk:** Guideline 3.1.1 covers external purchases more
strictly than Google. The same argument applies — access is granted by the
driving school, nothing is sold in the app — but expect a higher chance of
being asked about it, and answer in the review thread rather than changing the
app.

The bundle identifier is already `com.codeboujida.app`, matching Android.
