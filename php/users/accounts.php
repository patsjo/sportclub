<?php
//############################################################
//# File:    accounts.php                                    #
//# Created: 2026-11-13                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Accounts from Google/Facebook and access requests.       #
//# Parameters: iType                                        #
//#  For the logged in user or guest:                        #
//#   MY              the groups that can be requested and   #
//#                   my requests                            #
//#   REQUEST         groupId (0 = member, only guests),     #
//#                   message                                #
//#   CANCEL          requestId, my pending request          #
//#  For administrators:                                     #
//#   LIST            accounts, pending requests, users and  #
//#                   groups                                 #
//#   LINK            oauthId, userId (0 = create a new user #
//#                   from firstName, lastName, email),      #
//#                   competitorId (null = no competitor)    #
//#   APPROVE         requestId, groupId, and for a guest    #
//#                   the same as LINK                       #
//#   REJECT          requestId                              #
//#   UNLINK          oauthId                                #
//#   DELETE_ACCOUNT  oauthId, also its reactions/comments   #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-13  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/social.php");

ValidSocialLogin();

header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT"); // Date in the past

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json === false ? '' : $json);
if (!is_object($input) || !isset($input->iType) || !is_string($input->iType))
{
  trigger_error('Felaktig parameter "iType".', E_USER_ERROR);
}

OpenDatabase();
$isAdmin = $user_id > 0 && ValidGroup($cADMIN_GROUP_ID);
$adminTypes = array('LIST', 'LINK', 'APPROVE', 'REJECT', 'UNLINK', 'DELETE_ACCOUNT');
if (in_array($input->iType, $adminTypes, true) && !$isAdmin)
{
  NotAuthorized(true);
}

function accountsError($iMessage)
{
  trigger_error($iMessage, E_USER_ERROR);
}

function inputInt($iInput, $iName, $iDefault = 0)
{
  return isset($iInput->$iName) && is_numeric($iInput->$iName) ? intval($iInput->$iName) : $iDefault;
}

function inputString($iInput, $iName, $iMaxLength)
{
  if (!isset($iInput->$iName) || !is_string($iInput->$iName))
  {
    return '';
  }
  $value = trim($iInput->$iName);
  return function_exists('mb_substr') ? mb_substr($value, 0, $iMaxLength) : substr($value, 0, $iMaxLength);
}

function sqlStringOrNull($iValue)
{
  return strlen($iValue) == 0 ? 'NULL' : "'" . \db\mysql_real_escape_string($iValue) . "'";
}

// The groups that can be requested, all but the administrators
function requestableGroups()
{
  global $cADMIN_GROUP_ID;
  $groups = array();
  $result = sqlQueryOrError("SELECT group_id, description FROM `groups` WHERE group_id <> " . intval($cADMIN_GROUP_ID) .
                            " ORDER BY description");
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $x = new stdClass();
    $x->groupId = intval($row['group_id']);
    $x->description = $row['description'];
    array_push($groups, $x);
  }
  \db\mysql_free_result($result);
  return $groups;
}

function requestFromRow($iRow)
{
  $x = new stdClass();
  $x->requestId = intval($iRow['request_id']);
  $x->oauthId = is_null($iRow['oauth_id']) ? null : intval($iRow['oauth_id']);
  $x->userId = is_null($iRow['user_id']) ? null : intval($iRow['user_id']);
  $x->groupId = intval($iRow['group_id']);
  $x->message = $iRow['message'];
  $x->status = $iRow['status'];
  $x->creDate = $iRow['cre_date'];
  return $x;
}

// The user is linked to the account, or a new user is created from the input
function linkAccount($iInput, $iOAuthId)
{
  $account = sqlFirstRow(sprintf("SELECT oauth_id, user_id FROM user_oauth WHERE oauth_id = %d", $iOAuthId));
  if (is_null($account))
  {
    accountsError('Kontot finns inte längre.');
  }
  $userId = inputInt($iInput, 'userId');
  if ($userId > 0)
  {
    if (is_null(sqlFirstRow(sprintf("SELECT user_id FROM users WHERE user_id = %d", $userId))))
    {
      accountsError('Användaren finns inte längre.');
    }
  }
  else
  {
    $firstName = inputString($iInput, 'firstName', 16);
    $lastName = inputString($iInput, 'lastName', 32);
    if (strlen($firstName) == 0 || strlen($lastName) == 0)
    {
      accountsError('Förnamn och efternamn måste anges för en ny användare.');
    }
    sqlQueryOrError(sprintf("INSERT INTO users (first_name, last_name, email) VALUES ('%s', '%s', %s)",
                            \db\mysql_real_escape_string($firstName),
                            \db\mysql_real_escape_string($lastName),
                            sqlStringOrNull(inputString($iInput, 'email', 64))));
    $userId = intval(\db\mysql_insert_id());
  }

  sqlQueryOrError(sprintf("UPDATE user_oauth SET user_id = %d WHERE oauth_id = %d", $userId, $iOAuthId));
  if (property_exists($iInput, 'competitorId'))
  {
    $competitorId = inputInt($iInput, 'competitorId');
    sqlQueryOrError(sprintf("UPDATE users SET competitor_id = %s WHERE user_id = %d",
                            $competitorId > 0 ? $competitorId : 'NULL', $userId));
  }
  socialMoveAuthor($iOAuthId, $userId);
  // The pending requests of the guest now belongs to the user
  sqlQueryOrError(sprintf("UPDATE user_access_requests SET user_id = %d WHERE oauth_id = %d AND status = 'PENDING'",
                          $userId, $iOAuthId));
  // A linked user is a member, so those requests are done, and also the ones for groups the user already has
  global $user_id;
  sqlQueryOrError(sprintf("UPDATE user_access_requests SET status = 'APPROVED', handled_by_user_id = %d, handled_date = NOW() " .
                          "WHERE user_id = %d AND status = 'PENDING' AND " .
                          "(group_id = 0 OR group_id IN (SELECT group_id FROM user_groups WHERE user_id = %d))",
                          intval($user_id), $userId, $userId));
  return $userId;
}

