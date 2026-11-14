<?php
//############################################################
//# File:    users.php                                       #
//# Created: 2001-09-09                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2001-09-09  PatSjo  Initial version                      #
//# 2001-09-30  PatSjo  Added function getUserName           #
//# 2001-12-02  Niklas  Added function CheckValidLogin       #
//#                     Added public variable not_valid      #
//# 2002-07-14  PatSjo  Added sub ValidWMLLogin              #
//# 2003-12-19  PatSjo  Added constant cADMIN_GROUP_ID       #
//# 2005-02-11  PatSjo  Adjust printUserGroupDropDown        #
//# 2005-08-26  PatSjo  Changes from Access to MySQL         #
//# 2005-12-31  PatSjo  Changes from ASP to PHP              #
//# 2020-11-04  PatSjo  Adjust for eventor login             #
//# 2021-08-21  PatSjo  Remove HTML functions                #
//# 2026-03-08  PatSjo  PHP 8.5 fixes                        #
//# 2026-11-13  PatSjo  Login tokens, Google and Facebook    #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/eventorApiKey.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/oauthKeys.php");

$cADMIN_GROUP_ID = 1;
$cCOACH_GROUP_ID = 6;
$user_id = 0;
// The Google/Facebook account (user_oauth). Without a user_id it is a guest,
// a guest can only react and comment (see ValidSocialLogin).
$oauth_id = 0;
// A guest from Google/Facebook that isn't saved yet (the signed guest token), saved first when the guest
// reacts, comments or asks for access (see ensureOAuthAccount)
$oauthGuest = null;
// How the request logged in, 'guest' for the signed guest token
$loginTokenKind = null;
$eventorPersonId = null;
$userName = "Okänd";
$not_valid = true;

// A login token without "Remember me" lives one day after it was last used,
// with "Remember me" 90 days. The one time code from Google/Facebook lives 2 minutes.
$cLOGIN_TOKEN_DAYS = 1;
$cLOGIN_TOKEN_REMEMBER_DAYS = 90;
$cOAUTH_EXCHANGE_SECONDS = 120;

function cors() {

  if (isset($_SERVER['HTTP_ORIGIN'])) {
      header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
      header('Access-Control-Allow-Credentials: true');
      header('Access-Control-Max-Age: 86400');    // cache for 1 day
  }

  if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {

      if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
          header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

      if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
          header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");

      exit(0);
  } else {
    header('Access-Control-Allow-Headers: *');
  }
}

function StartSession()
{
  if (session_status() == PHP_SESSION_NONE)
  {
    session_start();
  }
}

function closeSession()
{
  if (session_status() == PHP_SESSION_ACTIVE)
  {
    session_write_close();
  }
}

function NotAuthorized($UseForbidden = false)
{
    if ($UseForbidden || (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] == "XMLHttpRequest")) {
      header("HTTP/1.0 403 Forbidden");
    } else {
      header("HTTP/1.0 401 Unauthorized");
      header("WWW-Authenticate: Basic realm=\"Sportclub\"");
    }
    die(0);
}

// The database runs without autocommit, the login must be saved also when the script ends with die()
function CommitDatabase()
{
  global $db_conn;
  if (isset($db_conn))
  {
    mysqli_commit($db_conn);
  }
}

function sqlQueryOrError($sql)
{
  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }
  return $result;
}

// The first row as an associative array, or null
function sqlFirstRow($sql)
{
  $result = sqlQueryOrError($sql);
  $row = \db\mysql_fetch_assoc($result);
  \db\mysql_free_result($result);
  return $row ? $row : null;
}

function base64UrlEncode($iData)
{
  return rtrim(strtr(base64_encode($iData), '+/', '-_'), '=');
}

function base64UrlDecode($iData)
{
  $data = strtr($iData, '-_', '+/');
  $padding = strlen($data) % 4;
  if ($padding > 0)
  {
    $data .= str_repeat('=', 4 - $padding);
  }
  return base64_decode($data);
}

function oauthSqlString($iValue, $iMaxLength)
{
  if (is_null($iValue) || strlen($iValue) == 0)
  {
    return 'NULL';
  }
  $value = function_exists('mb_substr') ? mb_substr($iValue, 0, $iMaxLength) : substr($iValue, 0, $iMaxLength);
  return "'" . \db\mysql_real_escape_string($value) . "'";
}

