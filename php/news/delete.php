<?php
//############################################################
//# File:    delete.php                                      #
//# Created: 2003-12-28                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iNewsID                                      #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2003-12-28  PatSjo  Initial version                      #
//# 2005-02-12  PatSjo  Don't delete file if it isn't in the #
//#                     news folder (folder_id = 1).         #
//# 2005-08-28  PatSjo  Changes from Access to MySQL         #
//# 2014-04-20  PatSjo  Changes from ASP to PHP              #
//# 2021-08-21  PatSjo  Change to JSON in and out            #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

ValidLogin();

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

$file_id = 0;

if(!isset($input->iNewsID))
{
  trigger_error('Felaktig parameter "iNewsID"', E_USER_ERROR);
}

if (!(ValidGroup($cADMIN_GROUP_ID)))
{
  NotAuthorized();
}

OpenDatabase();

$sql = "SELECT file_id FROM news WHERE id = " . $input->iNewsID;

$result = \db\mysql_query($sql);
if (!$result)
{
  trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
}

while ($row = \db\mysql_fetch_assoc($result))
{
  $file_id              = is_null($row['file_id']) ? 0 : intval($row['file_id']);
}
\db\mysql_free_result($result);

$sql = "DELETE FROM news WHERE id = " . $input->iNewsID;

if (!\db\mysql_query($sql))
{
  trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
}

if ($file_id > 0) //There is a file to delete
{
  //########################
  //# folder_id = 1 = NEWS #
  //########################

  $sql = "DELETE FROM files WHERE folder_id = 1 AND file_id = " . $file_id;

  if (!\db\mysql_query($sql))
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }
}

CloseDatabase();
?>