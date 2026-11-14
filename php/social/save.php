<?php
//############################################################
//# File:    save.php                                        #
//# Created: 2026-11-13                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iType, targetType, targetId                  #
//#   REACTION        reaction (LIKE, DISLIKE, HEART or null #
//#                   to remove), one reaction per person    #
//#   COMMENT         text                                   #
//#   DELETE_COMMENT  commentId, own comments or as admin    #
//# Users and guests (Google/Facebook). Returns the details  #
//# of the target, the same as jsonSocialQuery.php DETAILS.  #
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
if (!is_object($input) || !isset($input->iType))
{
  socialError('Felaktig parameter "iType".');
}

OpenDatabase();
// A guest that has only been logged in isn't saved, it is saved now when it reacts or comments
if ($input->iType == "COMMENT" || ($input->iType == "REACTION" && isset($input->reaction) && !is_null($input->reaction)))
{
  ensureOAuthAccount();
}
$authorKey = socialAuthorKey();
$authorColumns = sprintf("'%s', %s, %s",
                         $authorKey,
                         $user_id > 0 ? intval($user_id) : 'NULL',
                         $user_id > 0 || $oauth_id <= 0 ? 'NULL' : intval($oauth_id));

if ($input->iType == "REACTION")
{
  $target = socialTargetFromInput($input);
  $reaction = isset($input->reaction) ? $input->reaction : null;
  if (!is_null($reaction) && !in_array($reaction, $cSOCIAL_REACTIONS, true))
  {
    socialError('Felaktig parameter "reaction".');
  }
  sqlQueryOrError("DELETE FROM SOCIAL_REACTIONS WHERE " . socialTargetWhere($target) .
                  " AND AUTHOR_KEY = '" . $authorKey . "'");
  if (!is_null($reaction))
  {
    sqlQueryOrError(sprintf("INSERT INTO SOCIAL_REACTIONS (TARGET_TYPE, TARGET_ID, AUTHOR_KEY, USER_ID, OAUTH_ID, REACTION, CRE_DATE) " .
                            "VALUES ('%s', '%s', %s, '%s', NOW())",
                            $target->targetType, \db\mysql_real_escape_string($target->targetId), $authorColumns, $reaction));
  }
}
elseif ($input->iType == "COMMENT")
{
  $target = socialTargetFromInput($input);
  $text = isset($input->text) && is_string($input->text) ? trim($input->text) : '';
  $length = function_exists('mb_strlen') ? mb_strlen($text) : strlen($text);
  if ($length == 0 || $length > $cSOCIAL_COMMENT_MAX_LENGTH)
  {
    socialError('Kommentaren måste anges och får max vara ' . $cSOCIAL_COMMENT_MAX_LENGTH . ' tecken.');
  }
  // Stops a script from flooding the comments
  $row = sqlFirstRow("SELECT COUNT(*) AS NUMBER_OF FROM SOCIAL_COMMENTS WHERE AUTHOR_KEY = '" . $authorKey .
                     "' AND CRE_DATE > DATE_SUB(NOW(), INTERVAL 1 MINUTE)");
  if (!is_null($row) && intval($row['NUMBER_OF']) >= 5)
  {
    socialError('För många kommentarer på kort tid, vänta en stund.');
  }
  sqlQueryOrError(sprintf("INSERT INTO SOCIAL_COMMENTS (TARGET_TYPE, TARGET_ID, AUTHOR_KEY, USER_ID, OAUTH_ID, TEXT, CRE_DATE) " .
                          "VALUES ('%s', '%s', %s, '%s', NOW())",
                          $target->targetType, \db\mysql_real_escape_string($target->targetId), $authorColumns,
                          \db\mysql_real_escape_string($text)));
}
elseif ($input->iType == "DELETE_COMMENT")
{
  $commentId = isset($input->commentId) ? intval($input->commentId) : 0;
  $row = sqlFirstRow(sprintf("SELECT TARGET_TYPE, TARGET_ID, AUTHOR_KEY FROM SOCIAL_COMMENTS WHERE COMMENT_ID = %d", $commentId));
  if (is_null($row))
  {
    socialError('Kommentaren finns inte längre.');
  }
  if ($row['AUTHOR_KEY'] !== $authorKey && !($user_id > 0 && ValidGroup($cADMIN_GROUP_ID)))
  {
    NotAuthorized(true);
  }
  sqlQueryOrError(sprintf("DELETE FROM SOCIAL_COMMENTS WHERE COMMENT_ID = %d", $commentId));
  $target = new stdClass();
  $target->targetType = $row['TARGET_TYPE'];
  $target->targetId = $row['TARGET_ID'];
}
else
{
  socialError('Felaktig parameter "iType".');
}

$rows = socialDetails($target);
CloseDatabase();

header("Content-Type: application/json");
echo json_encode($rows);
?>