// The saved Google/Facebook account (oauth_id, user_id), or null
function findOAuthAccount($iProvider, $iProviderUserId)
{
  OpenDatabase();
  return sqlFirstRow(sprintf("SELECT oauth_id, user_id FROM user_oauth WHERE provider = '%s' AND provider_user_id = '%s'",
                             $iProvider == 'GOOGLE' ? 'GOOGLE' : 'FACEBOOK',
                             \db\mysql_real_escape_string(substr((string)$iProviderUserId, 0, 128))));
}

// Saves the account (or updates the name and picture), returns the oauth_id
function oauthSaveAccount($iProvider, $iProfile)
{
  OpenDatabase();
  $name = strlen((string)$iProfile->name) > 0 ? $iProfile->name : ($iProvider == 'GOOGLE' ? 'Google' : 'Facebook');
  $row = findOAuthAccount($iProvider, $iProfile->id);
  if (!is_null($row))
  {
    $oauthId = intval($row['oauth_id']);
    sqlQueryOrError(sprintf("UPDATE user_oauth SET name = %s, first_name = %s, last_name = %s, email = %s, " .
                            "picture_url = %s, last_login_date = NOW() WHERE oauth_id = %d",
                            oauthSqlString($name, 128),
                            oauthSqlString($iProfile->firstName, 64),
                            oauthSqlString($iProfile->lastName, 64),
                            oauthSqlString($iProfile->email, 128),
                            oauthSqlString($iProfile->pictureUrl, 512),
                            $oauthId));
  }
  else
  {
    sqlQueryOrError(sprintf("INSERT INTO user_oauth (provider, provider_user_id, name, first_name, last_name, email, " .
                            "picture_url, cre_date, last_login_date) VALUES ('%s', '%s', %s, %s, %s, %s, %s, NOW(), NOW())",
                            $iProvider == 'GOOGLE' ? 'GOOGLE' : 'FACEBOOK',
                            \db\mysql_real_escape_string(substr((string)$iProfile->id, 0, 128)),
                            oauthSqlString($name, 128),
                            oauthSqlString($iProfile->firstName, 64),
                            oauthSqlString($iProfile->lastName, 64),
                            oauthSqlString($iProfile->email, 128),
                            oauthSqlString($iProfile->pictureUrl, 512)));
    $oauthId = intval(\db\mysql_insert_id());
  }
  CommitDatabase();
  return $oauthId;
}

//############################################################
//# Guest token: the Google/Facebook person signed by the    #
//# server (HMAC), nothing is saved in the database or the   #
//# session. "g.<base64 json>.<base64 signature>"            #
//#   t  G = guest login token, X = one time code from       #
//#      oauth/google.php or oauth/facebook.php              #
//#   p  GOOGLE or FACEBOOK, s  the id at the provider       #
//#   n, f, l, e, i  name, first, last, email, picture       #
//#   r  remember, x  expires (unix time)                    #
//############################################################

// The key that signs the guest tokens, null when there is no secret to make it from
function guestTokenKey()
{
  $secret = function_exists('GetLoginTokenSecret') ? (string)GetLoginTokenSecret() : '';
  if (strlen($secret) == 0)
  {
    $secret = (string)GetGoogleClientSecret() . (string)GetFacebookAppSecret();
  }
  // Without a secret anyone could make a token
  if (strlen($secret) < 16)
  {
    return null;
  }
  return hash('sha256', 'sportclub guest token|' . $secret, true);
}

function createGuestToken($iType, $iProvider, $iProfile, $iRemember, $iSeconds)
{
  $key = guestTokenKey();
  if (is_null($key))
  {
    return null;
  }
  $payload = array(
    't' => $iType,
    'p' => $iProvider == 'GOOGLE' ? 'GOOGLE' : 'FACEBOOK',
    's' => (string)$iProfile->id,
    'n' => is_null($iProfile->name) ? null : (string)$iProfile->name,
    'f' => is_null($iProfile->firstName) ? null : (string)$iProfile->firstName,
    'l' => is_null($iProfile->lastName) ? null : (string)$iProfile->lastName,
    'e' => is_null($iProfile->email) ? null : (string)$iProfile->email,
    'i' => is_null($iProfile->pictureUrl) ? null : (string)$iProfile->pictureUrl,
    'r' => $iRemember ? 1 : 0,
    'x' => time() + intval($iSeconds)
  );
  $json = json_encode($payload, JSON_PARTIAL_OUTPUT_ON_ERROR);
  $body = base64UrlEncode($json === false ? '{}' : $json);
  return 'g.' . $body . '.' . base64UrlEncode(hash_hmac('sha256', 'g.' . $body, $key, true));
}

