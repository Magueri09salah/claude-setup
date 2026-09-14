# Publishing codeboujida on the App Store

The iOS companion to `DEPLOY-MOBILE.md`. Same style: every command says **where**
you run it and **why**, every Console step says **what to click**.

**Do Android first.** It is cheaper, faster, and far more forgiving. Come here
once the Play listing is live.

---

## Read this before you spend anything

### You do NOT need a Mac

EAS builds iOS apps on Apple hardware in the cloud. Your Windows laptop is fine.

### You DO need $99 a year

This is the part that has no way around it:

| What you want | Costs | Works on your setup? |
|---|---|---|
| **Simulator build** (`.app`) | Free, no Apple account | ❌ Only runs in the iOS Simulator, **which only exists on a Mac** |
| **Internal / ad-hoc build** | **$99/year** | ✅ Installs on iPhones whose UDID you register |
| **TestFlight** | **$99/year** | ✅ The real equivalent of your Android `preview` build |
| **App Store** | **$99/year** | ✅ |

So: there is no free way to get this app onto an iPhone from a Windows machine.
The one free option needs a Mac you do not have.

The $99 is a yearly subscription, not a one-off like Google's $25. If you stop
paying, your app is **removed from the App Store**.

### ⚠️ The risk worth knowing before you pay

Your app unlocks its content when the owner adds a phone number to the
allowlist, after the candidate contacts the school on WhatsApp. Google accepted
this framing. **Apple is much stricter**, and this is the single most likely
reason for rejection.

Apple's guideline **3.1.1** says digital content unlocked inside an app must be
sold through Apple's in-app purchase, with Apple taking 15–30%. Apple's
reviewers routinely reject apps that unlock paid digital content bought
elsewhere.

Your defence is guideline **3.1.3(b) Multiplatform Services**: access is granted
as part of enrolment at a physical driving school, the enrolment is a real-world
service, and nothing is ever sold inside the app. That is a legitimate
exemption — but it is an argument you may have to *make*, possibly more than
once. Part 10 gives you the exact wording.

**Be realistic:** budget for one or two rejections and a few rounds of replies.
If you cannot accept that risk, stay on Android.

---

## Placeholders

| Placeholder | What it is | Yours |
|---|---|---|
| `<APPLE_ID>` | The Apple ID email that owns the developer account ⚠️ permanent | |
| `<APPLE_TEAM_ID>` | 10 characters, from the Apple developer portal | |
| `<ASC_APP_ID>` | The numeric App Store Connect app id | |
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

# PART 1 — The Apple Developer Program

### Step 1.1 — Get an Apple ID with two-factor on

