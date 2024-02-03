<?php
//############################################################
//# File:    delete.php                                      #
//# Created: 2014-01-14                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2014-01-14  PatSjo  Initial version                      #
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

if(!isset($input->iType))
{
  $input->iType = "";
}

if (!(ValidGroup($cADMIN_GROUP_ID)))
{
  trigger_error('User needs to be a administrator, to delete a competitor/family.');
}

OpenDatabase();

if ($input->iType == "COMPETITOR")
{
  if(!isset($input->clubId))
  {
    trigger_error('Missing parameter competitorId', E_USER_ERROR);
  }

  if(!isset($input->competitorId))
  {
    trigger_error('Missing parameter competitorId', E_USER_ERROR);
  }

  $sql = "DELETE FROM RACE_COMPETITORS_CLUB WHERE competitor_id = " . $input->competitorId . " AND club_id = " . $input->clubId;

  if (!\db\mysql_query($sql))
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }
}
elseif ($input->iType == "FAMILY")
{
  if(!isset($input->familyId))
  {
    trigger_error('Missing parameter familyId', E_USER_ERROR);
  }

  $sql = "UPDATE RACE_COMPETITORS SET family_id = null WHERE family_id = " . $input->familyId;

  if (!\db\mysql_query($sql))
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  $sql = "DELETE FROM RACE_FAMILIES WHERE family_id = " . $input->familyId;

  if (!\db\mysql_query($sql))
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }
}
else
{
  trigger_error(sprintf('Unsupported type (%s)', $input->iType), E_USER_ERROR);
}

CloseDatabase();
?>