// The payload of a valid guest token of the type, or null
function readGuestToken($iToken, $iType)
{
  if (!is_string($iToken) || strlen($iToken) > 4096)
  {
    return null;
  }
  $key = guestTokenKey();
  $parts = explode('.', $iToken);
  if (is_null($key) || count($parts) != 3 || $parts[0] !== 'g')
  {
    return null;
  }
  if (!hash_equals(base64UrlEncode(hash_hmac('sha256', 'g.' . $parts[1], $key, true)), $parts[2]))
  {
    return null;
  }
  $json = base64UrlDecode($parts[1]);
  $payload = json_decode($json === false ? '' : $json, true);
  if (!is_array($payload) || !isset($payload['t']) || $payload['t'] !== $iType || !isset($payload['x']) ||
      intval($payload['x']) < time() || !isset($payload['p']) || ($payload['p'] !== 'GOOGLE' && $payload['p'] !== 'FACEBOOK') ||
      !isset($payload['s']) || !is_string($payload['s']) || strlen($payload['s']) == 0)
  {
    return null;
  }
  return $payload;
}

// The person in a guest token, the same as the profile from Google/Facebook
function guestProfile($iPayload)
{
  $profile = new stdClass();
  foreach (array('id' => 's', 'name' => 'n', 'firstName' => 'f', 'lastName' => 'l', 'email' => 'e', 'pictureUrl' => 'i') as $name => $key)
  {
    $profile->$name = isset($iPayload[$key]) && is_string($iPayload[$key]) ? $iPayload[$key] : null;
  }
  return $profile;
}

// What the web page needs to know about the logged in user or guest
function GetSessionInfo()
{
  global $user_id;
  global $oauth_id;
  global $userName;
  global $eventorPersonId;
  global $cADMIN_GROUP_ID;
  global $oauthGuest;

  $info = new stdClass();
  $info->id = $user_id;
  $info->name = $userName;
  $info->isAdmin = $user_id > 0 && ValidGroup($cADMIN_GROUP_ID);
  $info->eventorPersonId = $eventorPersonId;
  $info->competitorId = null;
  $info->isGuest = $user_id <= 0 && ($oauth_id > 0 || !is_null($oauthGuest));
  $info->oauthId = $oauth_id > 0 ? $oauth_id : null;
  $info->provider = $user_id <= 0 && !is_null($oauthGuest) ? $oauthGuest['p'] : null;
  $info->pictureUrl = $user_id <= 0 && !is_null($oauthGuest) ? guestProfile($oauthGuest)->pictureUrl : null;
  $info->pendingAccessRequests = 0;

  OpenDatabase();
  if ($user_id > 0)
  {
    $row = sqlFirstRow("SELECT competitor_id FROM users WHERE user_id = " . intval($user_id));
    if (!is_null($row) && !is_null($row['competitor_id']))
    {
      $info->competitorId = intval($row['competitor_id']);
    }
  }
  if ($oauth_id > 0)
  {
    $row = sqlFirstRow("SELECT provider, picture_url FROM user_oauth WHERE oauth_id = " . intval($oauth_id));
    if (!is_null($row))
    {
      $info->provider = $row['provider'];
      $info->pictureUrl = $row['picture_url'];
    }
  }
  if ($info->isAdmin)
  {
    $row = sqlFirstRow("SELECT COUNT(*) AS number_of FROM user_access_requests WHERE status = 'PENDING'");
    $info->pendingAccessRequests = is_null($row) ? 0 : intval($row['number_of']);
  }
  return $info;
}

// Answers the login, $token only when a new login token is created
function Authorized($token = null, $rememberLogin = false)
{
  $info = GetSessionInfo();
  if (!is_null($token))
  {
    $info->token = $token;
    $info->rememberLogin = $rememberLogin ? true : false;
  }
  CommitDatabase();

  $json = json_encode($info);
  header("Cache-Control: no-cache, must-revalidate");
  header("Content-type: application/json");
  header("Content-length: " . strlen($json));

  echo $json;
  die(0);
}

function makeBasicAuth($name, $password)
{
  $auth = new stdClass();
  $auth->type = 'basic';
  $auth->user = $name;
  $auth->password = $password;
  return $auth;
}

