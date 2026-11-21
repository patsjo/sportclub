<?php
//############################################################
//# File:    jsonSettingsQuery.php                           #
//# Created: 2026-11-21                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iKey                                         #
//#   MENU_ORDER  The order of the top level in the menu,    #
//#               the same for everyone (no login needed),   #
//#               [] when it isn't saved (the default order) #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-21  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/settings.php");

cors();

header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT"); // Date in the past

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

if (!isset($input->iKey) || !in_array($input->iKey, $cSETTINGS))
{
  settingsError('Felaktig parameter "iKey"');
}

OpenDatabase();

$value = getSetting($input->iKey);
if ($input->iKey == $cSETTING_MENU_ORDER && !is_array($value))
{
  $value = array();
}

CloseDatabase();
settingsOutputJson($value);

?>