🌐 **BROWSER** → [appleid.apple.com](https://appleid.apple.com)

Use an address you will keep for years. Everything — the apps, the
certificates, the money — is tied to it permanently.

Turn on **two-factor authentication**. Apple will not let you enrol without it,
and you will be typing codes constantly from here on.

### Step 1.2 — Choose individual or organization ⚠️ decide carefully

🌐 **BROWSER** → [developer.apple.com/programs](https://developer.apple.com/programs/) →
**Enroll**

| | Individual | Organization |
|---|---|---|
| Seller name on the store | **your own legal name** | the company name |
| Extra paperwork | none | **D-U-N-S number**, legal entity proof |
| Time to approve | hours to a few days | **1–4 weeks** |

⚠️ **You cannot convert an Individual account into an Organization later** — you
start over with a new account, and the app's ownership moves with it.

If the driving school is a registered company and you want the store to say
"Auto Ecole Boujida" rather than your personal name, get the D-U-N-S number
first at [dnb.com](https://www.dnb.com/duns-number.html) (free, but slow).

### Step 1.3 — Pay and wait

$99. Apple verifies your identity, sometimes with a phone call.

✅ You are done when [developer.apple.com/account](https://developer.apple.com/account)
shows **Certificates, Identifiers & Profiles** in the sidebar.

### Step 1.4 — Write down your Team ID

🌐 **BROWSER** → [developer.apple.com/account](https://developer.apple.com/account) →
**Membership details**

Copy the **Team ID** — 10 characters like `A1B2C3D4E5`. That is
`<APPLE_TEAM_ID>`. You need it in Part 6.

### Step 1.5 — Accept the agreements

🌐 **BROWSER** → [appstoreconnect.apple.com](https://appstoreconnect.apple.com) →
**Business** (or **Agreements, Tax, and Banking**)

Accept the **Free Applications** agreement.

**Why:** an unaccepted agreement silently blocks your app from ever going live,
and App Store Connect does not warn you until the end.

Your app is free, so you do **not** need the Paid Applications agreement, and
you do **not** need to give Apple your bank details.

---

# PART 2 — Prepare the code for iOS

Right now `app.json` has only an icon and a bundle identifier for iOS. These
are the pieces it is missing. **Ask me to make these changes** — each needs a
value only you can get, and getting one wrong costs a 20-minute build.

### Step 2.1 — What has to be added

| Setting | Why it is needed |
|---|---|
| `ios.supportsTablet` | The app already has landscape/tablet layouts. Without this Apple reviews it as iPhone-only and it runs letterboxed on iPad. |
| `ios.infoPlist.ITSAppUsesNonExemptEncryption: false` | Skips the export-compliance question on **every single upload**. The app only uses HTTPS, which is exempt. |
| `ios.config.usesNonExemptEncryption` | Same answer, older key. |
| `iosAppId` in the AdMob plugin | Currently Google's **test** id. Part 3. |
| `extra.admob.iosInterstitialUnitId` | Currently empty. Part 3. |
| `skAdNetworkItems` | Lets advertisers measure installs on iOS. Without it, iOS ad revenue is markedly worse. |
| `eas.json` → `submit.production.ios` | Apple ID, Team ID and App Store Connect app id, so `eas submit` works. |

### Step 2.2 — What is already done

Nothing to do here — listed so you know it is covered:

- ✅ Bundle identifier `com.codeboujida.app`
- ✅ App icon (iOS uses the opaque `app-icon.png`, not the Android adaptive one)
- ✅ Account deletion, which Apple requires exactly as Google does
- ✅ No microphone permission
- ✅ No payment UI anywhere in the app
- ✅ `appVersionSource: "remote"`, so build numbers increment themselves

---

# PART 3 — AdMob for iOS

Your Android ad setup does **not** carry over. iOS is a separate app inside
AdMob, with its own app id and its own ad unit.

### Step 3.1 — Add the iOS app in AdMob

🌐 **BROWSER** → [admob.google.com](https://admob.google.com) → **Apps** → **Add app**

1. Platform: **iOS**
2. "Is your app listed on a supported app store?" → **No** (not yet)
3. App name: `codeboujida`
4. **Add app** → **Done**

Copy the **App ID** from **App settings** — it has a **`~`** in it.

### Step 3.2 — Create the iOS interstitial unit

**Apps → codeboujida (iOS) → Ad units → Add ad unit**

1. Format: **Interstitial**
2. Name: `end-of-series`
3. **Create ad unit**

Copy the **Ad unit ID** — it has a **`/`** in it.

⚠️ Same trap as Android: `~` is the app, `/` is the unit. Keep them apart.

### Step 3.3 — About the tracking prompt

You may have seen iOS apps ask *"Allow codeboujida to track you across other
apps?"*. **Yours will not, and should not.**

The app requests **non-personalised ads only** (`requestNonPersonalizedAdsOnly:
true` in `src/ads/interstitial.ts`), which does not touch the advertising
identifier. No tracking, so no prompt, and no App Tracking Transparency
paperwork.

The trade-off: non-personalised ads pay less. Adding the prompt later is a real
option once the app has users — it needs an ATT permission string, a consent
flow, and an update to the App Privacy answers in Part 9.

### Step 3.4 — app-ads.txt already covers iOS

Nothing to do. The file at `https://codeboujida.com/app-ads.txt` is per
*publisher*, not per platform, and your publisher id is the same. It already
covers the iOS app.

---

# PART 4 — Create the app in App Store Connect

### Step 4.1 — Register the bundle identifier

🌐 **BROWSER** → [developer.apple.com/account/resources/identifiers](https://developer.apple.com/account/resources/identifiers) →
**+**

1. **App IDs** → **Continue** → **App** → **Continue**
2. Description: `codeboujida`
3. Bundle ID: **Explicit** → `com.codeboujida.app`
4. Capabilities: tick **Push Notifications**
5. **Continue** → **Register**

**Why do it by hand:** EAS can create this for you, but it will not tick Push
Notifications, and a missing capability produces a build that installs fine and
then never receives a notification.

### Step 4.2 — Create the app record

🌐 **BROWSER** → [appstoreconnect.apple.com](https://appstoreconnect.apple.com) →
**Apps** → **+** → **New App**

| Field | Value |
|---|---|
| Platforms | **iOS** |
| Name | `codeboujida` — must be unique across the whole App Store |
| Primary language | **Arabic** (or French, whichever you want the listing in) |
| Bundle ID | `com.codeboujida.app` |
| SKU | `codeboujida-ios` — internal only, never shown |
| User Access | **Full Access** |

**Create**.

⚠️ If the name is taken, Apple says so here. Pick a variation — the *display*
name can differ from the bundle id, which is fixed.

### Step 4.3 — Copy the App Store Connect app id

Once created, look at the browser URL:

```
https://appstoreconnect.apple.com/apps/6740123456/appstore/...
                                        ^^^^^^^^^^
```

That number is `<ASC_APP_ID>`. You need it for `eas submit`.

---

# PART 5 — Push notifications (APNs)

Android used Firebase. iOS uses Apple's own service, and EAS can set the whole
thing up for you.

### Step 5.1 — Let EAS create the key

💻 **LAPTOP** — in the `mobile` folder:

```bash
eas credentials
```

1. Platform → **iOS**
2. Build profile → **production**
3. → **Push Notifications: Manage your Apple Push Notifications Key**
4. → **Set up your Push Notifications Key**
5. Log in with `<APPLE_ID>` when asked

✅ It reports a configured APNs key. `Ctrl+C` to exit.

**Why let EAS do it:** Apple lets you download a `.p8` push key **exactly
once**, ever. Lose the file and you must revoke and regenerate. EAS stores it
for you and never needs you to handle the file.

⚠️ Apple allows a maximum of **2 APNs keys per account**. Do not generate
spares "to test" — you will lock yourself out of making the one you need.

---

# PART 6 — Check everything before building

💻 **LAPTOP** — in the `mobile` folder.

### Step 6.1 — Does it compile?

```bash
npx tsc --noEmit
```
✅ Prints nothing.

### Step 6.2 — Is the iOS config right?

```bash
node -e "const e=require('./app.json').expo; const p=e.plugins.find(x=>Array.isArray(x)&&x[0]==='react-native-google-mobile-ads'); console.log('bundle id   :',e.ios.bundleIdentifier); console.log('ios app id  :',p[1].iosAppId); console.log('ios unit id :',e.extra.admob.iosInterstitialUnitId||'(test)'); console.log('forceTestAds:',e.extra.admob.forceTestAds===true?'ON  <-- must be false before release':'off')"
```

✅ For the **release** build:

| | Required |
|---|---|
| `bundle id` | `com.codeboujida.app` |
| `ios app id` | your own, contains a **`~`** |
| `ios unit id` | your own, contains a **`/`** |
| `forceTestAds` | **off** |

❌ An `ios app id` starting `ca-app-pub-3940256099942544` is still Google's test
publisher. Real ads will never show.

### Step 6.3 — Native libraries consistent?

```bash
npx expo-doctor
```
✅ `18/18 checks passed`.

⚠️ Necessary but not sufficient — it once reported 18/18 while a library was
crashing the Android release build on launch. Only TestFlight on a real iPhone
proves anything.

### Step 6.4 — Is everything committed?

```bash
git status
```
✅ Must be clean. **EAS builds from git, not from your disk.**

---

# PART 7 — Build it

### Step 7.1 — Start the build

💻 **LAPTOP**

```bash
eas build --profile production --platform ios
```

The first time, EAS asks to log in to Apple and then offers to create the
signing certificate and provisioning profile. Say **yes** to everything —
letting EAS manage credentials is the whole point.

⏱ Roughly 20–30 minutes, longer than Android.

### Step 7.2 — Back up nothing, but understand this

Unlike Android, there is no keystore file you must guard. Apple certificates
can be revoked and regenerated from your developer account at any time, so
losing one is an inconvenience, not a catastrophe.

What you **cannot** recover is the Apple Developer account itself. Keep
`<APPLE_ID>` and its 2FA device safe.

### Step 7.3 — Upload to App Store Connect

💻 **LAPTOP**

```bash
eas submit --profile production --platform ios
```

It asks for `<APPLE_ID>`, then an **app-specific password**. That is not your
normal Apple password — generate one at
[appleid.apple.com](https://appleid.apple.com) → **Sign-In and Security** →
**App-Specific Passwords** → **+**.

✅ Ends with the build uploaded.

### Step 7.4 — Wait for processing

🌐 **BROWSER** → App Store Connect → your app → **TestFlight**

The build shows **"Processing"** for 5–30 minutes. This is Apple scanning it,
not a problem.

❌ If you get an email saying the build was rejected during processing, it is
almost always a missing Info.plist key. The email names it exactly.

---

# PART 8 — Test through TestFlight

### Step 8.1 — Add yourself as an internal tester

🌐 **BROWSER** → **TestFlight** → **Internal Testing** → **+** next to Testers

Add `<APPLE_ID>`. Internal testers (up to 100) need **no review** and get the
build immediately.

### Step 8.2 — Install it

📱 **ON THE IPHONE** — install **TestFlight** from the App Store, sign in with
`<APPLE_ID>`, and your app is waiting.

### Step 8.3 — Test properly

Do not skip this. Check specifically:

- [ ] It opens without crashing (the Android build crashed twice on launch)
- [ ] Register a new account, then log in with the phone number
- [ ] Series appear — free ones open, locked ones show the قفل card
- [ ] Finish a series: the ad appears, then the score
- [ ] The correction screen plays its audio
- [ ] **Rotate to landscape** on every quiz screen
- [ ] Arabic text is right-aligned everywhere, nothing reversed or clipped
- [ ] الإعدادات → حذف حسابي نهائياً actually deletes
- [ ] Turn the timer off in settings, confirm no countdown appears
- [ ] Kill the app, reopen offline — content still there

⚠️ **Test on a real iPhone, not just the newest one.** If the owner's phone is
old, test on that: it is the floor your candidates will be on.

---

# PART 9 — The App Store forms

🌐 **BROWSER** → App Store Connect → your app → **App Store** tab.

### Step 9.1 — App Privacy ⚠️ must match Android

**App Privacy** → **Get Started**

| Data | Collected | Linked to identity | Used for tracking | Purpose |
|---|---|---|---|---|
| **Phone Number** | Yes | Yes | No | App Functionality |
| **Name** (the username) | Yes | Yes | No | App Functionality |
| **Other Data** (3 ID digits) | Yes | Yes | No | App Functionality |
| **Product Interaction** (quiz results) | Yes | Yes | No | App Functionality |
| **Device ID** | Yes | **No** | **No** | **Third-Party Advertising** |

⚠️ **Device ID is the row the ads create.** AdMob reads a device identifier and
sends it to advertisers, so it must be declared. Mark **"Used for tracking" =
No** — correct, because the app requests non-personalised ads only. If you ever
add the ATT prompt (Step 3.3), this answer must change to **Yes**.

Also set the deletion URL: `https://codeboujida.com/legal/account-deletion.html`

### Step 9.2 — Age rating

**Age Rating** → **Edit**

Everything **None** / **No** — no violence, no sexual content, no profanity, no
gambling, no user-generated content, no unrestricted web access.

There is a question about **advertising**: answer honestly that the app
contains third-party ads.

✅ You should land on **4+**.

### Step 9.3 — The listing

| Field | What to put |
|---|---|
| Subtitle | 30 characters, Arabic, e.g. `دروس ورموز السياقة` |
| Promotional text | 170 chars, changeable without review |
| Description | What the app does. **Do not mention prices, WhatsApp payments, or subscriptions.** |
| Keywords | 100 characters total, comma-separated, no spaces |
| Support URL | `https://codeboujida.com` |
| Marketing URL | optional |
| Privacy Policy URL | `https://codeboujida.com/legal/privacy.html` |

⚠️ **The description is read by the reviewer.** Anything that sounds like
selling digital access inside the app hands them a reason to invoke 3.1.1.
Describe it as exam preparation material provided by the driving school.

### Step 9.4 — Screenshots ⚠️ the fiddly part

Apple requires **exact pixel dimensions**, and rejects anything else.

| Device | Size | Required? |
|---|---|---|
| iPhone 6.9" (16 Pro Max) | 1320 × 2868 | **Yes** |
| iPad 13" | 2064 × 2752 | **Yes, if `supportsTablet` is on** |

Take them from TestFlight on a real device, or from the Simulator if you can
borrow a Mac. Minimum 3 per size, maximum 10.

**Why iPad matters:** turning on `supportsTablet` (Step 2.1) obliges you to
supply iPad screenshots. If you would rather skip that work for version 1,
leave tablet support off — but the app does have tablet layouts already, so it
is a shame to waste them.

### Step 9.5 — App Review Information

This is where you hand the reviewer an account and get ahead of 3.1.1.

| Field | Value |
|---|---|
| Sign-in required | **Yes** |
| Phone | `<DEMO_PHONE>` |
| Password | `<DEMO_PASSWORD>` |
| Contact | your name, email, phone |

⚠️ **Unlock the demo account before you submit** — admin panel → المستخدمون →
find the number → **تجديد 3 أشهر**. A reviewer who hits a locked screen
rejects the app for "incomplete functionality", and that also invites the
payment question.

---

# PART 10 — Submit, and the 3.1.1 argument

### Step 10.1 — Notes for the reviewer

Paste this into **Notes** in App Review Information. It is the single highest
value thing in this guide.

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

### Step 10.2 — Submit

**Add for Review** → **Submit to App Review**.

Choose **manual release** rather than automatic, so you decide when it goes
live after approval.

⏱ Usually 24–48 hours.

### Step 10.3 — If it is rejected for 3.1.1

Do not resubmit unchanged and do not panic. In **Resolution Center**:

1. Reply in writing, restating Step 10.1 and adding: the school is a physical
   business, the app is free, no digital goods are transacted.
2. Ask directly: *"Which in-app purchase would you expect here, given nothing
   is sold?"* Making them be specific often surfaces a misunderstanding.
3. If they hold firm, ask to escalate to the **App Review Board**.

**If Apple will not move**, your options are, honestly:

- Remove the locked content from iOS entirely and ship a free-only version
- Add Apple in-app purchase and give Apple 15–30%
- Stay Android-only

This is why "Read this before you spend anything" told you to budget for it
before paying the $99.

---

# PART 11 — Updating later

💻 **LAPTOP**

```bash
cd mobile
git pull
npx tsc --noEmit
git status                  # must be clean
eas build --profile production --platform ios
eas submit --profile production --platform ios
```

Then in App Store Connect: **+ Version**, write "What's New", attach the new
build, submit.

Every update goes through review again, though updates are usually faster than
the first submission.

⚠️ **Never change `com.codeboujida.app`.** A different bundle id is a different
app: existing users keep the old one and never get updates.

---

# PART 12 — When something goes wrong

### "No suitable application records were found"
The bundle id in `app.json` does not match any app in App Store Connect. Check
Step 4.2, and that you are logged into the right Apple team.

### "Invalid Swift Support" / "Missing Info.plist key"
The rejection email names the exact key. Tell me which one and I will add it to
`app.json`.

### Build succeeds, TestFlight says "Processing" forever
Over an hour is stuck. Check your email — Apple sends the real reason there,
not to App Store Connect.

### Push notifications never arrive
Three things must all be true: Push Notifications ticked on the App ID (Step
4.1), an APNs key configured in `eas credentials` (Step 5.1), and the user
actually granted permission on the phone. Check in that order.

### No ads on iOS but ads work on Android
The iOS app id and unit id are separate (Part 3). Run the Step 6.2 check — if
`ios app id` still starts `ca-app-pub-3940256099942544`, that is the test
publisher and real ads will never serve.

### "Guideline 2.1 — Information Needed"
Usually the reviewer could not sign in. Confirm the demo account still works
and that its subscription has not expired — it lasts 3 months and Apple may
review months after you first entered it.

---

# What I need from you to start

Give me these and I will make every code change in Part 2 in one commit:

1. `<APPLE_TEAM_ID>` — Step 1.4
2. `<ASC_APP_ID>` — Step 4.3
3. The Apple ID email for `eas submit`
4. iOS AdMob **app id** (`~`) and **interstitial unit id** (`/`) — Part 3
5. Whether you want **iPad support** on — it means supplying iPad screenshots