// Bearer <login token> from the web page, or Basic <base64 username:password> from old pages,
// or username/password in the posted JSON (the login form). Null when there is none.
function get_http_authorization()
{
  $auth = null;
  // .htaccess passes the Authorization header as REMOTE_USER when the server hides it
  foreach (array('HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION', 'REMOTE_USER', 'REDIRECT_REMOTE_USER') as $key)
  {
    if (!is_null($auth) || !isset($_SERVER[$key]) || !is_string($_SERVER[$key]))
    {
      continue;
    }
    $matches = array();
    if (preg_match('/^\s*Bearer\s+([0-9a-fA-F]{64})\s*$/', $_SERVER[$key], $matches))
    {
      $auth = new stdClass();
      $auth->type = 'bearer';
      $auth->token = strtolower($matches[1]);
    }
    elseif (preg_match('/^\s*Bearer\s+(g\.[A-Za-z0-9_-]{1,4000}\.[A-Za-z0-9_-]{1,100})\s*$/', $_SERVER[$key], $matches))
    {
      $auth = new stdClass();
      $auth->type = 'guest';
      $auth->token = $matches[1];
    }
    elseif (preg_match('/Basic +(.*)$/i', $_SERVER[$key], $matches))
    {
      $auth_info = base64_decode($matches[1]);
      $parts = explode(':', $auth_info === false ? '' : $auth_info, 2);
      $name = strip_tags($parts[0]);
      $password = count($parts) > 1 ? strip_tags($parts[1]) : '';
      // Not logged in pages sent ":" or "undefined:undefined", that would ask Eventor on every request
      if (strlen($name) > 0 && strlen($password) > 0 && $name != 'undefined')
      {
        $auth = makeBasicAuth($name, $password);
      }
    }
  }

  if (is_null($auth))
  {
    // Takes raw data from the request
    $json = file_get_contents('php://input');
    // Converts it into a PHP object
    $input = json_decode($json === false ? '' : $json);

    if (is_object($input) && isset($input->username) && isset($input->password) && is_string($input->username) &&
        is_string($input->password) && strlen($input->username) > 0 && strlen($input->password) > 0)
    {
      $auth = makeBasicAuth($input->username, $input->password);
    }
  }

  return $auth;
}

function getAuthenticatePerson($auth_user, $auth_password)
{
  $request_url = 'https://eventor.orientering.se/api/authenticatePerson';
  $request_headers = array();

  array_push($request_headers, "Username: $auth_user");
  array_push($request_headers, "Password: $auth_password");

  $ch = curl_init($request_url);

  curl_setopt($ch, CURLOPT_HTTPHEADER, $request_headers);
  curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
  curl_setopt($ch, CURLOPT_UNRESTRICTED_AUTH, true);
  curl_setopt($ch, CURLOPT_AUTOREFERER, true);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_NOBODY, true);
  curl_setopt($ch, CURLOPT_HEADER, true);
  curl_setopt($ch, CURLOPT_HTTPGET, true);
  curl_setopt ( $ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows; U; Windows NT 5.1; pl; rv:1.9) Gecko/2008052906 Firefox/3.0" );
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
  curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);

  // retrieve response (headers and content)
  $response = curl_exec($ch);
  $responseStatusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  if($response == false || curl_errno($ch))
  {
    return null;
  }

  // split response to header and content
  $parts = preg_split('/(\r\n){2}/', $response, 2);
  $response_content = count($parts) > 1 ? $parts[1] : '';
  if($responseStatusCode != 200)
  {
    return null;
  }

  // convert xml to json
  $response_content = str_replace(array("\n", "\r", "\t"), '', $response_content);
  $response_content = trim(str_replace('"', "'", $response_content));
  $simpleXml = simplexml_load_string($response_content);
  return $simpleXml === false ? null : $simpleXml;
}

function saveSessionLogin()
{
  global $user_id;
  global $oauth_id;
  global $eventorPersonId;

  // Only when there is a session, a guest doesn't get one
  if (session_status() != PHP_SESSION_ACTIVE)
  {
    return;
  }
  $_SESSION['user_id'] = $user_id;
  $_SESSION['oauth_id'] = $oauth_id;
  $_SESSION['eventor_person_id'] = $eventorPersonId;
}

function clearSessionLogin()
{
  global $user_id;
  global $oauth_id;
  global $eventorPersonId;
  global $userName;
  global $oauthGuest;

  $user_id = 0;
  $oauth_id = 0;
  $oauthGuest = null;
  $eventorPersonId = null;
  $userName = "Okänd";
  // $_SESSION doesn't exist without a session (PHP 7 says "Undefined variable"), a guest doesn't get one
  if (session_status() != PHP_SESSION_ACTIVE)
  {
    return;
  }
  unset($_SESSION['user_id']);
  unset($_SESSION['oauth_id']);
  unset($_SESSION['eventor_person_id']);
  unset($_SESSION['user_name']);
  // Old versions saved the password in the session
  unset($_SESSION['PHP_AUTH_USER']);
  unset($_SESSION['PHP_AUTH_PW']);
}

