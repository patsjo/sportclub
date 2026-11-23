# sportclub 2.7

This is a react app for sports like orienteering or any other sport, with the following key functionality:

- Dashboard, with news, calendar, map, facebook and race results
- News
- Calendar with map connection
- Maps
- Editable tracks with nice markings (and customized if wanted)
- Results with statistics, club/personal list, invoice verification, send invoice to members, and much more
- Member presentation, Stars, where we present each runners personal skils
- Integration to the swedish orienteering fedartion system Eventor (import results)
- Cups, with their own page and theme, seasons, races from Eventor, point systems, standings and race reports (see [Cups](#cups))
- Create/Edit custom webpages (user friendly, and can include images, tables and much more styling), and connect them into the menu
- Create/Edit external links into the menu
- Upload files, and connect them into the menu
- Administrate members
- Login with Eventor, Google, Facebook or Apple, guests can react (👍 👎 ❤️) and comment, and apply for membership (see [Login with Google, Facebook and Apple](#login-with-google-facebook-and-apple-reactions-and-comments))
- News and cup reports can use simple tags: links, bold, italic, underline, strikethrough, superscript and subscript

## License

This project is licensed under the GNU General Public License v2.0 (GPL-2.0).
See the LICENSE file for details.

## Contribute

It's free to use this as you like, but I will be happy if:

- You pay a small amount for all the time spent. 40000+ lines of code and 900+ hours. Swish between 50 SEK and 3500 SEK to 0723-750908 (Patrik Sjökvist).
- If you contribute with some development or testing.

## Clubs using sportclub / Samples

- [OK Orion](https://okorion.com/)
- [OK Norrvirdarna](https://oknorrvirdarna.se/)
- [Värend GN](https://varendgn.se/)
- [Njurunda OK](https://njurundaok.se/)

![OK Orion](readme/okorion.png)
![Map tracks](readme/map-tracks.png)
![Edit map tracks](readme/map-tracks-edit.png)
![OK Norrvirdarna](readme/oknorrvirdarna.png)
![Värend GN](readme/varendgn.png)
![Njurunda OK](readme/njurundaok.png)

_Please email patrik@sjokvistarna.se if your club has started to use this great webpage._

## Cups

Administrate club cups, e.g. a night cup or a youth cup, where every cup gets its own page.

![Cup with the halloween theme](readme/cup-nattcup.png)

- **Own page and theme** - every cup has its own address (`/cup/nattcupen`) and a comic book / graphic novel theme: Night, Halloween, Youth, Winter, Summer, Spring and Autumn. The colors of the cup can be changed, the club colors are available as presets. A race can have its own theme, and on the cup page the theme of the next race is used (e.g. a halloween premiere).
- **Seasons** - limited in time, all races must be within the dates of the season. The cup page shows the season closest in time.
- **Races** - chosen from Eventor (also the total result after a stage instead of the stage result), or added manually.
- **Categories of classes** - e.g. All, Youth classes, Beginners, with class patterns like `H1*`, one standing per class or one for the whole category, the order of the classes, and age limits (counted as in the orienteering classes, the year the season starts minus the year of birth).
- **Point systems** - points per position (20, 17, 15, ...), fixed points for the winner, based on the number of starters, run to 1000, time behind the winner or percent of the winner time. Lowest points, points for not approved and decimals.
- **Participants** - only the club members or everyone. With only club members, the positions for the points can be among everyone in the class or only among the club members. Participants from other clubs are only saved in the cup, never in the result tables of the club.
- **Counting** - max number of races counted in the season, and extra points for every additional finished race.
- **Results** - in first hand from the results the club already has imported. A race in the result import can be linked to one or more cup races, and the results are then saved to the cups automatically. Results can also be fetched from Eventor (all participants), or added and changed manually.
- **Standings** - a podium for the top three, a column per race with the counted points, and the same person is recognized over the whole season (also when entered on site without an Eventor id).
- **Pursuit** - the last race can be a pursuit: the leader starts first and the others after with a number of seconds per point behind (default 4), with a start time and a mass start (for those too far behind) per class. The result list can have individual times or times from the first start. The finish order is the final placing, shown as +time, and the start list can be exported to CSV.
- **Reports with images** - for every race and for the whole season.
- **Eventor links** - entry for the next races, and the results for the finished races.
- **Menu and toolbar** - every cup in the menu, and optionally as a button in the toolbar. The night themes give a black toolbar with the club logo in grayscale.

To use the cups, add the `Cup` module to your club config file:

```ts
{
  name: 'Cup',
  addUrl: 'https://yourclub.com/cup/save.php',
  deleteUrl: 'https://yourclub.com/cup/delete.php',
  updateUrl: 'https://yourclub.com/cup/save.php',
  queryUrl: 'https://yourclub.com/cup/jsonCupQuery.php'
}
```

## Visual Studio Code Setup

Download font "Fira Code" and use font ligatures, for a nice look and feel.

I use the following extensions

- ESLint
- Prettier - Code formatter
- Javascript (ES6) code snippets
- Simple React Snippets
- npm Intellisence
- Version Lens
- Bracket Pair Colorizer

and the following seetings:

```json
{
  "git.autofetch": true,
  "[php]": {
    "files.encoding": "utf8"
  },
  "[javascript]": {
    "editor.formatOnSave": true,
    "files.encoding": "utf8"
  },
  "versionlens.showDependencyStatusesAtStartup": true,
  "versionlens.showTaggedVersionsAtStartup": true,
  "prettier.printWidth": 120,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "git.confirmSync": false,
  "[javascriptreact]": {
    "editor.formatOnSave": true,
    "files.encoding": "utf8",
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "eslint.format.enable": true,
  "extensions.ignoreRecommendations": true,
  "editor.fontFamily": "Fira Code",
  "editor.fontLigatures": true,
  "editor.formatOnSave": true
}
```

## Howto get it up and running

1. You need a webhost that's supporting
   - PHP
   - MySql with InnoDB
2. Create all tables (within "mysql" folder). Create the cup tables (`cupTables.sql`) after the file and result tables, they refer to them. If you already have a database, run the patches in "mysql/patches" that you haven't run yet (e.g. `sportclub_patch_2.4.sql` for the cups and `sportclub_patch_2.5.sql` for the login with Google/Facebook, reactions and comments).
3. Copy all php scripts (within "php" folder) to your public html root folder
4. If you **not** using https://eventor.orientering.se/ as authorization provider (used by all orienteering clubs in sweden), you may need to update the following login files.
   - php/log_in.php
   - php/log_out.php
   - php/include/users.php
   - To also log in with Google, Facebook and Apple, see [Login with Google, Facebook and Apple](#login-with-google-facebook-and-apple-reactions-and-comments).
5. Create your own club config file in the "src/models/clubs" folder.
6. Change "src/App.tsx" to import your config instead. (import clubJson from './models/clubs/...';)
7. npm install
8. npm run build (or "npm run start" to just start it locally)
9. Copy "index.html" and "static" folder from the "dist" folder to your public html root folder.
10. Done!!

## Make tiled open streetmap images from Ocad

For this task I uses three programs

- OCad orienteering
- GIMP
- QGIS

First export from OCad:

1. Transform map
   - Rotate map to zero degrees, if it's rotated
   - Change coordinate system to Google Mercator (WGS84)
2. If you exporting course do the following
   - Add a grey boxarea where you put the results (purple text)
3. Export PNG
   - Include georeference file
   - 1,0m / pixel (0,5m / pixel for courses)

GIMP (map):

1. Remove surrounding areas that doesn't belong to the map and make them 100% transparent
2. Save
3. Copy that file (and the georeference file) to a purple only png file.
4. Open the purple only png file
   1. Colors > Adjust Contrast to -127
   2. Colors > Adjust Balance magenta (rgb 255, 0, 255) to -100
   3. Colors > Color to alpha (color: white, opacity threshold: 0,015)
   4. Select by color
   5. Edit stroke 20px (line color: rgb 132, 0, 142)
5. Save

GIMP (course):

1. Colors > Color to alpha (color: white, opacity threshold: 0)
2. Colors > Adjust Contrast to +127
3. Colors > Color to alpha (color: white, blending opacity: 20,0)

QGIS:

1. Add png file(s)
   - Drag it into map
   - (Use openstreetmap layer to see that your layer ends up correctly)
   - Edit properities for map layer
     - Rendering > Set min scale to 1:20000
     - Symbology > Resampling Cubic + Oversampling 4,0
   - Edit properities for purple map layer
     - Rendering > Set max scale to 1:20000
     - Symbology > Resampling Cubic + Oversampling 4,0
   - Edit properities for course layer
     - Symbology > Resampling Linear + Oversampling 4,0
2. Raster > Generate XYZ tiles
   - Only show the layers you want to export (all maps at once, or one course layer at a time)
   - Extent > By your layer is a simple choice
   - Minimum zoom: 7 (12 for course layer)
   - Maximum zoom: 17
   - Set Output directory
3. You can remove \*.png files that are totally empty (1,21 kB)

## Login with Google, Facebook and Apple, reactions and comments

Besides the login with Eventor (or your own user/password), visitors can log in with Google, Facebook and/or Apple (each one can be turned on by itself).

- **Guests** - an account from Google/Facebook/Apple that isn't linked to a user is a guest. A guest can only react (👍 👎 ❤️) and comment, everything else needs a user. Nothing about a guest is saved on the server (not in the database and not in a session) until the guest reacts, comments or asks for access, the login is a token signed by the server that only the browser keeps.
- **Stays logged in** - a login with Google, Facebook or Apple is remembered until the user logs out. With `googleClientId` in the club config, Google also logs in automatically ("One Tap"): the first time Google asks which account to use (if there are several), after that the same account is logged in automatically, every time the page is opened and also in a new browser. After a logout Google asks again (choose the account, or "Continue as" when there is only one), then it is automatic again. Facebook and Apple have no automatic login for web pages, the login is remembered instead.
- **Access requests** - a guest can apply for membership, or for an access group (e.g. Coach). A logged in member can also request an access group. The requests are found by the administrators under _Users → Accounts_, and the administrator is told about them after the login.
- **Linking** - the administrator approves a request (or links any account) to an existing user, or creates a new user from the name and email of the account. The user can also be linked to a competitor, used e.g. to renounce results when the user has no Eventor login. The reactions and comments made as a guest follow to the user.
- **Reactions and comments** - on news and banners, calendar activities, the map on the dashboard, and on the cup pages (every report and every race). Everyone can read the comments and see the counts, users and guests can react and comment, and click on a count to see who reacted. You can delete your own comments, an administrator can delete all.
- **Login tokens** - the password is never saved in the browser. The login gives a random token (only its hash is saved in the database), that the page sends as `Authorization: Bearer <token>`. Without _Remember me_ the token lives one day after it was last used (only in that browser tab), with _Remember me_ 90 days. A login saved by an older version is changed to a token automatically the first time.

Both Google and Facebook login are free to use, neither charges for login (no billing account or paid API key is needed). Facebook does however require a _Business verification_ of the club (see below), that is free too. Sign in with Apple needs a membership in the Apple Developer Program, that normally costs 99 USD a year, but non profit organisations can apply for a fee waiver (see [Apple](#4-apple)).

### 1. Database

Run `mysql/patches/sportclub_patch_2.5.sql` (a new database gets the same from `userTables.sql` and `socialTables.sql`).

### 2. Google

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project (e.g. "OK Orion web").
2. Open **Google Auth Platform** (APIs & Services → OAuth consent screen) and click _Get started_:
   - **Branding** - app name, support email, the home page, a privacy policy page and the authorized domain (e.g. `okorion.com`). Skip the logo, a logo means Google has to verify the app first.
   - **Audience** - _External_, then _Publish app_ (In production). The login only asks for `openid`, `email` and `profile`, they are non sensitive and need no verification by Google.
3. **Clients → Create client**, type _Web application_.
   - **Authorized redirect URIs** - `https://yourclub.com/oauth/google.php` (add `https://www.yourclub.com/oauth/google.php` too if the page is also used with www).
   - **Authorized JavaScript origins** - needed for the automatic login (without them Google answers "Error 401: invalid_client", the login button still works), the pages it is used on: `https://yourclub.com`, `https://www.yourclub.com`, and while developing `http://localhost` and `http://localhost:5173`.
4. Copy the **Client ID** and **Client secret** to `GetGoogleClientId()` and `GetGoogleClientSecret()` in `php/include/oauthKeys.php`. The Client ID (not the secret) also goes to `googleClientId` in the club config file, for the automatic login.

### 3. Facebook

1. Go to [Meta for Developers](https://developers.facebook.com/apps/), log in with Facebook and register as a developer if you haven't.
2. **Create app** → use case _Authenticate and request data from users with Facebook Login_ (app type _Consumer_ if asked).
3. **Use cases → Facebook Login → Customize**
   - **Permissions** - add `email` (`public_profile` is already there).
   - **Settings** - _Valid OAuth Redirect URIs_: `https://yourclub.com/oauth/facebook.php`. _Client OAuth login_, _Web OAuth login_, _Enforce HTTPS_ and _Use Strict Mode for redirect URIs_ on.
4. **App settings → Basic** - App domains (`yourclub.com`), a _Privacy Policy URL_, _User data deletion_ (an URL to a page that tells how to get your data deleted, e.g. "email the club, we delete the account under Users → Accounts"), category and an icon. Copy the **App ID** and **App Secret** to `GetFacebookAppId()` and `GetFacebookAppSecret()` in `php/include/oauthKeys.php`.
5. **Business verification** - Facebook requires that the club (the business portfolio that owns the app) is verified before the app can be used by everyone. Do it in [Meta Business Suite](https://business.facebook.com/) → _Settings → Business info → Business verification_, with the club's legal name, address, phone and organisation number, and a document that shows them (e.g. the registration certificate or a bill to the club). It's free and usually takes a few days. Then link the app to the verified business portfolio under **App settings → Basic**.
6. **Publish** the app (switch from _Development_ to _Live_), otherwise only you and the app testers can log in.
7. Facebook removes old versions of the Graph API after about two years, keep `GetFacebookGraphVersion()` in `oauthKeys.php` updated.

### 4. Apple

Sign in with Apple is mostly used by iPhone and Mac users, and lets them hide their email (Apple then gives a relay address, `...@privaterelay.appleid.com`).

**The membership and the fee waiver.** Sign in with Apple needs a membership in the [Apple Developer Program](https://developer.apple.com/programs/), enrolled as an **organisation** (not as an individual, then your private name is shown to the users). The membership normally costs 99 USD a year, but Apple offers a **fee waiver for non profit organisations**, and it also applies to Swedish organisations (e.g. an ideell förening) that meet the requirements:

- The club is a legal entity that is a non profit organisation, e.g. registered with an _organisationsnummer_ at Skatteverket (or Bolagsverket).
- The club has a **D-U-N-S number** (free, Apple checks the legal entity with it). Look it up or apply for it with the [D-U-N-S lookup at Apple](https://developer.apple.com/enroll/duns-lookup/), it can take a couple of weeks.
- The person enrolling has an Apple Account with two-factor authentication, and the right to sign agreements for the club (e.g. the chairman, or someone with a power of attorney from the board).
- No paid apps or in-app purchases, the waiver is for organisations that don't charge for their apps. A login on the web page is fine.

How to do it:

1. Get the D-U-N-S number for the club (see above).
2. Apply for the fee waiver on [Membership fee waivers](https://developer.apple.com/support/membership-fee-waiver/) _before_ you pay for the enrollment, with the club's documents (e.g. the registration certificate and the statutes that tell that the club is non profit). Apple answers by email, then the club enrolls without paying.
3. If the waiver isn't approved, the club can still enroll and pay 99 USD a year.

**The setup** (in [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list), when the membership is active):

1. **Identifiers → + → App IDs**, type _App_. A description (e.g. "OK Orion") and a Bundle ID (e.g. `com.okorion.app`), check **Sign in with Apple**. The App ID is needed even without an app, the Services ID below is grouped under it.
2. **Identifiers → + → Services IDs**. A description (shown to the users when they log in, e.g. "OK Orion") and an identifier (e.g. `com.okorion.web`), this is the client id. Check **Sign in with Apple → Configure**:
   - **Primary App ID** - the App ID above.
   - **Domains and Subdomains** - `yourclub.com` (and `www.yourclub.com` if it is used).
   - **Return URLs** - `https://yourclub.com/oauth/apple.php`. Apple doesn't allow `localhost`, but that isn't needed, the return URL is always the server, also while developing locally.
3. **Keys → +**. A name, check **Sign in with Apple → Configure** and choose the App ID above. Download the key file `AuthKey_<Key ID>.p8`, it can only be downloaded once, keep it safe.
4. In `php/include/oauthKeys.php`:
   - `GetAppleTeamId()` - the Team ID (top right on the developer page, or under _Membership details_).
   - `GetAppleServicesId()` - the identifier of the Services ID, e.g. `com.okorion.web`.
   - `GetAppleKeyId()` - the Key ID of the key.
   - `GetApplePrivateKey()` - the whole content of the `.p8` file, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines (see the example in the file).

Good to know:

- Apple only sends the name the **first time** someone logs in to the club, the email is sent every time. A guest that hasn't reacted yet, and logs in again on another device, is called "Apple" until the name comes again.
- The relay address only forwards emails from domains registered under _Sign in with Apple for Email Communication_ at Apple. The web page doesn't send emails to the guests, but if the club wants to email members that use a relay address, register the domain there.
- The membership must be renewed every year (also with a fee waiver), otherwise the login with Apple stops working.

### 5. The server

In `php/include/oauthKeys.php` (permissions 0600, like `eventorApiKey.php`):

- The keys from Google, Facebook and Apple above. Leave a key empty to turn the provider off. An `oauthKeys.php` from an older version without the Apple functions works too, then Apple is off.
- `GetOAuthAllowedReturnOrigins()` - the pages that may get the login back, e.g. `https://yourclub.com`, `https://www.yourclub.com` and `http://localhost:5173` while developing. Empty means the same host as the PHP scripts. The redirect URI at Google/Facebook/Apple is always the server, also while developing locally.
- `GetLoginTokenSecret()` (optional) - signs the logins of guests. Empty uses the Google/Facebook/Apple secrets instead. Changing it, or the secrets, logs out all guests.

Never put the secrets in the club config file in `src/models/clubs`, it is sent to every browser.

### 6. The club config file

Add to e.g. `src/models/clubs/okorion.ts` (remove `googleUrl`, `facebookUrl` or `appleUrl` to hide that button, remove `social` to turn off reactions and comments):

```ts
socialLogin: {
  googleUrl: 'https://yourclub.com/oauth/google.php',
  googleClientId: '1234567890-abc123.apps.googleusercontent.com', // the automatic Google login, remove to turn it off
  facebookUrl: 'https://yourclub.com/oauth/facebook.php',
  appleUrl: 'https://yourclub.com/oauth/apple.php',
  accountsUrl: 'https://yourclub.com/users/accounts.php'
},
social: {
  queryUrl: 'https://yourclub.com/social/jsonSocialQuery.php',
  updateUrl: 'https://yourclub.com/social/save.php'
},
```

The names of the ones who comment are shown to everyone, tell about it (and about Google/Facebook/Apple) in the privacy policy of the club. The automatic Google login loads Google's script (`accounts.google.com/gsi/client`) for visitors that aren't logged in, mention that too.

## Invoices and Swish

Invoices on the web page that the members pay with Swish. Every logged in user sees and can pay the invoices of the whole family under _My invoices_: to the user, to the competitor linked to the user, to the family of that competitor, and to the other competitors in the family and their users. The reminders go to the same users. A warning is shown at the top of every page when the user has overdue invoices.

- **Who can do what** - an administrator (group 1) and the economy responsible (group 8000, _Ekonomiansvarig_) create invoices and see all of them under _Invoices (economy)_. Only the economy responsible changes the status, sends reminders and deletes. The amount is what is paid now (negative = paid back) and the date is required (the payment date, the refund date, the cancellation date or the date of the status change): paid = what is left, partly paid = less than what is left, overpaid = more than what is left, refunded = negative (at most what is paid), back to unpaid = all that is paid back. Only another status can be selected (except a new partial payment or refund), cancelled only when nothing is paid (otherwise refunded), and partly paid or overpaid one invoice at a time. Every change is saved in the history with the date and who made it. The economy responsible can't be requested (like the administrators), an administrator adds the user to the group.
- **Paid with Swish** - the member clicks _Pay with Swish_, scans the QR code (or the Swish app opens on the mobile). When Swish says the payment is done the invoice is paid automatically, with the amount from Swish. Two payments of the same invoice gives overpaid. A partly paid invoice is shown as _Partly paid_ with what is left to pay, Swish then pays the rest.
- **A new invoice** - title, message (`{namn}` is replaced with the name of each recipient), due date, the invoice fee (default 3,00 kr, `invoiceFee` in the club config), an amount per person and per family, and the recipients (users and families, with buttons for all families, no families and so on). The invoice date is today. Invoices that nobody has paid can be deleted (select one or several), otherwise they must be cancelled. When the last invoice of a batch is deleted the batch is deleted too.
- **Event fees** - _Results → Create invoices for event fees_ creates invoices from the event fees, one per family or competitor, with the races as a specification. The period should start the day after the last invoiced period, another start date is allowed but gives a warning (overlap or gap), and it must end at least two days ago.
- **Reminders** - sent by email to the users that see the invoice. The server must be able to send emails with PHP `mail()`.

### 1. Database

Run `mysql/patches/sportclub_patch_2.6.sql` (a new database gets the same from `userTables.sql` and `invoiceTables.sql`). The group _Ekonomiansvarig_ (8000) is created, add the economy responsible to it under _Users_.

### 2. Swish Handel

The API needs **Swish Handel** (Swish for merchants), not Swish Företag. Ask the bank for a Swish Handel agreement on the club's Swish number (or a new number), and to register a certificate administrator (a person with BankID). Then:

1. Log in to [Swish Certificate Management](https://portal.swish.nu/) with BankID (the person the bank has registered as certificate administrator).
2. Create a certificate signing request (CSR) on the server or your computer, e.g. `openssl req -new -newkey rsa:4096 -nodes -keyout swish.key -out swish.csr`, upload the CSR and download the certificate (PEM). Keep `swish.key` secret, it never leaves the server.
3. Download `Swish_TLS_RootCA.pem` from [developer.swish.nu](https://developer.swish.nu/).
4. Put the files outside the web root (e.g. `/home/yourclub/swish/`), permissions 0600.
5. The certificate is valid for two years, create a new one before it expires.

**Test first** in the Swish test environment (MSS): the test certificate and the test Swish number `1234679304` are on [developer.swish.nu](https://developer.swish.nu/) under _Test environment_, and `GetSwishApiUrl()` is `https://mss.cpc.getswish.net/swish-cpcapi/api`. No money is paid in MSS, the payment is paid automatically after a few seconds.

### 3. The server

In `php/include/swishKeys.php` (permissions 0600, like `oauthKeys.php`):

- `GetSwishPayeeAlias()` - the Swish number of the club, only digits. Empty turns Swish off (the invoices still work, they are marked as paid by the economy responsible).
- `GetSwishApiUrl()` - production or test (MSS).
- `GetSwishCertificateFile()`, `GetSwishKeyFile()`, `GetSwishKeyPassword()` and `GetSwishCaFile()` - the certificate, the key and the root certificate above.
- `GetSwishCallbackUrl()` - `https://yourclub.com/invoices/swishCallback.php`. Swish posts the result there, it must be https on port 443 with a valid certificate. The callback is never trusted, the server asks Swish about the payment with the certificate before the invoice is paid.
- `GetInvoiceEmailFrom()` - the sender of the reminders, e.g. `OK Orion <ekonomi@okorion.com>` (an address on the same domain as the server, otherwise the emails are often stopped as spam).
- `GetInvoiceWebUrl()` - the page with _My invoices_, sent in the reminders, e.g. `https://yourclub.com/invoices`.

PHP needs the `curl` extension.

### 4. The club config file

```ts
invoice: {
  ...
  url: 'https://yourclub.com/invoices/invoices.php', // remove to turn off the invoices on the web page
  invoiceFee: 3 // the invoice fee added to every invoice
},
```

## Menu order

An administrator drags the top level of the menu in the order that everyone sees, under _My pages → Administration → Menu order_. Dividers can be moved, added and deleted. _My pages_ (logged in) and _Login_ (not logged in) share the same place. New menu items (a new page, folder or module) are put after the item before them in the default order. _Reset to default order_ and save goes back to the default order, then new menu items keep their default place.

### 1. Database

Run `mysql/patches/sportclub_patch_2.7.sql` (a new database gets the same from `settingsTables.sql`).

### 2. The club config file

```ts
settings: {
  queryUrl: 'https://yourclub.com/settings/jsonSettingsQuery.php',
  saveUrl: 'https://yourclub.com/settings/save.php'
},
```

Without `settings` the menu is shown in the default order. If the order can't be loaded (e.g. the patch isn't run), the menu is shown in the default order and a warning with the url is written in the console of the browser.
