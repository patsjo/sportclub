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
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

cors();

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

ValidLogin();
if (!ValidGroup(8888)) //Not a admin user
{
  NotAuthorized();
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

\db\mysql_query("COMMIT");

CloseDatabase();
?>