// Sets $user_id and $eventorPersonId from the user, 0 when the user doesn't exist
function loadUser($iUserId)
{
  global $user_id;
  global $eventorPersonId;

  $user_id = 0;
  if (intval($iUserId) <= 0)
  {
    return;
  }
  $row = sqlFirstRow("SELECT u.user_id, ul.eventor_person_id FROM users AS u " .
                     "LEFT OUTER JOIN user_login AS ul ON (ul.user_id = u.user_id) " .
                     "WHERE u.user_id = " . intval($iUserId));
  if (!is_null($row))
  {
    $user_id = intval($row['user_id']);
    if (!is_null($row['eventor_person_id']))
    {
      $eventorPersonId = intval($row['eventor_person_id']);
    }
  }
}

// Sets the login from a Google/Facebook account, the account may be linked to a user
// after the token was created. False when the account is deleted.
function loadOAuthAccount($iOAuthId)
{
  global $oauth_id;

  $row = sqlFirstRow("SELECT oauth_id, user_id FROM user_oauth WHERE oauth_id = " . intval($iOAuthId));
  if (is_null($row))
  {
    return false;
  }
  $oauth_id = intval($row['oauth_id']);
  loadUser(is_null($row['user_id']) ? 0 : intval($row['user_id']));
  return true;
}

// Username and password from Eventor (the hash of them is saved, to not ask Eventor every time)
function loginWithPassword($auth_user, $auth_password)
{
  global $user_id;
  global $oauth_id;
  global $eventorPersonId;

  $user_id = 0;
  $oauth_id = 0;
  $eventorPersonId = null;
  $person = null;
  $base64_client = base64_encode($auth_user . ":" . $auth_password);
  $base64_hash = hash("sha512", $base64_client);

  OpenDatabase();

  $row = sqlFirstRow(sprintf("SELECT eventor_person_id FROM user_login WHERE base64 = '%s'",
                             \db\mysql_real_escape_string($base64_hash)));
  if (!is_null($row))
  {
    $eventorPersonId = intval($row['eventor_person_id']);
  }

  if (is_null($eventorPersonId))
  {
    $person = getAuthenticatePerson($auth_user, $auth_password);
    if (is_null($person) || !isset($person->PersonId))
    {
      return false;
    }
    $eventorPersonId = intval($person->PersonId);
  }

  $row = sqlFirstRow(sprintf("SELECT user_id FROM user_login WHERE eventor_person_id = %d", $eventorPersonId));
  if (!is_null($row))
  {
    $user_id = intval($row['user_id']);
  }

  $withinOrganisation = (!is_null($person) && (string)$person->OrganisationId == GetEventorOrganisationId());
  if (!is_null($person) && !$withinOrganisation && isset($person->Role))
  {
    foreach ($person->Role as $role)
    {
      if ((string)$role->OrganisationId == GetEventorOrganisationId())
      {
        $withinOrganisation = true;
      }
    }
  }
  if ($user_id == 0 && !is_null($person) && $withinOrganisation)
  {
    $sql = "INSERT INTO users (birthday,first_name,last_name) " .
      "VALUES ('" . \db\mysql_real_escape_string((string)$person->BirthDate->Date) . "', " .
      "'" . \db\mysql_real_escape_string((string)$person->PersonName->Given) . "', " .
      "'" . \db\mysql_real_escape_string((string)$person->PersonName->Family) . "')";

    sqlQueryOrError($sql);
    $user_id = \db\mysql_insert_id();

    $sql = "INSERT INTO user_login (user_id,eventor_person_id,base64) " .
      "VALUES (" . $user_id . ", " . $eventorPersonId . ", " .
      "'" . \db\mysql_real_escape_string($base64_hash) . "')";

    sqlQueryOrError($sql);
  }
  elseif ($user_id > 0 && !is_null($person))
  {
    $sql = "UPDATE user_login " .
           "SET base64 = '" . \db\mysql_real_escape_string($base64_hash) . "' " .
           "WHERE user_id = " . $user_id;

    sqlQueryOrError($sql);
  }
  CommitDatabase();

  if ($user_id <= 0)
  {
    return false;
  }
  saveSessionLogin();
  return true;
}

