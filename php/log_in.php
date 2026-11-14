<?php
//############################################################
//# File:    log_in.php                                      #
//# Created: 2003-12-19                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters (JSON):                                       #
//#   username, password, rememberLogin  Eventor login       #
//#   oauthCode                 the one time code that       #
//#                             Google/Facebook returned with #
//#   googleCredential          the id token from the        #
//#                             automatic Google login       #
//#   (nothing)                 checks the login token in    #
//#                             "Authorization: Bearer"      #
//# Returns the user info, and a new token (token,           #
//# rememberLogin) when username/password or oauthCode is    #
//# sent. The web page sends the token on every request.     #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2003-12-19  PatSjo  Initial version                      #
//# 2006-01-04  PatSjo  Changes from ASP to PHP              #
//# 2021-08-21  PatSjo  Change to JSON in and out            #
//# 2026-11-13  PatSjo  Login tokens, Google and Facebook    #
//# 2026-11-14  PatSjo  Automatic Google login, guest tokens #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/oauth.php");

// No session is started here for a guest, setUserID and the logins below start it when needed
cors();

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json === false ? '' : $json);
if (!is_object($input))
{
  $input = new stdClass();
}

// The signed one time code from oauth/google.php or oauth/facebook.php
if (isset($input->oauthCode) && is_string($input->oauthCode) && substr($input->oauthCode, 0, 2) == 'g.')
{
  $payload = readGuestToken($input->oauthCode, 'X');
  if (is_null($payload))
  {
    NotAuthorized(true);
  }
  oauthLoginProfile($payload['p'], guestProfile($payload), isset($payload['r']) && intval($payload['r']) == 1);
}

// The automatic Google login, always remembered until the user logs out
if (isset($input->googleCredential))
{
  $profile = oauthGoogleCredentialProfile($input->googleCredential);
  if (is_null($profile))
  {
    NotAuthorized(true);
  }
  oauthLoginProfile('GOOGLE', $profile, true);
}

// A one time code from an older version (saved in user_login_tokens)
if (isset($input->oauthCode))
{
  StartSession();
  clearSessionLogin();
  $remember = loginWithOAuthCode($input->oauthCode);
  if (is_null($remember))
  {
    NotAuthorized(true);
  }
  setUserName();
  Authorized(createLoginToken('LOGIN', $remember), $remember);
}

if (isset($input->username) && isset($input->password) && is_string($input->username) && is_string($input->password) &&
    strlen($input->username) > 0 && strlen($input->password) > 0)
{
  StartSession();
  clearSessionLogin();
  if (!loginWithPassword($input->username, $input->password))
  {
    NotAuthorized(true);
  }
  $remember = isset($input->rememberLogin) && $input->rememberLogin ? true : false;
  setUserName();
  Authorized(createLoginToken('LOGIN', $remember), $remember);
}

// The web page starts and checks if the saved token still is valid
setUserID();
if ($user_id <= 0 && $oauth_id <= 0 && is_null($oauthGuest))
{
  NotAuthorized(true);
}
if ($loginTokenKind == 'guest')
{
  $payload = readGuestToken(get_http_authorization()->token, 'G');
  $remember = isset($payload['r']) && intval($payload['r']) == 1;
  if ($user_id > 0)
  {
    // The guest has been linked to a user, change to a saved login token (that can be ended)
    StartSession();
    saveSessionLogin();
    Authorized(createLoginToken('LOGIN', $remember), $remember);
  }
  // A new guest token, it lives 90 days after it was last used
  Authorized(createGuestToken('G', $payload['p'], guestProfile($payload), $remember, 86400 * $cLOGIN_TOKEN_REMEMBER_DAYS),
             $remember);
}
Authorized();
?>