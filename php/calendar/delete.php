<?php
//############################################################
//# File:    /kalender/delete.php                            #
//# Created: 2005-09-24                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iActivityID                                  #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2005-09-24  PatSjo  Initial version                      #
//# 2013-12-15  PatSjo  Changed from ASP to PHP              #
//# 2020-11-24  PatSjo  Added iRepeatingGid                  #
//# 2021-08-21  PatSjo  Change to JSON in and out            #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");

cors();
ValidLogin();

header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT"); // Date in the past

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

$sql = "";

if(!isset($input->iActivityID) || $input->iActivityID == "")
{
  $input->iActivityID = 0;
}
if(!isset($input->iRepeatingGid) || $input->iRepeatingGid == "")
{
  $input->iRepeatingGid = null;
}

if (!(ValidGroup($cADMIN_GROUP_ID)))
{
  trigger_error('User needs to be a administrator, to delete a activity.');
}

OpenDatabase();

if (is_null($input->iRepeatingGid)) {
  $sql = "DELETE FROM activity " .
         "WHERE activity_id = " . $input->iActivityID;
} else {
  $sql = "DELETE FROM activity " .
         "WHERE repeating_gid = '" . $input->iRepeatingGid . "'";
}

if (!\db\mysql_query($sql))
{
  trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
}

CloseDatabase();
?>