// Creates a token for the current login, only the hash is saved. Returns the token.
function createLoginToken($iType, $iRemember)
{
  global $user_id;
  global $oauth_id;
  global $eventorPersonId;
  global $cLOGIN_TOKEN_DAYS;
  global $cLOGIN_TOKEN_REMEMBER_DAYS;
  global $cOAUTH_EXCHANGE_SECONDS;

  OpenDatabase();
  $token = bin2hex(random_bytes(32));
  $seconds = $iType == 'EXCHANGE'
    ? $cOAUTH_EXCHANGE_SECONDS
    : 86400 * ($iRemember ? $cLOGIN_TOKEN_REMEMBER_DAYS : $cLOGIN_TOKEN_DAYS);

  sqlQueryOrError("DELETE FROM user_login_tokens WHERE expire_date < NOW()");
  sqlQueryOrError(sprintf("INSERT INTO user_login_tokens " .
                          "(token_hash, token_type, user_id, oauth_id, eventor_person_id, remember, cre_date, expire_date) " .
                          "VALUES ('%s', '%s', %s, %s, %s, %d, NOW(), DATE_ADD(NOW(), INTERVAL %d SECOND))",
                          hash('sha256', $token),
                          $iType == 'EXCHANGE' ? 'EXCHANGE' : 'LOGIN',
                          $user_id > 0 ? intval($user_id) : 'NULL',
                          $oauth_id > 0 ? intval($oauth_id) : 'NULL',
                          is_null($eventorPersonId) ? 'NULL' : intval($eventorPersonId),
                          $iRemember ? 1 : 0,
                          $seconds));
  CommitDatabase();
  return $token;
}

function deleteLoginToken($iToken)
{
  OpenDatabase();
  sqlQueryOrError(sprintf("DELETE FROM user_login_tokens WHERE token_hash = '%s'", hash('sha256', $iToken)));
  CommitDatabase();
}

// The login token sent as "Authorization: Bearer <token>", false when it is unknown or has expired
function loginWithToken($iToken)
{
  global $user_id;
  global $oauth_id;
  global $eventorPersonId;
  global $cLOGIN_TOKEN_DAYS;
  global $cLOGIN_TOKEN_REMEMBER_DAYS;

  $user_id = 0;
  $oauth_id = 0;
  $eventorPersonId = null;
  OpenDatabase();
  $tokenHash = hash('sha256', $iToken);
  $row = sqlFirstRow(sprintf("SELECT user_id, oauth_id, eventor_person_id, remember FROM user_login_tokens " .
                             "WHERE token_hash = '%s' AND token_type = 'LOGIN' AND expire_date > NOW()", $tokenHash));
  if (is_null($row))
  {
    return false;
  }

  if (!is_null($row['oauth_id']))
  {
    if (!loadOAuthAccount(intval($row['oauth_id'])))
    {
      return false;
    }
  }
  else
  {
    loadUser(is_null($row['user_id']) ? 0 : intval($row['user_id']));
  }
  if ($user_id <= 0 && $oauth_id <= 0)
  {
    return false;
  }

  // Extend the token while it is used, at most once an hour
  $days = intval($row['remember']) == 1 ? $cLOGIN_TOKEN_REMEMBER_DAYS : $cLOGIN_TOKEN_DAYS;
  sqlQueryOrError(sprintf("UPDATE user_login_tokens SET expire_date = DATE_ADD(NOW(), INTERVAL %d DAY) " .
                          "WHERE token_hash = '%s' AND expire_date < DATE_ADD(NOW(), INTERVAL %d HOUR)",
                          $days, $tokenHash, $days * 24 - 1));
  CommitDatabase();
  saveSessionLogin();
  return true;
}

// The one time code Google/Facebook returns to the web page with. Returns if the login should be remembered,
// null when the code is unknown or has expired.
function loginWithOAuthCode($iCode)
{
  global $user_id;
  global $oauth_id;
  global $eventorPersonId;

  $user_id = 0;
  $oauth_id = 0;
  $eventorPersonId = null;
  if (!is_string($iCode) || !preg_match('/^[0-9a-fA-F]{64}$/', $iCode))
  {
    return null;
  }
  OpenDatabase();
  $codeHash = hash('sha256', strtolower($iCode));
  $row = sqlFirstRow(sprintf("SELECT oauth_id, remember FROM user_login_tokens " .
                             "WHERE token_hash = '%s' AND token_type = 'EXCHANGE' AND expire_date > NOW()", $codeHash));
  // Only once
  sqlQueryOrError(sprintf("DELETE FROM user_login_tokens WHERE token_hash = '%s'", $codeHash));
  CommitDatabase();
  if (is_null($row) || is_null($row['oauth_id']) || !loadOAuthAccount(intval($row['oauth_id'])))
  {
    return null;
  }
  saveSessionLogin();
  return intval($row['remember']) == 1;
}

