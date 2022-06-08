<?php
//############################################################
//# File:    delete.php                                      #
//# Created: 2022-06-08                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: userId                                       #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2022-06-08  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");

cors();
ValidLogin();

header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT"); // Date in the past

if (!(ValidGroup($cADMIN_GROUP_ID)))
{
  trigger_error('User needs to be a administrator, to delete a user.');
}

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

OpenDatabase();

$sql = "DELETE FROM user_groups WHERE user_id = " . $input->userId;

if (!\db\mysql_query($sql))
{
  trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
}

$sql = "DELETE FROM user_login WHERE user_id = " . $input->userId;

if (!\db\mysql_query($sql))
{
  trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
}

$sql = "DELETE FROM users WHERE user_id = " . $input->userId;

if (!\db\mysql_query($sql))
{
  trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
}

CloseDatabase();
?>