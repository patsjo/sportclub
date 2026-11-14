<?php
//############################################################
//# File:    jsonSocialQuery.php                             #
//# Created: 2026-11-13                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iType                                        #
//#   SUMMARY   targets (array of targetType, targetId),     #
//#             counts, my reaction and number of comments   #
//#   DETAILS   targetType, targetId, also who reacted and   #
//#             the comments                                 #
//# Everyone can read, the login is only used for "my"       #
//# reaction and the comments that can be deleted.           #
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

cors();
setUserID();

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

if ($input->iType == "SUMMARY")
{
  if (!isset($input->targets) || !is_array($input->targets) || count($input->targets) > $cSOCIAL_MAX_TARGETS)
  {
    socialError('Felaktig parameter "targets", max ' . $cSOCIAL_MAX_TARGETS . ' st.');
  }
  $targets = array();
  foreach ($input->targets as $target)
  {
    array_push($targets, socialTargetFromInput($target));
  }
  $rows = new stdClass();
  $rows->summaries = socialSummaries($targets);
}
elseif ($input->iType == "DETAILS")
{
  $rows = socialDetails(socialTargetFromInput($input));
}
else
{
  socialError('Felaktig parameter "iType".');
}

CloseDatabase();

header("Content-Type: application/json");
echo json_encode($rows);
?>
