# Publishing codeboujida on the App Store

The iOS companion to `DEPLOY-MOBILE.md`. Written for someone who has never
published to Apple before. Every command says **where** you run it and **why**.
Every Console step says **what to click**.

Follow it top to bottom. Parts 1–7 are setup you do once. Part 8 gives you a
**test build on your iPhone**. Part 10 onward is the **public release**.

**Do Android first.** It is cheaper, faster, and far more forgiving.

---

## Read this before you spend anything

### You do NOT need a Mac

EAS builds iOS apps on Apple hardware in the cloud. Your Windows laptop is fine
for everything in this guide.

### You DO need $99 a year

| What you want | Costs | Works on your setup? |
|---|---|---|
| **Simulator build** (`.app`) | Free, no Apple account | ❌ Runs only in the iOS Simulator, **which exists only on a Mac** |
| **Ad-hoc build** (direct install) | **$99/year** | ✅ Installs on iPhones whose UDID you register |
| **TestFlight** | **$99/year** | ✅ The real equivalent of your Android `preview` build |
| **App Store** | **$99/year** | ✅ |

There is no free way to put this app on an iPhone from a Windows machine. The
one free option needs a Mac you do not have.

The $99 is a **yearly subscription**, not a one-off like Google's $25. Stop
paying and your app is removed from the App Store.

### ⚠️ The risk worth knowing before you pay

Your app unlocks content when the owner adds a phone number to the allowlist,
after the candidate contacts the school on WhatsApp. Google accepted this.
**Apple is much stricter**, and this is the single most likely rejection.

Apple's guideline **3.1.1** says digital content unlocked inside an app must be
sold through Apple's in-app purchase, with Apple taking 15–30%.

Your defence is guideline **3.1.3(b) Multiplatform Services**: access is part of
enrolment at a physical driving school, arranged in the real world, and nothing
is ever sold inside the app. That is a legitimate exemption — but it is an
argument you may have to *make*. Part 12 gives you the exact wording to paste.

**Budget for one or two rejections.** If you cannot accept that, stay on Android.

---

## The three places you will work

| | Where | How to open it |
|---|---|---|
| 💻 **LAPTOP** | A terminal on Windows, inside the `mobile` folder | PowerShell or Git Bash, then `cd C:\Users\T14s\Desktop\claude-setup\claude-setup\mobile` |
| 🌐 **BROWSER** | Apple Developer, App Store Connect, AdMob | Links given in each step |
| 📱 **IPHONE** | The test device | |

---

## Placeholders — fill these in as you go

| Placeholder | What it is | Yours |
|---|---|---|
| `<APPLE_ID>` | Apple ID email owning the developer account ⚠️ permanent | |
| `<APPLE_TEAM_ID>` | 10 characters, from the developer portal | |
| `<ASC_APP_ID>` | Numeric App Store Connect app id | |
| `<IOS_ADMOB_APP_ID>` | AdMob iOS app id, has a `~` | |
| `<IOS_ADMOB_UNIT_ID>` | AdMob iOS interstitial id, has a `/` | |
| `<DEMO_PHONE>` | Phone of the account you give Apple's reviewer | |
| `<DEMO_PASSWORD>` | Its password | |

Already fixed in the code — **do not change these**:

| | |
|---|---|
| App name | **codeboujida** |
| Bundle identifier | **com.codeboujida.app** ⚠️ permanent forever |
| Expo owner / slug | **codeboujida** |
| API the app calls | `https://codeboujida.com/api` |
| Privacy policy URL | `https://codeboujida.com/legal/privacy.html` |
| Account deletion URL | `https://codeboujida.com/legal/account-deletion.html` |

---

# PART 1 — Create the Apple developer account

### Step 1.1 — An Apple ID with two-factor on

