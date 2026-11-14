<?php
//############################################################
//# File:    social.php                                      #
//# Created: 2026-11-13                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Reactions (like, dislike, heart) and comments on news,   #
//# calendar activities, Eventor races and cup races and     #
//# reports. Users and guests (Google/Facebook) can react    #
//# and comment, everyone can see them.                      #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-13  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

$cSOCIAL_TARGET_TYPES = array('NEWS', 'CALENDAR', 'MAP', 'CUP_RACE', 'CUP_REPORT');
$cSOCIAL_REACTIONS = array('LIKE', 'DISLIKE', 'HEART');
$cSOCIAL_COMMENT_MAX_LENGTH = 1000;
$cSOCIAL_MAX_TARGETS = 200;

function socialError($iMessage)
{
  trigger_error($iMessage, E_USER_ERROR);
}

function socialValidTarget($iTargetType, $iTargetId)
{
  global $cSOCIAL_TARGET_TYPES;
  return is_string($iTargetType) && in_array($iTargetType, $cSOCIAL_TARGET_TYPES, true) &&
    (is_string($iTargetId) || is_int($iTargetId)) && preg_match('/^[A-Za-z0-9_-]{1,64}$/', (string)$iTargetId);
}

function socialTargetFromInput($iInput)
{
  if (!is_object($iInput) || !isset($iInput->targetType) || !isset($iInput->targetId) ||
      !socialValidTarget($iInput->targetType, $iInput->targetId))
  {
    socialError('Felaktig parameter "targetType" eller "targetId".');
  }
  $target = new stdClass();
  $target->targetType = $iInput->targetType;
  $target->targetId = (string)$iInput->targetId;
  return $target;
}

function socialTargetWhere($iTarget, $iAlias = '')
{
  return sprintf("%sTARGET_TYPE = '%s' AND %sTARGET_ID = '%s'",
                 $iAlias, $iTarget->targetType, $iAlias, \db\mysql_real_escape_string($iTarget->targetId));
}

// U<user_id> for users and O<oauth_id> for guests, null when not logged in
function socialAuthorKey()
{
  global $user_id;
  global $oauth_id;
  if ($user_id > 0)
  {
    return 'U' . intval($user_id);
  }
  if ($oauth_id > 0)
  {
    return 'O' . intval($oauth_id);
  }
  return null;
}

// The name of the user, or of the Google/Facebook account for a guest
$cSOCIAL_AUTHOR_JOINS =
  "LEFT OUTER JOIN users AS u ON (u.user_id = s.USER_ID) " .
  "LEFT OUTER JOIN user_oauth AS o ON (o.oauth_id = s.OAUTH_ID) ";
$cSOCIAL_AUTHOR_COLUMNS =
  "u.first_name, u.last_name, o.name AS oauth_name, o.picture_url ";

function socialAuthorName($iRow)
{
  if (!is_null($iRow['first_name']) || !is_null($iRow['last_name']))
  {
    return trim($iRow['first_name'] . ' ' . $iRow['last_name']);
  }
  if (!is_null($iRow['oauth_name']))
  {
    return $iRow['oauth_name'];
  }
  return 'Okänd';
}

// Counts per reaction, my reaction and the number of comments for several targets
function socialSummaries($iTargets)
{
  global $cSOCIAL_REACTIONS;

  $authorKey = socialAuthorKey();
  $summaries = array();
  $wheres = array();
  foreach ($iTargets as $target)
  {
    $summary = new stdClass();
    $summary->targetType = $target->targetType;
    $summary->targetId = $target->targetId;
    $summary->counts = new stdClass();
    foreach ($cSOCIAL_REACTIONS as $reaction)
    {
      $summary->counts->$reaction = 0;
    }
    $summary->myReaction = null;
    $summary->comments = 0;
    $summaries[$target->targetType . '#' . $target->targetId] = $summary;
    array_push($wheres, '(' . socialTargetWhere($target) . ')');
  }
  if (count($wheres) == 0)
  {
    return array();
  }
  $where = implode(' OR ', $wheres);

  $result = sqlQueryOrError("SELECT TARGET_TYPE, TARGET_ID, REACTION, COUNT(*) AS NUMBER_OF, " .
                            "SUM(CASE WHEN AUTHOR_KEY = '" . \db\mysql_real_escape_string((string)$authorKey) . "' THEN 1 ELSE 0 END) AS MINE " .
                            "FROM SOCIAL_REACTIONS WHERE " . $where . " GROUP BY TARGET_TYPE, TARGET_ID, REACTION");
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $key = $row['TARGET_TYPE'] . '#' . $row['TARGET_ID'];
    $reaction = $row['REACTION'];
    if (!isset($summaries[$key]) || !in_array($reaction, $cSOCIAL_REACTIONS, true))
    {
      continue;
    }
    $summaries[$key]->counts->$reaction = intval($row['NUMBER_OF']);
    if (!is_null($authorKey) && intval($row['MINE']) > 0)
    {
      $summaries[$key]->myReaction = $reaction;
    }
  }
  \db\mysql_free_result($result);

  $result = sqlQueryOrError("SELECT TARGET_TYPE, TARGET_ID, COUNT(*) AS NUMBER_OF FROM SOCIAL_COMMENTS WHERE " . $where .
                            " GROUP BY TARGET_TYPE, TARGET_ID");
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $key = $row['TARGET_TYPE'] . '#' . $row['TARGET_ID'];
    if (isset($summaries[$key]))
    {
      $summaries[$key]->comments = intval($row['NUMBER_OF']);
    }
  }
  \db\mysql_free_result($result);

  return array_values($summaries);
}

