<?php
//############################################################
//# File:    oauth.php                                       #
//# Created: 2026-11-13                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Login with Google (OpenID Connect) and Facebook (OAuth2) #
//# with the authorization code flow. Used by                #
//# oauth/google.php and oauth/facebook.php, that are both   #
//# the start and the redirect URI of the login:             #
//#   1. The web page opens oauth/google.php?returnUrl=...   #
//#      &remember=1, the script redirects to Google.        #
//#   2. Google redirects back with a code, the script gets  #
//#      the person from Google and redirects to returnUrl   #
//#      with a signed one time code (oauthCode), valid 2    #
//#      minutes.                                            #
//#   3. The web page exchanges oauthCode for a login token  #
//#      in log_in.php.                                      #
//# The automatic Google login ("One Tap") instead sends the #
//# id token from Google directly to log_in.php.             #
//# A new account is a guest, until an administrator links   #
//# it to a user. Nothing is saved for a guest (it gets a    #
//# signed guest token) until it reacts, comments or asks    #
//# for access.                                              #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-13  PatSjo  Initial version                      #
//# 2026-11-14  PatSjo  Automatic Google login, guests are   #
//#                     saved first when they react          #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/oauthKeys.php");

// The address of this script, the redirect URI that must be registered at Google/Facebook
function oauthRedirectUri()
{
  $path = isset($_SERVER['SCRIPT_NAME']) ? $_SERVER['SCRIPT_NAME'] : '';
  $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
  return 'https://' . $host . $path;
}

function oauthOrigin($iUrl)
{
  $parts = parse_url($iUrl);
  if ($parts === false || !isset($parts['scheme']) || !isset($parts['host']))
  {
    return null;
  }
  $scheme = strtolower($parts['scheme']);
  if ($scheme != 'https' && $scheme != 'http')
  {
    return null;
  }
  return $scheme . '://' . strtolower($parts['host']) . (isset($parts['port']) ? ':' . $parts['port'] : '');
}

// Only return to the club web page, otherwise anyone could get the one time code
function oauthValidReturnUrl($iUrl)
{
  if (!is_string($iUrl) || strlen($iUrl) == 0 || strlen($iUrl) > 2048)
  {
    return false;
  }
  $origin = oauthOrigin($iUrl);
  if (is_null($origin))
  {
    return false;
  }
  $allowed = GetOAuthAllowedReturnOrigins();
  if (count($allowed) == 0)
  {
    $host = isset($_SERVER['HTTP_HOST']) ? strtolower($_SERVER['HTTP_HOST']) : '';
    $allowed = array('https://' . $host);
  }
  foreach ($allowed as $allowedOrigin)
  {
    if (oauthOrigin($allowedOrigin) === $origin)
    {
      return true;
    }
  }
  return false;
}

// The return URL with one parameter added (the one time code or the error), any old ones removed
function oauthReturnUrl($iReturnUrl, $iName, $iValue)
{
  $hash = '';
  $hashPos = strpos($iReturnUrl, '#');
  if ($hashPos !== false)
  {
    $hash = substr($iReturnUrl, $hashPos);
    $iReturnUrl = substr($iReturnUrl, 0, $hashPos);
  }
  $iReturnUrl = preg_replace('/([?&])(oauthCode|oauthError)=[^&]*(&|$)/', '$1', $iReturnUrl);
  $iReturnUrl = rtrim($iReturnUrl, '?&');
  return $iReturnUrl . (strpos($iReturnUrl, '?') === false ? '?' : '&') . $iName . '=' . rawurlencode($iValue) . $hash;
}

function oauthRedirect($iUrl)
{
  header("Cache-Control: no-cache, must-revalidate");
  header("Location: " . $iUrl);
  die(0);
}

// When there is no valid page to return to
function oauthFail($iMessage)
{
  header('HTTP/1.1 400 Bad Request');
  header("Content-Type: text/plain; charset=utf-8");
  echo $iMessage;
  die(0);
}

// Returns an object with status and body (decoded JSON or null)
function oauthHttp($iUrl, $iPostFields = null)
{
  $ch = curl_init($iUrl);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
  curl_setopt($ch, CURLOPT_TIMEOUT, 20);
  curl_setopt($ch, CURLOPT_HTTPHEADER, array('Accept: application/json'));
  if (!is_null($iPostFields))
  {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($iPostFields));
  }
  $response = curl_exec($ch);
  $result = new stdClass();
  $result->status = intval(curl_getinfo($ch, CURLINFO_HTTP_CODE));
  $result->body = null;
  if ($response !== false && is_string($response))
  {
    $decoded = json_decode($response);
    $result->body = is_object($decoded) ? $decoded : null;
  }
  return $result;
}