🌐 **BROWSER** → [appleid.apple.com](https://appleid.apple.com)

Sign in, or **Create Your Apple ID**. Use an address you will keep for years —
the apps, the certificates and the money are tied to it permanently.

Then **Sign-In and Security** → **Two-Factor Authentication** → turn it **on**.

**Why:** Apple refuses enrolment without it, and you will be typing 6-digit
codes constantly from here on. Keep the trusted iPhone nearby for the whole
process.

### Step 1.2 — Individual or Organization ⚠️ decide carefully

🌐 **BROWSER** → [developer.apple.com/programs](https://developer.apple.com/programs/)
→ **Enroll**

| | Individual | Organization |
|---|---|---|
| Seller name shown on the store | **your own legal name** | the company name |
| Extra paperwork | none | **D-U-N-S number** + legal entity proof |
| Approval time | hours to a few days | **1–4 weeks** |
| Cost | $99/yr | $99/yr |

⚠️ **You cannot convert Individual into Organization later.** You would start a
new account and move the app across.

If you want the store to say "Auto Ecole Boujida" rather than your personal
name, get a D-U-N-S number first at
[dnb.com](https://www.dnb.com/duns-number.html) — free, but slow. Otherwise
pick **Individual** and move on today.

### Step 1.3 — Fill in the enrolment

You will be asked for:

1. Legal name exactly as on your ID
2. Address in Morocco
3. Phone number
4. A government ID (Apple may ask you to photograph your CIN)

Then pay **$99** by card.

### Step 1.4 — Wait for approval

Usually a few hours for Individual, sometimes a day or two. Apple occasionally
telephones to verify.

✅ You are approved when
[developer.apple.com/account](https://developer.apple.com/account) shows
**Certificates, Identifiers & Profiles** in the left sidebar.

❌ If it still says "Your enrollment is being processed", just wait — there is
nothing to fix.

### Step 1.5 — Write down your Team ID

🌐 **BROWSER** → [developer.apple.com/account](https://developer.apple.com/account)
→ **Membership details**

Copy the **Team ID** — 10 characters like `A1B2C3D4E5`. Write it in the
placeholder table as `<APPLE_TEAM_ID>`. You need it in Part 4.

### Step 1.6 — Accept the agreements ⚠️ easy to forget

🌐 **BROWSER** → [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
→ **Business** (older accounts: **Agreements, Tax, and Banking**)

Accept the **Free Applications** agreement.

**Why:** an unaccepted agreement silently blocks the app from going live, and
App Store Connect does not warn you until the very end of the process.

Your app is free, so you do **not** need the Paid Applications agreement and you
do **not** need to give Apple bank details.

### Step 1.7 — Create an app-specific password

🌐 **BROWSER** → [appleid.apple.com](https://appleid.apple.com) → **Sign-In and
Security** → **App-Specific Passwords** → **+**

Name it `eas`. Copy the password it gives you (`xxxx-xxxx-xxxx-xxxx`) and keep
it safe.

**Why:** `eas submit` uploads to Apple on your behalf and cannot answer a
two-factor prompt. This password is what it uses instead. It is not your normal
Apple password and can be revoked any time.

---

# PART 2 — Tools on your laptop

If you already published to Android, you have all of this. Check anyway.

### Step 2.1 — Go to the mobile folder

💻 **LAPTOP**

```bash
cd C:\Users\T14s\Desktop\claude-setup\claude-setup\mobile
```

### Step 2.2 — Confirm the build tool

💻 **LAPTOP**

```bash
eas --version
```

If it says "command not found":

```bash
npm install -g eas-cli
```

Then close the terminal and open a new one — Windows needs that after a global
install.

### Step 2.3 — Confirm you are the right Expo user

💻 **LAPTOP**

```bash
eas whoami
```

✅ Must print **`codeboujida`**. If not:

```bash
eas logout
eas login
```

**Why:** `app.json` says `"owner": "codeboujida"`, and a mismatch fails every
build before it starts.

---

# PART 3 — Register the app with Apple

### Step 3.1 — Register the bundle identifier

🌐 **BROWSER** →
[developer.apple.com/account/resources/identifiers](https://developer.apple.com/account/resources/identifiers)
→ **+**

1. **App IDs** → **Continue**
2. **App** → **Continue**
3. Description: `codeboujida`
4. Bundle ID: select **Explicit**, type `com.codeboujida.app`
5. Scroll the Capabilities list and tick **Push Notifications**
6. **Continue** → **Register**

⚠️ **Do this by hand rather than letting EAS do it.** EAS will create the
identifier automatically but will not tick Push Notifications, and a missing
capability produces a build that installs perfectly and then never receives a
single notification.

### Step 3.2 — Create the app record in App Store Connect

🌐 **BROWSER** → [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
→ **Apps** → **+** → **New App**

| Field | Value |
|---|---|
| Platforms | **iOS** |
| Name | `codeboujida` — must be unique across the entire App Store |
| Primary language | **Arabic** (or French — this is the listing's language) |
| Bundle ID | `com.codeboujida.app` (pick it from the dropdown) |
| SKU | `codeboujida-ios` — internal only, never shown to anyone |
| User Access | **Full Access** |

**Create**.

❌ If the name is taken, Apple tells you here. Pick a variation — the *display*
name may differ from the bundle id, which is fixed forever.

### Step 3.3 — Copy the App Store Connect app id

Once created, look at the address bar:

```
https://appstoreconnect.apple.com/apps/6740123456/appstore/ios/version/...
                                        ^^^^^^^^^^
```

That number is `<ASC_APP_ID>`. Write it in the placeholder table.

---

# PART 4 — Set up AdMob for iOS

Your Android ad setup does **not** carry over. iOS is a separate app inside
AdMob with its own app id and its own ad unit.

Skip this Part only if you are happy shipping iOS with no ads at all.

### Step 4.1 — Add the iOS app in AdMob

🌐 **BROWSER** → [admob.google.com](https://admob.google.com) → **Apps** →
**Add app**

1. Platform: **iOS**
2. "Is your app listed on a supported app store?" → **No**
3. App name: `codeboujida`
4. **Add app** → **Done**

Open **Apps → codeboujida (iOS) → App settings** and copy the **App ID**:

```
ca-app-pub-7655131518793372~1234567890
```

⚠️ Note the **`~`** (tilde). That is `<IOS_ADMOB_APP_ID>`.

### Step 4.2 — Create the iOS interstitial unit

**Apps → codeboujida (iOS) → Ad units → Add ad unit**

1. Format: **Interstitial**
2. Name: `end-of-series`
3. Leave the rest default → **Create ad unit**

Copy the **Ad unit ID**:

```
ca-app-pub-7655131518793372/9876543210
```

⚠️ This one has a **`/`** (slash). That is `<IOS_ADMOB_UNIT_ID>`.

Mixing these two up makes the app **crash on launch**. Keep them apart.

### Step 4.3 — app-ads.txt already covers iOS

Nothing to do. `https://codeboujida.com/app-ads.txt` is per *publisher*, not per
platform, and your publisher id is the same. It already authorises the iOS app.

### Step 4.4 — About the tracking prompt

You may have seen iOS apps ask *"Allow codeboujida to track you across other
apps?"*. **Yours will not, and does not need to.**

The app requests **non-personalised ads only**
(`requestNonPersonalizedAdsOnly: true` in `src/ads/interstitial.ts`), which
never touches the advertising identifier. No tracking means no prompt and no App
Tracking Transparency paperwork.

The trade-off is that non-personalised ads pay less. Adding the prompt later is
a real option once the app has users — it needs a permission string, a consent
flow, and a change to the App Privacy answers in Step 11.1.

---

# PART 5 — Prepare the code for iOS

💻 **LAPTOP** — open `mobile/app.json` in your editor.

Everything in this Part is a text edit you make yourself. Take your time; each
mistake costs a 25-minute build.

### Step 5.1 — Expand the `ios` block

Find this near the top:

```json
    "ios": {
      "icon": "./assets/images/app-icon.png",
      "bundleIdentifier": "com.codeboujida.app"
    },
```

Replace it with:

```json
    "ios": {
      "icon": "./assets/images/app-icon.png",
      "bundleIdentifier": "com.codeboujida.app",
      "supportsTablet": true,
      "config": {
        "usesNonExemptEncryption": false
      },
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
```

What each line does:

| Line | Why |
|---|---|
| `supportsTablet` | The app already has landscape and tablet layouts. Without this Apple runs it letterboxed on iPad and reviews it as iPhone-only. ⚠️ It also **obliges you to supply iPad screenshots** (Step 11.4). Set it to `false` if you want to skip that work for version 1. |
| `usesNonExemptEncryption` / `ITSAppUsesNonExemptEncryption` | Answers the export-compliance question permanently. Without them Apple asks you on **every single upload**, forever. The app only uses HTTPS, which is exempt, so `false` is the correct and honest answer. |

### Step 5.2 — Put in the iOS AdMob app id

Find the AdMob plugin near the bottom of `plugins`:

```json
[
  "react-native-google-mobile-ads",
  {
    "androidAppId": "ca-app-pub-7655131518793372~2467421166",
    "iosAppId": "ca-app-pub-3940256099942544~1458002511"
  }
]
```

Replace `iosAppId` with `<IOS_ADMOB_APP_ID>` from Step 4.1. **Leave
`androidAppId` exactly as it is.**

⚠️ `ca-app-pub-3940256099942544` is Google's *test* publisher. Ship that and
iOS shows "Test Ad" forever and earns nothing.

### Step 5.3 — Put in the iOS ad unit id

Find the `admob` block inside `extra`:

```json
"admob": {
  "androidInterstitialUnitId": "ca-app-pub-7655131518793372/1398239892",
  "iosInterstitialUnitId": "",
  "forceTestAds": true
}
```

Set `iosInterstitialUnitId` to `<IOS_ADMOB_UNIT_ID>` from Step 4.2.

Leave `forceTestAds` as `true` for your **test** build — it forces Google's
always-filling test ads so you can confirm the ad actually appears. Set it to
`false` before the **production** build (Step 10.1).

### Step 5.4 — Add the submit details to `eas.json`

💻 **LAPTOP** — open `mobile/eas.json`. Find the `submit` block at the bottom:

```json
"submit": {
  "production": {
    "android": {
      "track": "internal"
    }
  }
}
```

Replace it with:

```json
"submit": {
  "production": {
    "android": {
      "track": "internal"
    },
    "ios": {
      "appleId": "<APPLE_ID>",
      "ascAppId": "<ASC_APP_ID>",
      "appleTeamId": "<APPLE_TEAM_ID>"
    }
  }
}
```

Fill in the three real values from Parts 1 and 3. Keep the quotes.

**Why:** without this, `eas submit` asks you for all three every single time and
cannot run unattended.

### Step 5.5 — Commit ⚠️ do not skip

💻 **LAPTOP**

```bash
git add app.json eas.json
git commit -m "mobile: iOS configuration"
git push
```

**Why:** EAS builds from your **committed** code, not from your disk. Skip this
and the cloud build silently uses the old settings and you will not understand
why nothing changed.

---

# PART 6 — Push notifications (APNs)

Android used Firebase. iOS uses Apple's own service, and EAS sets it up for you.

### Step 6.1 — Let EAS create the key

💻 **LAPTOP** — in the `mobile` folder:

```bash
eas credentials
```

Answer the menu:

1. Platform → **iOS**
2. Build profile → **production**
3. → **Push Notifications: Manage your Apple Push Notifications Key**
4. → **Set up your Push Notifications Key**
5. Log in with `<APPLE_ID>` and your 2FA code when asked

✅ The menu then shows a configured APNs key. Press `Ctrl+C` to exit.

⚠️ **Two things about Apple push keys.**

Apple lets you download the `.p8` key file **exactly once, ever**. Letting EAS
create and store it means you never handle the file and can never lose it.

Apple allows a maximum of **2 APNs keys per account**. Do not generate spares
"just to test" — you will lock yourself out of creating the one you need.

---

# PART 7 — Check everything before building

💻 **LAPTOP** — in the `mobile` folder.

### Step 7.1 — Does the code compile?

```bash
npx tsc --noEmit
```

✅ Prints nothing at all. Any output is an error to fix first.

**Why:** catches mistakes in 30 seconds instead of 25 minutes into a cloud build.

### Step 7.2 — Is the iOS config right?

```bash
node -e "const e=require('./app.json').expo; const p=e.plugins.find(x=>Array.isArray(x)&&x[0]==='react-native-google-mobile-ads'); console.log('bundle id   :',e.ios.bundleIdentifier); console.log('tablet      :',e.ios.supportsTablet===true?'on (iPad screenshots required)':'off'); console.log('ios app id  :',p[1].iosAppId); console.log('ios unit id :',e.extra.admob.iosInterstitialUnitId||'(empty - will use test)'); console.log('forceTestAds:',e.extra.admob.forceTestAds===true?'ON':'off')"
```

✅ Expect:

```
bundle id   : com.codeboujida.app
tablet      : on (iPad screenshots required)
ios app id  : ca-app-pub-7655131518793372~...
ios unit id : ca-app-pub-7655131518793372/...
forceTestAds: ON
```

❌ An `ios app id` starting `ca-app-pub-3940256099942544` means Step 5.2 was not
saved — that is Google's test publisher.

### Step 7.3 — Are the native libraries consistent?

```bash
npx expo-doctor
```

✅ `18/18 checks passed. No issues detected!`

⚠️ Necessary but **not sufficient**. This project once reported 18/18 while
carrying a library that crashed the Android release build on launch. Only
installing on a real iPhone proves anything.

### Step 7.4 — Is everything committed?

```bash
git status
```

✅ Must say `nothing to commit, working tree clean`.

---

# PART 8 — Build a TEST version

Two routes. **Use TestFlight** unless you have a specific reason not to.

| | TestFlight | Ad-hoc (direct install) |
|---|---|---|
| Device registration | none needed | **every** iPhone's UDID, by hand |
| Testers | up to 100 internal, instantly | only registered devices |
| Apple review | none for internal testers | none |
| Expires | 90 days per build | when the profile expires (1 year) |
| Best for | almost everything | a phone with no Apple ID signed in |

## Route A — TestFlight (recommended)

### Step 8.1 — Build it

💻 **LAPTOP**

```bash
eas build --profile production --platform ios
```

The **first time**, EAS asks to log in to Apple and then offers to create the
distribution certificate and provisioning profile. Say **yes** to everything —
letting EAS manage credentials is the entire point of using it.

⏱ 20–30 minutes. Longer than Android. You can close the terminal; the build
continues on Expo's servers and the link is in your account.

✅ Ends with `Build finished` and a link.

### Step 8.2 — Upload it to Apple

💻 **LAPTOP**

```bash
eas submit --profile production --platform ios
```

It uses the `appleId` / `ascAppId` / `appleTeamId` from Step 5.4, and asks for
the **app-specific password** from Step 1.7 (not your normal Apple password).

✅ Ends with the build uploaded to App Store Connect.

### Step 8.3 — Wait for processing

🌐 **BROWSER** → App Store Connect → your app → **TestFlight** tab

The build shows **"Processing"** for 5–30 minutes. That is Apple scanning it,
not a problem.

❌ If you get an email saying the build was rejected during processing, it is
almost always a missing Info.plist key — and the email names the exact key. Send
it to me and I will tell you what to add.

### Step 8.4 — Add yourself as an internal tester

🌐 **BROWSER** → **TestFlight** → **Internal Testing** → **+** beside Testers

Add `<APPLE_ID>`. Internal testers need **no Apple review** and get the build
immediately.

⚠️ If App Store Connect asks about **export compliance** here, Step 5.1 was not
applied. Answer "No" to encryption and fix `app.json` before the next build.

### Step 8.5 — Install it on the iPhone

📱 **IPHONE**

1. Install **TestFlight** from the App Store
2. Sign in with `<APPLE_ID>`
3. `codeboujida` is waiting — tap **Install**

✅ The app appears on the home screen with a small orange dot beside its name in
TestFlight.

## Route B — Ad-hoc, direct install

Use this when you want the app on a phone without signing it into TestFlight.

### Step 8.6 — Register the device

💻 **LAPTOP**

```bash
eas device:create
```

Choose **Website** — it prints a URL and a QR code.

📱 **IPHONE** — open that URL in **Safari** (not Chrome), download the profile,
then **Settings → General → VPN & Device Management** → install it.

✅ The device's UDID is now registered with your Apple account.

⚠️ Repeat for every phone that needs the build. Apple caps you at **100 iPhones
per year**, and the count only resets at renewal.

### Step 8.7 — Build for those devices

💻 **LAPTOP**

```bash
eas build --profile preview --platform ios
```

The `preview` profile is already `"distribution": "internal"`, which is what
makes this an ad-hoc build.

✅ When it finishes, EAS gives you an install link and a QR code. Open it in
Safari **on a registered iPhone** and tap Install.

❌ "Unable to install" almost always means that phone's UDID was registered
*after* the build. Register it, then build again — the device list is baked in.

---

# PART 9 — Test it properly

📱 **IPHONE** — do not skip this. It is the only thing that proves the app works.

- [ ] It opens without crashing (the Android build crashed twice on launch)
- [ ] Register a new account, then log in with the phone number
- [ ] Series appear — free ones open, locked ones show the قفل card
- [ ] Finish a series: **the ad appears**, then the score
- [ ] The correction screen plays its audio
- [ ] **Rotate to landscape** on every quiz screen
- [ ] Arabic is right-aligned everywhere, nothing reversed or clipped
- [ ] الإعدادات → حذف حسابي نهائياً actually deletes the account
- [ ] Turn the timer off in settings — no countdown appears
- [ ] Live section shows (only if the platform URLs are set in the admin panel)
- [ ] Kill the app, reopen with WiFi off — content is still there
- [ ] Push notification arrives (ask me to send a test)

⚠️ **Test on an old iPhone if the owner has one.** The newest phone hides
performance problems your candidates will hit.

⚠️ **If `forceTestAds` is on, the ad says "Test Ad".** That is correct and safe
to tap. Once you switch to real ads, never tap your own — Google permanently
disables accounts for it.

---

# PART 10 — Build the PRODUCTION version

Only once Part 9 passes.

### Step 10.1 — Turn off the test ads ⚠️ the one people forget

💻 **LAPTOP** — in `mobile/app.json`, in the `admob` block:

```json
"forceTestAds": false
```

```bash
git add app.json
git commit -m "mobile: real ads for release"
git push
```

**Why:** shipping with it on means every candidate sees "Test Ad" and you earn
nothing.

### Step 10.2 — Re-run the checks

💻 **LAPTOP**

```bash
npx tsc --noEmit
node -e "const e=require('./app.json').expo; const p=e.plugins.find(x=>Array.isArray(x)&&x[0]==='react-native-google-mobile-ads'); console.log('ios app id  :',p[1].iosAppId); console.log('ios unit id :',e.extra.admob.iosInterstitialUnitId||'(empty)'); console.log('forceTestAds:',e.extra.admob.forceTestAds===true?'ON  <-- WRONG for release':'off')"
git status
```

✅ For release you need all four:

| | Required |
|---|---|
| `ios app id` | yours, contains a **`~`** |
| `ios unit id` | yours, contains a **`/`** |
| `forceTestAds` | **off** |
| `git status` | clean |

### Step 10.3 — Build and upload

💻 **LAPTOP**

```bash
eas build --profile production --platform ios
eas submit --profile production --platform ios
```

The version number increments itself (`appVersionSource: "remote"` in
`eas.json`), so you can never clash with a build already on Apple's servers.

✅ The new build appears under **TestFlight** after processing. Install it once
more and confirm the ad now shows a **real** ad rather than "Test Ad".

---

# PART 11 — The App Store forms

🌐 **BROWSER** → App Store Connect → your app → **App Store** tab.

This is where people get stuck. Work down the left sidebar.

### Step 11.1 — App Privacy ⚠️ must match your Android answers

**App Privacy** → **Get Started**

| Data type | Collected | Linked to identity | Used for tracking | Purpose |
|---|---|---|---|---|
| **Phone Number** | Yes | Yes | No | App Functionality |
| **Name** (the username) | Yes | Yes | No | App Functionality |
| **Other Data** (3 ID digits) | Yes | Yes | No | App Functionality |
| **Product Interaction** (quiz results) | Yes | Yes | No | Analytics, App Functionality |
| **Device ID** | Yes | **No** | **No** | **Third-Party Advertising** |

⚠️ **Device ID is the row the ads create.** AdMob reads a device identifier and
passes it to advertisers, so it must be declared. Mark **Used for tracking =
No** — correct, because the app requests non-personalised ads only. If you ever
add the ATT prompt (Step 4.4), that answer must become **Yes**.

Also set the account deletion URL:
`https://codeboujida.com/legal/account-deletion.html`

**Publish** when done.

### Step 11.2 — Age rating

**Age Rating** → **Edit**

Answer **None** / **No** to everything: no violence, no sexual content, no
profanity, no horror, no gambling, no user-generated content, no unrestricted
web access.

There is a question about whether the app **contains advertising** — answer
**Yes**. It must agree with Step 11.1.

✅ You should land on **4+**.

### Step 11.3 — Pricing and availability

**Pricing and Availability**

- Price: **Free**
- Availability: **Morocco** at minimum. Adding the whole world costs nothing and
  reaches Moroccans abroad.

### Step 11.4 — Screenshots ⚠️ the fiddly part

Apple demands **exact pixel dimensions** and rejects anything else.

| Device | Accepted sizes | Required? |
|---|---|---|
| iPhone 6.9" | 1290 × 2796 **or** 1320 × 2868 | **Yes, always** |
| iPad 13" | 2048 × 2732 **or** 2064 × 2752 | **Only if `supportsTablet` is true** |

Minimum 3 per size, maximum 10.

**How to get them without a Mac:** take screenshots on a real iPhone from your
TestFlight build, then resize to the exact pixel size in any image editor. The
aspect ratio must match, so crop rather than stretch.

**If you set `supportsTablet: false` in Step 5.1**, you skip the iPad set
entirely. That is a legitimate choice for version 1 — but the app does have
tablet layouts already, so it is a shame to hide them.

### Step 11.5 — The listing text

| Field | What to put |
|---|---|
| Subtitle | 30 chars, e.g. `دروس ورموز السياقة` |
| Promotional text | 170 chars — changeable later **without** a review |
| Description | What the app does. ⚠️ **Never mention prices, WhatsApp payment, or subscriptions.** |
| Keywords | 100 characters total, comma-separated, **no spaces after commas** |
| Support URL | `https://codeboujida.com` |
| Marketing URL | optional |
| Privacy Policy URL | `https://codeboujida.com/legal/privacy.html` |

⚠️ **The reviewer reads the description.** Anything that sounds like selling
digital access inside the app hands them a reason to invoke 3.1.1. Describe it
as exam preparation material provided by the driving school.

### Step 11.6 — App Review Information

Scroll to the bottom of the version page.

| Field | Value |
|---|---|
| Sign-in required | **Yes** |
| User name | `<DEMO_PHONE>` |
| Password | `<DEMO_PASSWORD>` |
| Contact | your name, email, phone |

⚠️ **Unlock the demo account before submitting** — admin panel → المستخدمون →
find that number → **تجديد 3 أشهر**. A reviewer who hits a locked screen rejects
for "incomplete functionality", and that also invites the payment question.

⚠️ Remember the subscription lasts **3 months**. If Apple reviews an update
later, check the demo account has not expired.

---

# PART 12 — Submit, and the 3.1.1 argument

### Step 12.1 — Reviewer notes ⚠️ the highest-value step in this guide

Paste this into **Notes** in App Review Information:

```
This app contains NO purchases of any kind. Nothing is sold inside it.

codeboujida is study material for candidates enrolled at Auto Ecole Boujida,
a physical driving school in Morocco. Full access to the question banks is
part of a student's enrolment at the school, which is arranged in person at
the school's premises. The app does not sell that enrolment, does not price
it, and has no checkout, cart or payment screen anywhere.

Locked content shows a screen asking the candidate to contact the school's
administration. An administrator then enables access server-side for that
phone number. This is the "Multiplatform Services" case described in
guideline 3.1.3(b): the service is bought in the real world and the app is
one way to consume it.

The shop section lists PHYSICAL goods only (books and practical materials,
delivered by hand). Physical goods are outside in-app purchase per 3.1.1.

A demo account with full access is provided above.
```

### Step 12.2 — Attach the build and submit

1. On the version page, scroll to **Build** → **+** → pick the build from Step
   10.3
2. Choose **Manually release this version** — so you decide when it goes live
3. **Add for Review** → **Submit to App Review**

⏱ Usually 24–48 hours.

### Step 12.3 — If it is rejected for 3.1.1

Do not resubmit unchanged, and do not panic. Go to **Resolution Center**:

1. Reply in writing, restating Step 12.1, and add that the school is a physical
   business, the app is free, and no digital goods are transacted anywhere.
2. Ask directly: *"Which in-app purchase would you expect here, given nothing is
   sold in the app?"* Forcing them to be specific often surfaces a
   misunderstanding.
3. If they hold firm, ask to escalate to the **App Review Board**.

**If Apple will not move**, your options are honestly only these:

- Ship iOS with the free content only, and no locked series
- Add Apple in-app purchase and give Apple 15–30%
- Stay Android-only

This is exactly why the top of this guide told you to decide before paying.

---

# PART 13 — Go live

### Step 13.1 — Release it

🌐 **BROWSER** → App Store Connect → your app

When the status turns **Pending Developer Release**, press **Release This
Version**.

⏱ It appears on the App Store within a few hours. Search takes up to 24 hours to
catch up, so use the direct link at first.

### Step 13.2 — Link AdMob to the live listing

🌐 **BROWSER** → AdMob → **Apps** → **codeboujida (iOS)** → **App settings** →
**Link to app store**

Search `com.codeboujida.app` and link it.

**Why:** AdMob serves very little to an unlisted app. Linking it is what turns
the fill rate from near-zero into something real — often within a day.

---

# PART 14 — Updating later

💻 **LAPTOP**

```bash
cd mobile
git pull
npx tsc --noEmit
git status                    # must be clean
eas build --profile production --platform ios
eas submit --profile production --platform ios
```

Then in App Store Connect: **+ Version**, write "What's New", attach the new
build, submit.

Apple reviews **every** update, though updates are usually faster than the first
submission.

⚠️ **Never change `com.codeboujida.app`.** A different bundle id is a different
app: existing users keep the old one and never receive updates.

---

# PART 15 — When something goes wrong

### "No suitable application records were found"
The bundle id in `app.json` does not match any app in App Store Connect. Check
Step 3.2, and that `eas whoami` and your Apple login are the right accounts.

### Build fails: "Provisioning profile doesn't include signing certificate"
Let EAS rebuild them:
```bash
eas credentials
```
→ iOS → production → **Build Credentials** → **Set up a new provisioning profile**.

### "Missing Info.plist key" after upload
The rejection email names the exact key. Send it to me and I will add it to
`app.json`.

### TestFlight stuck on "Processing" for over an hour
Check your **email**, not App Store Connect — Apple sends the real reason there.

### Push notifications never arrive
Three things must all be true, in this order: Push Notifications ticked on the
App ID (Step 3.1), an APNs key configured (Step 6.1), and the user granted
permission on the phone.

### Ads work on Android but not iOS
Separate ids. Run the Step 7.2 check — if `ios app id` starts
`ca-app-pub-3940256099942544` it is still Google's test publisher.

### No ad at all on a fresh AdMob unit
Normal for the first 24 hours, and near-total until Step 13.2 links the app to
the live listing. Set `forceTestAds: true` to prove the code works.

### "Guideline 2.1 — Information Needed"
Usually the reviewer could not sign in. Confirm the demo account still works and
that its 3-month subscription has not expired.

### Ad-hoc build says "Unable to install"
That iPhone's UDID was registered after the build was made. Register it, then
build again — the device list is fixed at build time.

---

# What to send me when you are ready

I can make every edit in Part 5 in one commit. I need:

1. `<APPLE_ID>` — the email for `eas submit`
2. `<APPLE_TEAM_ID>` — Step 1.5
3. `<ASC_APP_ID>` — Step 3.3
4. `<IOS_ADMOB_APP_ID>` (the `~` one) — Step 4.1
5. `<IOS_ADMOB_UNIT_ID>` (the `/` one) — Step 4.2
6. Whether you want **iPad support on** — it means supplying iPad screenshots
