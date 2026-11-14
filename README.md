# sportclub 2.5

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
- Login with Eventor, Google or Facebook, guests can react (👍 👎 ❤️) and comment, and apply for membership (see [Login with Google and Facebook](#login-with-google-and-facebook-reactions-and-comments))
- News and cup reports can use simple tags: links, bold, italic, underline, strikethrough, superscript and subscript

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

## Login with Google and Facebook, reactions and comments

Besides the login with Eventor (or your own user/password), visitors can log in with Google and/or Facebook.

- **Guests** - an account from Google/Facebook that isn't linked to a user is a guest. A guest can only react (👍 👎 ❤️) and comment, everything else needs a user. Nothing about a guest is saved on the server (not in the database and not in a session) until the guest reacts, comments or asks for access, the login is a token signed by the server that only the browser keeps.
- **Stays logged in** - a login with Google or Facebook is remembered until the user logs out. With `googleClientId` in the club config, Google also logs in automatically ("One Tap"): the first time Google asks which account to use (if there are several), after that the same account is logged in automatically, every time the page is opened and also in a new browser. After a logout Google asks again (choose the account, or "Continue as" when there is only one), then it is automatic again. Facebook has no automatic login for web pages, the login is remembered instead.
- **Access requests** - a guest can apply for membership, or for an access group (e.g. Coach). A logged in member can also request an access group. The requests are found by the administrators under _Users → Accounts_, and the administrator is told about them after the login.
- **Linking** - the administrator approves a request (or links any account) to an existing user, or creates a new user from the name and email of the account. The user can also be linked to a competitor, used e.g. to renounce results when the user has no Eventor login. The reactions and comments made as a guest follow to the user.
- **Reactions and comments** - on news and banners, calendar activities, the map on the dashboard, and on the cup pages (every report and every race). Everyone can read the comments and see the counts, users and guests can react and comment, and click on a count to see who reacted. You can delete your own comments, an administrator can delete all.
- **Login tokens** - the password is never saved in the browser. The login gives a random token (only its hash is saved in the database), that the page sends as `Authorization: Bearer <token>`. Without _Remember me_ the token lives one day after it was last used (only in that browser tab), with _Remember me_ 90 days. A login saved by an older version is changed to a token automatically the first time.

Both Google and Facebook login are free to use, neither charges for login (no billing account or paid API key is needed). Facebook does however require a _Business verification_ of the club (see below), that is free too.

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

### 4. The server

In `php/include/oauthKeys.php` (permissions 0600, like `eventorApiKey.php`):

- The keys from Google and Facebook above. Leave a key empty to turn the provider off.
- `GetOAuthAllowedReturnOrigins()` - the pages that may get the login back, e.g. `https://yourclub.com`, `https://www.yourclub.com` and `http://localhost:5173` while developing. Empty means the same host as the PHP scripts. The redirect URI at Google/Facebook is always the server, also while developing locally.
- `GetLoginTokenSecret()` (optional) - signs the logins of guests. Empty uses the Google/Facebook secrets instead. Changing it, or the secrets, logs out all guests.

Never put the secrets in the club config file in `src/models/clubs`, it is sent to every browser.

### 5. The club config file

Add to e.g. `src/models/clubs/okorion.ts` (remove `googleUrl` or `facebookUrl` to hide that button, remove `social` to turn off reactions and comments):

```ts
socialLogin: {
  googleUrl: 'https://yourclub.com/oauth/google.php',
  googleClientId: '1234567890-abc123.apps.googleusercontent.com', // the automatic Google login, remove to turn it off
  facebookUrl: 'https://yourclub.com/oauth/facebook.php',
  accountsUrl: 'https://yourclub.com/users/accounts.php'
},
social: {
  queryUrl: 'https://yourclub.com/social/jsonSocialQuery.php',
  updateUrl: 'https://yourclub.com/social/save.php'
},
```

The names of the ones who comment are shown to everyone, tell about it (and about Google/Facebook) in the privacy policy of the club. The automatic Google login loads Google's script (`accounts.google.com/gsi/client`) for visitors that aren't logged in, mention that too.

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
   - To also log in with Google and Facebook, see [Login with Google and Facebook](#login-with-google-and-facebook-reactions-and-comments).
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
     - Symbology > Set min scale to 1:20000
     - Rendering > Resampling Cubic + Oversampling 4,0
   - Edit properities for purple map layer
     - Symbology > Set max scale to 1:20000
     - Rendering > Resampling Cubic + Oversampling 4,0
   - Edit properities for course layer
     - Rendering > Resampling Linear + Oversampling 4,0
2. Raster > Generate XYZ tiles
   - Only show the layers you want to export (all maps at once, or one course layer at a time)
   - Extent > By your layer is a simple choice
   - Minimum zoom: 7 (12 for course layer)
   - Maximum zoom: 17
   - Set Output directory
3. You can remove \*.png files that are totally empty (1,21 kB)

