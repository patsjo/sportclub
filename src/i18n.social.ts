/** Translations for the login with Google/Facebook, access requests, reactions and comments, merged into i18n.resources.ts */

export const loginSv = {
  EventorUsername: 'Användarnamn (Eventor)',
  Failed: 'Fel användarnamn eller lösenord',
  Or: 'eller',
  WithGoogle: 'Logga in med Google',
  WithFacebook: 'Logga in med Facebook',
  GuestInfo:
    'Med Google eller Facebook loggar du in som gäst och kan gilla och kommentera. Är du medlem kan du sedan ansöka om att bli kopplad till ditt medlemskonto.',
  Guest: 'gäst',
  WelcomeGuest: 'Välkommen {{name}}! Du är inloggad som gäst och kan gilla och kommentera.',
  RestoreFailed: 'Kunde inte kontrollera inloggningen, du visas som utloggad tills sidan laddas om',
  PendingAccessRequests: '{{count}} behörighetsförfrågan väntar, se Användare → Konton',
  PendingAccessRequests_other: '{{count}} behörighetsförfrågningar väntar, se Användare → Konton',
  OAuthError: {
    cancelled: 'Inloggningen avbröts.',
    config: 'Inloggningen är inte konfigurerad på servern (include/oauthKeys.php).',
    profile: 'Inloggningen misslyckades, kunde inte hämta kontot. Försök igen.',
    exchange: 'Inloggningen misslyckades, försök igen'
  },
  RequestMembership: 'Ansök om medlemskap',
  RequestAccess: 'Ansök om behörighet',
  RequestMembershipInfo:
    'Är du medlem i klubben? Ansök så kopplar en administratör ditt konto till ditt medlemskonto. Du kan också ansöka om en behörighetsgrupp.',
  RequestAccessInfo: 'Ansök om att bli med i en behörighetsgrupp, en administratör godkänner ansökan.',
  RequestGroup: 'Behörighet',
  Member: 'Medlem',
  RequestMessage: 'Meddelande till administratören',
  RequestMessagePlaceholder: 'T.ex. ditt fullständiga namn och födelseår, så vi hittar dig',
  SendRequest: 'Skicka ansökan',
  RequestSent: 'Ansökan är skickad',
  MyRequests: 'Mina ansökningar',
  NoRequests: 'Inga ansökningar',
  LoadRequestsFailed: 'Kunde inte hämta dina ansökningar',
  Status: {
    PENDING: 'Väntar',
    APPROVED: 'Godkänd',
    REJECTED: 'Avslagen'
  }
};

export const loginEn: typeof loginSv = {
  EventorUsername: 'Username (Eventor)',
  Failed: 'Wrong username or password',
  Or: 'or',
  WithGoogle: 'Sign in with Google',
  WithFacebook: 'Continue with Facebook',
  GuestInfo:
    'With Google or Facebook you sign in as a guest and can like and comment. If you are a member you can then ask to be linked to your member account.',
  Guest: 'guest',
  WelcomeGuest: 'Welcome {{name}}! You are signed in as a guest and can like and comment.',
  RestoreFailed: 'Could not check the login, you are shown as logged out until the page is reloaded',
  PendingAccessRequests: '{{count}} access request is waiting, see Users → Accounts',
  PendingAccessRequests_other: '{{count}} access requests are waiting, see Users → Accounts',
  OAuthError: {
    cancelled: 'The login was cancelled.',
    config: 'The login is not configured on the server (include/oauthKeys.php).',
    profile: 'The login failed, could not get the account. Please try again.',
    exchange: 'The login failed, please try again'
  },
  RequestMembership: 'Apply for membership',
  RequestAccess: 'Request access',
  RequestMembershipInfo:
    'Are you a member of the club? Apply and an administrator links your account to your member account. You can also request an access group.',
  RequestAccessInfo: 'Request to join an access group, an administrator approves the request.',
  RequestGroup: 'Access',
  Member: 'Member',
  RequestMessage: 'Message to the administrator',
  RequestMessagePlaceholder: 'E.g. your full name and year of birth, so we can find you',
  SendRequest: 'Send request',
  RequestSent: 'The request is sent',
  MyRequests: 'My requests',
  NoRequests: 'No requests',
  LoadRequestsFailed: 'Could not load your requests',
  Status: {
    PENDING: 'Waiting',
    APPROVED: 'Approved',
    REJECTED: 'Rejected'
  }
};

export const socialSv = {
  LIKE: 'Gilla',
  DISLIKE: 'Gilla inte',
  HEART: 'Älska',
  Comments: 'Kommentarer',
  WriteComment: 'Skriv en kommentar…',
  Send: 'Skicka',
  Emojis: 'Emojis',
  DeleteComment: 'Ta bort kommentaren?',
  LoginToReact: 'Logga in för att gilla',
  LoginToComment: 'Logga in (t.ex. med Google eller Facebook) för att gilla och kommentera',
  LoadFailed: 'Kunde inte hämta kommentarerna, visar bara antalen',
  ShowWho: 'Visa vilka',
  NamesLoadFailed: 'Kunde inte hämta vilka det är'
};