// The signed guest token. A saved account is used (it may be linked to a user since), otherwise it is
// a guest that isn't saved. Returns the payload of the token, null when it isn't valid.
function loginWithGuestToken($iToken)
{
  global $user_id;
  global $oauth_id;
  global $oauthGuest;
  global $eventorPersonId;

  $user_id = 0;
  $oauth_id = 0;
  $oauthGuest = null;
  $eventorPersonId = null;
  $payload = readGuestToken($iToken, 'G');
  if (is_null($payload))
  {
    return null;
  }
  $row = findOAuthAccount($payload['p'], $payload['s']);
  if (!is_null($row))
  {
    return loadOAuthAccount(intval($row['oauth_id'])) ? $payload : null;
  }
  $oauthGuest = $payload;
  return $payload;
}

// Saves the guest from the guest token, first when it is needed (react, comment or ask for access)
function ensureOAuthAccount()
{
  global $oauth_id;
  global $oauthGuest;

  if ($oauth_id > 0 || is_null($oauthGuest))
  {
    return;
  }
  $oauthId = oauthSaveAccount($oauthGuest['p'], guestProfile($oauthGuest));
  $oauthGuest = null;
  loadOAuthAccount($oauthId);
}

function setUserName()
{
  global $user_id;
  global $oauth_id;
  global $userName;
  global $oauthGuest;

  $userName = "Okänd";
  if ($user_id <= 0 && $oauth_id <= 0)
  {
    if (!is_null($oauthGuest))
    {
      $profile = guestProfile($oauthGuest);
      $userName = strlen((string)$profile->name) > 0 ? $profile->name : ($oauthGuest['p'] == 'GOOGLE' ? 'Google' : 'Facebook');
    }
    return;
  }
  OpenDatabase();
  if ($user_id > 0)
  {
    $row = sqlFirstRow(sprintf("SELECT first_name, last_name FROM users WHERE user_id = %d", $user_id));
    if (!is_null($row))
    {
      $userName = $row['first_name'] . " " . $row['last_name'];
    }
  }
  else
  {
    $row = sqlFirstRow(sprintf("SELECT name FROM user_oauth WHERE oauth_id = %d", $oauth_id));
    if (!is_null($row))
    {
      $userName = $row['name'];
    }
  }
}

function setUserID()
{
  global $user_id;
  global $oauth_id;
  global $eventorPersonId;
  global $oauthGuest;
  global $loginTokenKind;

  $user_id = 0;
  $oauth_id = 0;
  $oauthGuest = null;
  $loginTokenKind = null;
  $eventorPersonId = null;
  $auth = get_http_authorization();
  // A visitor that isn't logged in, or a guest, doesn't get a session (cookie)
  if ((!is_null($auth) && $auth->type != 'guest') || isset($_COOKIE[session_name()]))
  {
    StartSession();
  }

  if (!is_null($auth) && $auth->type == 'guest')
  {
    // Nothing is saved for a guest, not even in the session
    if (is_null(loginWithGuestToken($auth->token)))
    {
      $user_id = 0;
      $oauth_id = 0;
      $oauthGuest = null;
    }
    else
    {
      $loginTokenKind = 'guest';
    }
  }
  elseif (!is_null($auth) && $auth->type == 'bearer')
  {
    // The token decides, also when the session has another login
    if (!loginWithToken($auth->token))
    {
      clearSessionLogin();
      closeSession();
      return;
    }
  }
  elseif ((isset($_SESSION['user_id']) && intval($_SESSION['user_id']) > 0) ||
          (isset($_SESSION['oauth_id']) && intval($_SESSION['oauth_id']) > 0))
  {
    // E.g. a file link opened in a new tab, where the web page can't send the token
    $user_id = isset($_SESSION['user_id']) ? intval($_SESSION['user_id']) : 0;
    $oauth_id = isset($_SESSION['oauth_id']) ? intval($_SESSION['oauth_id']) : 0;
    $eventorPersonId = isset($_SESSION['eventor_person_id']) && !is_null($_SESSION['eventor_person_id'])
      ? intval($_SESSION['eventor_person_id'])
      : null;
  }
  elseif (!is_null($auth) && $auth->type == 'basic')
  {
    loginWithPassword($auth->user, $auth->password);
  }

  setUserName();
  // Nothing more is saved in the session, don't let the other requests from the same browser wait for it
  closeSession();
}

// Only users (members), not guests
function ValidLogin($shouldRedirect = false, $returnJsonUserInfo = false, $UseForbidden = false)
{
  StartSession();
  cors();
  global $user_id;
  setUserID();

  if ($user_id <= 0)
  {
    NotAuthorized($UseForbidden);
  }
  if ($returnJsonUserInfo && !$shouldRedirect)
  {
    Authorized();
  }
}

