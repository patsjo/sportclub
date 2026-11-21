<?php
//############################################################
//# File:    save.php                                        #
//# Created: 2026-11-21                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iKey, iValue, only for an administrator      #
//#   MENU_ORDER  iValue the keys of the top level menu      #
//#               items and dividers in order, [] = back to  #
//#               the default order                          #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-21  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/settings.php");

cors();

header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT"); // Date in the past

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

ValidLogin();
if (!ValidGroup($cADMIN_GROUP_ID))
{
  NotAuthorized();
}

if (!isset($input->iKey) || !in_array($input->iKey, $cSETTINGS))
{
  settingsError('Felaktig parameter "iKey"');
}

OpenDatabase();
global $user_id;

$value = null;
if ($input->iKey == $cSETTING_MENU_ORDER)
{
  $value = validMenuOrder(isset($input->iValue) ? $input->iValue : null);
  saveSetting($cSETTING_MENU_ORDER, count($value) > 0 ? $value : null, $user_id);
}

CloseDatabase();
settingsOutputJson($value);

?>