// The summary, who reacted and all comments for one target
function socialDetails($iTarget)
{
  global $cSOCIAL_AUTHOR_JOINS;
  global $cSOCIAL_AUTHOR_COLUMNS;
  global $cADMIN_GROUP_ID;
  global $user_id;
  global $oauth_id;
  global $oauthGuest;

  $summaries = socialSummaries(array($iTarget));
  $details = $summaries[0];
  $details->reactions = array();
  $details->commentList = array();
  $authorKey = socialAuthorKey();
  $isAdmin = $user_id > 0 && ValidGroup($cADMIN_GROUP_ID);

  // Who reacted is only shown to the ones logged in (users and guests), the others only see the counts
  if ($user_id > 0 || $oauth_id > 0 || !is_null($oauthGuest))
  {
    $result = sqlQueryOrError("SELECT s.REACTION, " . $cSOCIAL_AUTHOR_COLUMNS . "FROM SOCIAL_REACTIONS AS s " .
                              $cSOCIAL_AUTHOR_JOINS . "WHERE " . socialTargetWhere($iTarget, 's.') . " ORDER BY s.CRE_DATE");
    while ($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->reaction = $row['REACTION'];
      $x->name = socialAuthorName($row);
      array_push($details->reactions, $x);
    }
    \db\mysql_free_result($result);
  }

  $result = sqlQueryOrError("SELECT s.COMMENT_ID, s.AUTHOR_KEY, s.TEXT, s.CRE_DATE, " . $cSOCIAL_AUTHOR_COLUMNS .
                            "FROM SOCIAL_COMMENTS AS s " . $cSOCIAL_AUTHOR_JOINS .
                            "WHERE " . socialTargetWhere($iTarget, 's.') . " ORDER BY s.CRE_DATE, s.COMMENT_ID");
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $x = new stdClass();
    $x->commentId = intval($row['COMMENT_ID']);
    $x->name = socialAuthorName($row);
    // Only a guest shows the picture from Google/Facebook
    $x->pictureUrl = is_null($row['first_name']) && is_null($row['last_name']) ? $row['picture_url'] : null;
    $x->text = $row['TEXT'];
    $x->creDate = $row['CRE_DATE'];
    $x->isMine = !is_null($authorKey) && $row['AUTHOR_KEY'] === $authorKey;
    $x->canDelete = $x->isMine || $isAdmin;
    array_push($details->commentList, $x);
  }
  \db\mysql_free_result($result);

  return $details;
}

// When a guest is linked to a user, the reactions and comments follow to the user
function socialMoveAuthor($iOAuthId, $iUserId)
{
  $from = 'O' . intval($iOAuthId);
  $to = 'U' . intval($iUserId);
  sqlQueryOrError(sprintf("UPDATE IGNORE SOCIAL_REACTIONS SET AUTHOR_KEY = '%s', USER_ID = %d WHERE AUTHOR_KEY = '%s'",
                          $to, intval($iUserId), $from));
  // The user had already reacted on the same item
  sqlQueryOrError(sprintf("DELETE FROM SOCIAL_REACTIONS WHERE AUTHOR_KEY = '%s'", $from));
  sqlQueryOrError(sprintf("UPDATE SOCIAL_COMMENTS SET AUTHOR_KEY = '%s', USER_ID = %d WHERE AUTHOR_KEY = '%s'",
                          $to, intval($iUserId), $from));
}

function socialDeleteAuthor($iAuthorKey)
{
  sqlQueryOrError(sprintf("DELETE FROM SOCIAL_REACTIONS WHERE AUTHOR_KEY = '%s'", \db\mysql_real_escape_string($iAuthorKey)));
  sqlQueryOrError(sprintf("DELETE FROM SOCIAL_COMMENTS WHERE AUTHOR_KEY = '%s'", \db\mysql_real_escape_string($iAuthorKey)));
}

?>