function handleRequest($iRequestId, $iStatus)
{
  global $user_id;
  sqlQueryOrError(sprintf("UPDATE user_access_requests SET status = '%s', handled_by_user_id = %d, handled_date = NOW() " .
                          "WHERE request_id = %d",
                          $iStatus, intval($user_id), $iRequestId));
}

$rows = new stdClass();

if ($input->iType == "MY")
{
  $rows->groups = requestableGroups();
  $rows->memberGroupIds = array();
  if ($user_id > 0)
  {
    $result = sqlQueryOrError(sprintf("SELECT group_id FROM user_groups WHERE user_id = %d", $user_id));
    while ($row = \db\mysql_fetch_assoc($result))
    {
      array_push($rows->memberGroupIds, intval($row['group_id']));
    }
    \db\mysql_free_result($result);
  }
  $rows->requests = array();
  $where = $user_id > 0 ? sprintf("user_id = %d", $user_id) : sprintf("oauth_id = %d AND user_id IS NULL", $oauth_id);
  $result = sqlQueryOrError("SELECT request_id, oauth_id, user_id, group_id, message, status, cre_date " .
                            "FROM user_access_requests WHERE " . $where . " ORDER BY cre_date DESC LIMIT 20");
  while ($row = \db\mysql_fetch_assoc($result))
  {
    array_push($rows->requests, requestFromRow($row));
  }
  \db\mysql_free_result($result);
}
elseif ($input->iType == "REQUEST")
{
  $groupId = inputInt($input, 'groupId', -1);
  $message = inputString($input, 'message', 512);
  if ($groupId == 0 && $user_id > 0)
  {
    accountsError('Du är redan medlem.');
  }
  if ($groupId < 0 || $groupId == $cADMIN_GROUP_ID ||
      ($groupId > 0 && is_null(sqlFirstRow(sprintf("SELECT group_id FROM `groups` WHERE group_id = %d", $groupId)))))
  {
    accountsError('Felaktig parameter "groupId".');
  }
  // A guest that has only been logged in isn't saved, it is saved now when it asks for access
  ensureOAuthAccount();
  $who = $user_id > 0 ? sprintf("user_id = %d", $user_id) : sprintf("oauth_id = %d AND user_id IS NULL", $oauth_id);
  if (!is_null(sqlFirstRow(sprintf("SELECT request_id FROM user_access_requests WHERE %s AND group_id = %d AND status = 'PENDING'",
                                   $who, $groupId))))
  {
    accountsError('Du har redan en förfrågan om samma behörighet.');
  }
  sqlQueryOrError(sprintf("INSERT INTO user_access_requests (oauth_id, user_id, group_id, message, status, cre_date) " .
                          "VALUES (%s, %s, %d, %s, 'PENDING', NOW())",
                          $oauth_id > 0 ? intval($oauth_id) : 'NULL',
                          $user_id > 0 ? intval($user_id) : 'NULL',
                          $groupId,
                          sqlStringOrNull($message)));
  $rows->requestId = intval(\db\mysql_insert_id());
}
elseif ($input->iType == "CANCEL")
{
  $who = $user_id > 0 ? sprintf("user_id = %d", $user_id) : sprintf("oauth_id = %d AND user_id IS NULL", $oauth_id);
  sqlQueryOrError(sprintf("DELETE FROM user_access_requests WHERE request_id = %d AND status = 'PENDING' AND %s",
                          inputInt($input, 'requestId'), $who));
}
elseif ($input->iType == "LIST")
{
  $rows->accounts = array();
  $result = sqlQueryOrError("SELECT o.oauth_id, o.provider, o.user_id, o.name, o.first_name, o.last_name, o.email, " .
                            "o.picture_url, o.cre_date, o.last_login_date, u.first_name AS user_first_name, " .
                            "u.last_name AS user_last_name, u.competitor_id " .
                            "FROM user_oauth AS o LEFT OUTER JOIN users AS u ON (u.user_id = o.user_id) " .
                            "ORDER BY o.last_login_date DESC");
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $x = new stdClass();
    $x->oauthId = intval($row['oauth_id']);
    $x->provider = $row['provider'];
    $x->userId = is_null($row['user_id']) ? null : intval($row['user_id']);
    $x->userName = is_null($row['user_id']) ? null : trim($row['user_first_name'] . ' ' . $row['user_last_name']);
    $x->competitorId = is_null($row['competitor_id']) ? null : intval($row['competitor_id']);
    $x->name = $row['name'];
    $x->firstName = $row['first_name'];
    $x->lastName = $row['last_name'];
    $x->email = $row['email'];
    $x->pictureUrl = $row['picture_url'];
    $x->creDate = $row['cre_date'];
    $x->lastLoginDate = $row['last_login_date'];
    array_push($rows->accounts, $x);
  }
  \db\mysql_free_result($result);

  $rows->requests = array();
  $result = sqlQueryOrError("SELECT r.request_id, r.oauth_id, r.user_id, r.group_id, r.message, r.status, r.cre_date, " .
                            "u.first_name, u.last_name " .
                            "FROM user_access_requests AS r LEFT OUTER JOIN users AS u ON (u.user_id = r.user_id) " .
                            "WHERE r.status = 'PENDING' ORDER BY r.cre_date");
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $x = requestFromRow($row);
    $x->userName = is_null($row['first_name']) ? null : trim($row['first_name'] . ' ' . $row['last_name']);
    array_push($rows->requests, $x);
  }
  \db\mysql_free_result($result);

  $rows->users = array();
  $result = sqlQueryOrError("SELECT user_id, first_name, last_name, email, competitor_id FROM users ORDER BY last_name, first_name");
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $x = new stdClass();
    $x->userId = intval($row['user_id']);
    $x->name = trim($row['first_name'] . ' ' . $row['last_name']);
    $x->email = $row['email'];
    $x->competitorId = is_null($row['competitor_id']) ? null : intval($row['competitor_id']);
    array_push($rows->users, $x);
  }
  \db\mysql_free_result($result);

  $rows->groups = requestableGroups();
}
elseif ($input->iType == "LINK")
{
  $rows->userId = linkAccount($input, inputInt($input, 'oauthId'));
}
elseif ($input->iType == "APPROVE")
{
  $requestId = inputInt($input, 'requestId');
  $request = sqlFirstRow(sprintf("SELECT request_id, oauth_id, user_id FROM user_access_requests " .
                                 "WHERE request_id = %d AND status = 'PENDING'", $requestId));
  if (is_null($request))
  {
    accountsError('Förfrågan finns inte längre.');
  }
  $userId = is_null($request['user_id']) ? 0 : intval($request['user_id']);
  if (!is_null($request['oauth_id']))
  {
    $account = sqlFirstRow(sprintf("SELECT user_id FROM user_oauth WHERE oauth_id = %d", intval($request['oauth_id'])));
    if (is_null($account))
    {
      accountsError('Kontot finns inte längre.');
    }
    $userId = is_null($account['user_id']) ? 0 : intval($account['user_id']);
    // A guest must be linked to a user, also to only become a member
    if ($userId <= 0 || property_exists($input, 'userId'))
    {
      $userId = linkAccount($input, intval($request['oauth_id']));
    }
  }
  elseif ($userId > 0 && property_exists($input, 'competitorId'))
  {
    $competitorId = inputInt($input, 'competitorId');
    sqlQueryOrError(sprintf("UPDATE users SET competitor_id = %s WHERE user_id = %d",
                            $competitorId > 0 ? $competitorId : 'NULL', $userId));
  }
  if ($userId <= 0)
  {
    accountsError('Förfrågan saknar användare.');
  }
  $groupId = inputInt($input, 'groupId');
  if ($groupId > 0)
  {
    sqlQueryOrError(sprintf("INSERT IGNORE INTO user_groups (user_id, group_id) VALUES (%d, %d)", $userId, $groupId));
  }
  handleRequest($requestId, 'APPROVED');
  $rows->userId = $userId;
}
elseif ($input->iType == "REJECT")
{
  handleRequest(inputInt($input, 'requestId'), 'REJECTED');
}
elseif ($input->iType == "UNLINK")
{
  sqlQueryOrError(sprintf("UPDATE user_oauth SET user_id = NULL WHERE oauth_id = %d", inputInt($input, 'oauthId')));
}
elseif ($input->iType == "DELETE_ACCOUNT")
{
  $oauthId = inputInt($input, 'oauthId');
  socialDeleteAuthor('O' . $oauthId);
  sqlQueryOrError(sprintf("DELETE FROM user_login_tokens WHERE oauth_id = %d", $oauthId));
  sqlQueryOrError(sprintf("DELETE FROM user_access_requests WHERE oauth_id = %d AND user_id IS NULL", $oauthId));
  sqlQueryOrError(sprintf("DELETE FROM user_oauth WHERE oauth_id = %d", $oauthId));
}
else
{
  accountsError('Felaktig parameter "iType".');
}

CloseDatabase();

header("Content-Type: application/json");
echo json_encode($rows);
?>