// Users and guests (logged in with Google/Facebook), e.g. to react and comment
function ValidSocialLogin()
{
  // setUserID starts the session when needed, a guest doesn't get one
  cors();
  global $user_id;
  global $oauth_id;
  global $oauthGuest;
  setUserID();

  if ($user_id <= 0 && $oauth_id <= 0 && is_null($oauthGuest))
  {
    NotAuthorized(true);
  }
}

function ValidGroup($iGroupID)
{
  global $user_id;
  $number_of = 0;

  //########################
  //# group_id = 1 = ADMIN #
  //########################

  OpenDatabase();

  $query = sprintf("SELECT COUNT(*) AS number_of FROM user_groups WHERE group_id = %s AND user_id = %s",
                   $iGroupID,
                   $user_id);

  $result = \db\mysql_query($query);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  while ($row = \db\mysql_fetch_assoc($result))
  {
    $number_of = intval($row['number_of']);
  }

  \db\mysql_free_result($result);

  if ($number_of > 0)
  {
    return true;
  }

  return false;
}

// The logged in user is this competitor, linked by an administrator or through Eventor
function IsOwnCompetitor($iCompetitorId)
{
  global $user_id;
  global $eventorPersonId;

  $competitorId = intval($iCompetitorId);
  if ($user_id <= 0 || $competitorId <= 0)
  {
    return false;
  }

  OpenDatabase();
  if (!is_null(sqlFirstRow(sprintf("SELECT user_id FROM users WHERE user_id = %d AND competitor_id = %d",
                                   $user_id, $competitorId))))
  {
    return true;
  }
  if (!is_null($eventorPersonId) && intval($eventorPersonId) > 0 &&
      !is_null(sqlFirstRow(sprintf("SELECT COMPETITOR_ID FROM RACE_COMPETITORS_EVENTOR " .
                                   "WHERE COMPETITOR_ID = %d AND EVENTOR_COMPETITOR_ID = %d",
                                   $competitorId, intval($eventorPersonId)))))
  {
    return true;
  }
  return false;
}

function getUserName($iUserID)
{
  $first_name = NULL;
  $last_name = NULL;

  OpenDatabase();

  $sql = "SELECT first_name, last_name FROM users WHERE user_id = " . $iUserID;

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  while ($row = \db\mysql_fetch_assoc($result))
  {
    $first_name = $row['first_name'];
    $last_name = $row['last_name'];
  }

  \db\mysql_free_result($result);

  if (is_null($first_name) && is_null($last_name))
  {
    return 'Info&nbsp;saknas';
  }

  return $first_name . '&nbsp;' . $last_name;
}

function getGroupName($iGroupID)
{
  $group_name = NULL;

  OpenDatabase();

  $sql = "SELECT description FROM groups WHERE group_id = " . $iGroupID;

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  while ($row = \db\mysql_fetch_assoc($result))
  {
    $group_name = $row['description'];
  }

  \db\mysql_free_result($result);

  if (is_null($group_name))
  {
    return 'Info&nbsp;saknas';
  }

  return $group_name;
}

function getGroupEmails($iGroupID)
{
  $emails = NULL;

  OpenDatabase();

  $sql = "SELECT u.email, u.first_name, u.last_name " .
         "FROM users AS u " .
         "INNER JOIN user_groups AS ug ON (u.user_id = ug.user_id) " .
         "WHERE ug.group_id = " . $iGroupID;

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  while ($row = \db\mysql_fetch_assoc($result))
  {
    $email = $row['first_name'] . " " . $row['last_name'] . "<" . $row['email'] . ">";
    if (is_null($emails))
    {
    	$emails = $email;
    }
    else
    {
    	$emails = $emails . "," . $email;
    }
  }

  \db\mysql_free_result($result);

  return $emails;
}

function getGroupEmailsHTML($iGroupID)
{
  $emails = NULL;

  OpenDatabase();

  $sql = "SELECT u.email, u.first_name, u.last_name " .
         "FROM users AS u " .
         "INNER JOIN user_groups AS ug ON (u.user_id = ug.user_id) " .
         "WHERE ug.group_id = " . $iGroupID;

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  while ($row = \db\mysql_fetch_assoc($result))
  {
    $email = $row['first_name'] . " " . $row['last_name'] . "<A href=\"mailto:" . $row['email'] . "?Subject=OK Orion\" target=\"_top\">&lt;" . $row['email'] . "&gt;</A>";

    if (is_null($emails))
    {
    	$emails = $email;
    }
    else
    {
    	$emails = $emails . ", " . $email;
    }
  }

  \db\mysql_free_result($result);

  return $emails;
}

?>