function oauthProviderConfigured($iProvider)
{
  if ($iProvider == 'GOOGLE')
  {
    return strlen(GetGoogleClientId()) > 0 && strlen(GetGoogleClientSecret()) > 0;
  }
  return strlen(GetFacebookAppId()) > 0 && strlen(GetFacebookAppSecret()) > 0;
}

// Step 1, to Google/Facebook
function oauthStart($iProvider)
{
  $returnUrl = isset($_GET['returnUrl']) && is_string($_GET['returnUrl']) ? $_GET['returnUrl'] : '';
  if (!oauthValidReturnUrl($returnUrl))
  {
    oauthFail('The returnUrl is not allowed, add the web page to GetOAuthAllowedReturnOrigins in include/oauthKeys.php.');
  }
  if (!oauthProviderConfigured($iProvider))
  {
    oauthRedirect(oauthReturnUrl($returnUrl, 'oauthError', 'config'));
  }

  $state = bin2hex(random_bytes(16));
  $login = array(
    'provider' => $iProvider,
    'returnUrl' => $returnUrl,
    'remember' => isset($_GET['remember']) && $_GET['remember'] == '1',
    'verifier' => base64UrlEncode(random_bytes(32)),
    'nonce' => bin2hex(random_bytes(16)),
    'time' => time()
  );
  if (!isset($_SESSION['oauth']) || !is_array($_SESSION['oauth']))
  {
    $_SESSION['oauth'] = array();
  }
  // Only keep the latest logins
  foreach ($_SESSION['oauth'] as $key => $oldLogin)
  {
    if (!is_array($oldLogin) || !isset($oldLogin['time']) || $oldLogin['time'] < time() - 900)
    {
      unset($_SESSION['oauth'][$key]);
    }
  }
  $_SESSION['oauth'][$state] = $login;

  if ($iProvider == 'GOOGLE')
  {
    $url = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query(array(
      'client_id' => GetGoogleClientId(),
      'redirect_uri' => oauthRedirectUri(),
      'response_type' => 'code',
      'scope' => 'openid email profile',
      'state' => $state,
      'nonce' => $login['nonce'],
      'code_challenge' => base64UrlEncode(hash('sha256', $login['verifier'], true)),
      'code_challenge_method' => 'S256',
      'prompt' => 'select_account'
    ));
  }
  else
  {
    $url = 'https://www.facebook.com/' . GetFacebookGraphVersion() . '/dialog/oauth?' . http_build_query(array(
      'client_id' => GetFacebookAppId(),
      'redirect_uri' => oauthRedirectUri(),
      'response_type' => 'code',
      'scope' => 'public_profile,email',
      'state' => $state
    ));
  }
  oauthRedirect($url);
}

// The person from Google, null when the answer can't be trusted
function oauthGoogleProfile($iCode, $iLogin)
{
  $response = oauthHttp('https://oauth2.googleapis.com/token', array(
    'code' => $iCode,
    'client_id' => GetGoogleClientId(),
    'client_secret' => GetGoogleClientSecret(),
    'redirect_uri' => oauthRedirectUri(),
    'grant_type' => 'authorization_code',
    'code_verifier' => $iLogin['verifier']
  ));
  if ($response->status != 200 || is_null($response->body) || !isset($response->body->id_token))
  {
    return null;
  }
  // The id token comes directly from Google over https, the signature doesn't need to be checked
  $parts = explode('.', (string)$response->body->id_token);
  if (count($parts) != 3)
  {
    return null;
  }
  $payload = base64UrlDecode($parts[1]);
  $claims = json_decode($payload === false ? '' : $payload);
  if (!oauthValidGoogleClaims($claims) || !isset($claims->nonce) || $claims->nonce !== $iLogin['nonce'])
  {
    return null;
  }
  return oauthGoogleClaimsProfile($claims);
}

// The id token is for this web page, from Google and not expired
function oauthValidGoogleClaims($iClaims)
{
  return is_object($iClaims) && isset($iClaims->sub) && isset($iClaims->aud) && isset($iClaims->iss) && isset($iClaims->exp) &&
    is_string($iClaims->sub) && strlen($iClaims->sub) > 0 && $iClaims->aud === GetGoogleClientId() && intval($iClaims->exp) >= time() &&
    ($iClaims->iss === 'https://accounts.google.com' || $iClaims->iss === 'accounts.google.com');
}

