<?php
//############################################################
//# File:    delete.php                                      #
//# Created: 2020-10-18                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iPageID                                      #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2020-10-18  PatSjo  Initial version                      #
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

if(!isset($input->iPageID))
{
  $input->iPageID = 0;
}
if(!isset($input->iLinkID))
{
  $input->iLinkID = 0;
}

if (!(ValidGroup($cADMIN_GROUP_ID)))
{
  NotAuthorized();
}

OpenDatabase();

if ($input->iPageID > 0)
{
  $sql = "DELETE FROM HTMLEDITOR_GROUPS WHERE PAGE_ID = " . $input->iPageID;
  
  if (!\db\mysql_query($sql))
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }
  
  $sql = "DELETE FROM HTMLEDITOR_PAGES WHERE PAGE_ID = " . $input->iPageID;
  
  if (!\db\mysql_query($sql))
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }
}
elseif ($input->iLinkID > 0)
{
  $sql = "DELETE FROM HTMLEDITOR_LINKS WHERE LINK_ID = " . $input->iLinkID;
  
  if (!\db\mysql_query($sql))
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }
}

CloseDatabase();
?>