export const socialEn: typeof socialSv = {
  LIKE: 'Like',
  DISLIKE: 'Dislike',
  HEART: 'Love',
  Comments: 'Comments',
  WriteComment: 'Write a comment…',
  Send: 'Send',
  Emojis: 'Emojis',
  DeleteComment: 'Delete the comment?',
  LoginToReact: 'Log in to like',
  LoginToComment: 'Log in (e.g. with Google or Facebook) to like and comment',
  LoadFailed: 'Could not load the comments, only showing the counts',
  ShowWho: 'Show who',
  NamesLoadFailed: 'Could not load who it is'
};

export const accountsSv = {
  Accounts: 'Konton',
  Account: 'Konto',
  Provider: 'Via',
  User: 'Användare',
  Competitor: 'Löpare',
  LinkedCompetitor: 'Kopplad löpare',
  LinkedAccounts: 'Kopplade konton',
  CompetitorInfo: 'Används t.ex. för att avsäga sig resultat, när användaren saknar Eventor-inloggning',
  LastLogin: 'Senast inloggad',
  PendingRequests: 'Väntande förfrågningar',
  NoPendingRequests: 'Inga väntande förfrågningar',
  NoAccounts: 'Ingen har loggat in med Google eller Facebook ännu',
  Approve: 'Godkänn',
  ApproveRequest: 'Godkänn förfrågan',
  Approved: 'Förfrågan är godkänd',
  Reject: 'Avslå',
  RejectConfirm: 'Avslå förfrågan?',
  Link: 'Koppla',
  LinkAccount: 'Koppla kontot till en användare',
  Linked: 'Kontot är kopplat',
  Unlink: 'Koppla bort',
  UnlinkConfirm: 'Koppla bort kontot från användaren? Det blir en gäst igen.',
  DeleteConfirm: 'Ta bort kontot, och dess gillanden och kommentarer som gäst?',
  CreateNewUser: 'Skapa en ny användare',
  ExistingUser: 'Befintlig användare',
  SelectUser: 'Välj användare',
  LoadFailed: 'Kunde inte hämta kontona',
  CompetitorsLoadFailed: 'Kunde inte hämta löparna, kopplingen till löpare kan inte väljas'
};

export const accountsEn: typeof accountsSv = {
  Accounts: 'Accounts',
  Account: 'Account',
  Provider: 'Via',
  User: 'User',
  Competitor: 'Competitor',
  LinkedCompetitor: 'Linked competitor',
  LinkedAccounts: 'Linked accounts',
  CompetitorInfo: 'Used e.g. to renounce results, when the user has no Eventor login',
  LastLogin: 'Last login',
  PendingRequests: 'Pending requests',
  NoPendingRequests: 'No pending requests',
  NoAccounts: 'No one has logged in with Google or Facebook yet',
  Approve: 'Approve',
  ApproveRequest: 'Approve the request',
  Approved: 'The request is approved',
  Reject: 'Reject',
  RejectConfirm: 'Reject the request?',
  Link: 'Link',
  LinkAccount: 'Link the account to a user',
  Linked: 'The account is linked',
  Unlink: 'Unlink',
  UnlinkConfirm: 'Unlink the account from the user? It becomes a guest again.',
  DeleteConfirm: 'Delete the account, and its likes and comments as a guest?',
  CreateNewUser: 'Create a new user',
  ExistingUser: 'Existing user',
  SelectUser: 'Select user',
  LoadFailed: 'Could not load the accounts',
  CompetitorsLoadFailed: 'Could not load the competitors, a competitor can not be chosen'
};

export const formattingSv = {
  Title: 'Formatering som kan användas',
  Look: 'Utseende',
  Result: 'Resultat',
  Or: 'eller',
  Link: 'Länk',
  Bold: 'Fetstil',
  Italic: 'Kursiv',
  Underline: 'Understruken',
  Strikethrough: 'Överstruken',
  Superscript: 'Upphöjd',
  Subscript: 'Nedsänkt',
  Info: 'Andra taggar visas som vanlig text. Länkar måste börja med https://, http://, mailto: eller tel: och öppnas i en ny flik. Ny rad blir ny rad.'
};

export const formattingEn: typeof formattingSv = {
  Title: 'Formatting that can be used',
  Look: 'Look',
  Result: 'Result',
  Or: 'or',
  Link: 'Link',
  Bold: 'Bold',
  Italic: 'Italic',
  Underline: 'Underline',
  Strikethrough: 'Strikethrough',
  Superscript: 'Superscript',
  Subscript: 'Subscript',
  Info: 'Other tags are shown as plain text. Links must start with https://, http://, mailto: or tel: and open in a new tab. A new line is a new line.'
};