function oauthGoogleClaimsProfile($claims)
{
  $profile = new stdClass();
  $profile->id = (string)$claims->sub;
  $profile->firstName = isset($claims->given_name) ? (string)$claims->given_name : null;
  $profile->lastName = isset($claims->family_name) ? (string)$claims->family_name : null;
  $profile->name = isset($claims->name) ? (string)$claims->name : trim($profile->firstName . ' ' . $profile->lastName);
  $profile->email = isset($claims->email) && isset($claims->email_verified) && $claims->email_verified ? (string)$claims->email : null;
  $profile->pictureUrl = isset($claims->picture) ? (string)$claims->picture : null;
  return $profile;
}

function oauthDerLength($iLength)
{
  if ($iLength < 128)
  {
    return chr($iLength);
  }
  $bytes = ltrim(pack('N', $iLength), "\0");
  return chr(0x80 | strlen($bytes)) . $bytes;
}

function oauthDerInteger($iBytes)
{
  $bytes = ltrim($iBytes, "\0");
  if (strlen($bytes) == 0 || ord($bytes[0]) > 0x7f)
  {
    $bytes = "\0" . $bytes;
  }
  return "\x02" . oauthDerLength(strlen($bytes)) . $bytes;
}

// A public RSA key (n and e from Google's JSON Web Keys) as PEM
function oauthRsaPublicKeyPem($iModulus, $iExponent)
{
  $modulus = base64UrlDecode($iModulus);
  $exponent = base64UrlDecode($iExponent);
  if ($modulus === false || $exponent === false || strlen($modulus) == 0 || strlen($exponent) == 0)
  {
    return null;
  }
  $rsaKey = oauthDerInteger($modulus) . oauthDerInteger($exponent);
  $rsaKey = "\x30" . oauthDerLength(strlen($rsaKey)) . $rsaKey;
  $bitString = "\x03" . oauthDerLength(strlen($rsaKey) + 1) . "\0" . $rsaKey;
  // SEQUENCE { OID rsaEncryption, NULL }
  $algorithm = "\x30\x0d\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00";
  $publicKey = $algorithm . $bitString;
  $publicKey = "\x30" . oauthDerLength(strlen($publicKey)) . $publicKey;
  return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($publicKey), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

// The person from an id token the web page got from Google (automatic login, "One Tap").
// The token comes through the browser, so the signature is checked with Google's public keys.
function oauthGoogleCredentialProfile($iCredential)
{
  if (!is_string($iCredential) || strlen($iCredential) > 8192 || strlen(GetGoogleClientId()) == 0)
  {
    return null;
  }
  $parts = explode('.', $iCredential);
  if (count($parts) != 3)
  {
    return null;
  }
  $headerJson = base64UrlDecode($parts[0]);
  $header = json_decode($headerJson === false ? '' : $headerJson);
  $signature = base64UrlDecode($parts[2]);
  if (!is_object($header) || !isset($header->alg) || $header->alg !== 'RS256' || !isset($header->kid) ||
      !is_string($header->kid) || $signature === false || strlen($signature) == 0)
  {
    return null;
  }

  $response = oauthHttp('https://www.googleapis.com/oauth2/v3/certs');
  if ($response->status != 200 || is_null($response->body) || !isset($response->body->keys) || !is_array($response->body->keys))
  {
    return null;
  }
  $publicKey = false;
  foreach ($response->body->keys as $key)
  {
    if (is_object($key) && isset($key->kid) && $key->kid === $header->kid && isset($key->n) && isset($key->e) &&
        is_string($key->n) && is_string($key->e))
    {
      $pem = oauthRsaPublicKeyPem($key->n, $key->e);
      $publicKey = is_null($pem) ? false : openssl_pkey_get_public($pem);
    }
  }
  if ($publicKey === false || openssl_verify($parts[0] . '.' . $parts[1], $signature, $publicKey, OPENSSL_ALGO_SHA256) !== 1)
  {
    return null;
  }

  $payload = base64UrlDecode($parts[1]);
  $claims = json_decode($payload === false ? '' : $payload);
  if (!oauthValidGoogleClaims($claims))
  {
    return null;
  }
  return oauthGoogleClaimsProfile($claims);
}

// Answers the login of a person from Google/Facebook (log_in.php). A user (linked account) gets a saved login token.
// A guest gets a signed guest token and nothing is saved, until the guest reacts, comments or asks for access.
function oauthLoginProfile($iProvider, $iProfile, $iRemember)
{
  global $user_id;
  global $cLOGIN_TOKEN_REMEMBER_DAYS;

  clearSessionLogin();
  $row = findOAuthAccount($iProvider, $iProfile->id);
  if (!is_null($row))
  {
    // Already saved, keep the name and picture up to date
    loadOAuthAccount(oauthSaveAccount($iProvider, $iProfile));
    if ($user_id > 0)
    {
      StartSession();
      saveSessionLogin();
      setUserName();
      Authorized(createLoginToken('LOGIN', $iRemember), $iRemember);
    }
  }
  $token = createGuestToken('G', $iProvider, $iProfile, $iRemember, 86400 * $cLOGIN_TOKEN_REMEMBER_DAYS);
  if (is_null($token) || is_null(loginWithGuestToken($token)))
  {
    NotAuthorized(true);
  }
  setUserName();
  Authorized($token, $iRemember);
}

// The person from Facebook, null when the answer can't be trusted
function oauthFacebookProfile($iCode)
{
  $version = GetFacebookGraphVersion();
  $response = oauthHttp('https://graph.facebook.com/' . $version . '/oauth/access_token?' . http_build_query(array(
    'client_id' => GetFacebookAppId(),
    'client_secret' => GetFacebookAppSecret(),
    'redirect_uri' => oauthRedirectUri(),
    'code' => $iCode
  )));
  if ($response->status != 200 || is_null($response->body) || !isset($response->body->access_token))
  {
    return null;
  }
  $accessToken = (string)$response->body->access_token;
  $response = oauthHttp('https://graph.facebook.com/' . $version . '/me?' . http_build_query(array(
    'fields' => 'id,name,first_name,last_name,email,picture.width(96).height(96)',
    'access_token' => $accessToken,
    'appsecret_proof' => hash_hmac('sha256', $accessToken, GetFacebookAppSecret())
  )));
  if ($response->status != 200 || is_null($response->body) || !isset($response->body->id))
  {
    return null;
  }
  $me = $response->body;

  $profile = new stdClass();
  $profile->id = (string)$me->id;
  $profile->firstName = isset($me->first_name) ? (string)$me->first_name : null;
  $profile->lastName = isset($me->last_name) ? (string)$me->last_name : null;
  $profile->name = isset($me->name) ? (string)$me->name : trim($profile->firstName . ' ' . $profile->lastName);
  $profile->email = isset($me->email) ? (string)$me->email : null;
  $profile->pictureUrl = isset($me->picture) && isset($me->picture->data) && isset($me->picture->data->url)
    ? (string)$me->picture->data->url
    : null;
  return $profile;
}

// Step 2, back from Google/Facebook
function oauthCallback($iProvider)
{
  global $cOAUTH_EXCHANGE_SECONDS;

  $state = isset($_GET['state']) && is_string($_GET['state']) ? $_GET['state'] : '';
  if (!isset($_SESSION['oauth']) || !is_array($_SESSION['oauth']) || !isset($_SESSION['oauth'][$state]))
  {
    oauthFail('The login has expired or was started in another browser, please try again from the web page.');
  }
  $login = $_SESSION['oauth'][$state];
  unset($_SESSION['oauth'][$state]);
  if ($login['provider'] != $iProvider || $login['time'] < time() - 900 || !oauthValidReturnUrl($login['returnUrl']))
  {
    oauthFail('The login has expired, please try again from the web page.');
  }
  $returnUrl = $login['returnUrl'];

  if (isset($_GET['error']) || !isset($_GET['code']) || !is_string($_GET['code']))
  {
    // E.g. the user cancelled
    oauthRedirect(oauthReturnUrl($returnUrl, 'oauthError', 'cancelled'));
  }

  $profile = $iProvider == 'GOOGLE' ? oauthGoogleProfile($_GET['code'], $login) : oauthFacebookProfile($_GET['code']);
  if (is_null($profile) || strlen($profile->id) == 0)
  {
    oauthRedirect(oauthReturnUrl($returnUrl, 'oauthError', 'profile'));
  }

  clearSessionLogin();
  // The login token is created when the web page exchanges the code (log_in.php). The code is signed
  // and holds the person, nothing is saved for a guest until the guest reacts, comments or asks for access.
  $code = createGuestToken('X', $iProvider, $profile, $login['remember'], $cOAUTH_EXCHANGE_SECONDS);
  if (is_null($code))
  {
    oauthRedirect(oauthReturnUrl($returnUrl, 'oauthError', 'config'));
  }
  oauthRedirect(oauthReturnUrl($returnUrl, 'oauthCode', $code));
}

function oauthLogin($iProvider)
{
  StartSession();
  if (isset($_GET['state']) || isset($_GET['code']) || isset($_GET['error']))
  {
    oauthCallback($iProvider);
  }
  oauthStart($iProvider);
}

?>
