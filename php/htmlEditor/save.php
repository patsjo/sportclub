<?php

//############################################################
//# File:    save.php                                        #
//# Created: 2020-10-18                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iPageID (Values: 0 If a new news)            #
//#             iMenuPath, iData, iGroupIds                  #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2020-10-18  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");

ValidLogin();
if (!(ValidGroup($cADMIN_GROUP_ID)))
{
  NotAuthorized();
}

header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT"); // Date in the past

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

if(!isset($input->iMenuPath))
{
  trigger_error('Felaktig parameter "iMenuPath"', E_USER_ERROR);
}

OpenDatabase();
$now = date("Y-m-d G:i:s"); // MySQL DATETIME

if (isset($input->iPageID))
{
  $input->iData = \db\mysql_real_escape_string($input->iData);
  if (!strlen($input->iData))
  {
    trigger_error('Kunde ej läsa den uppladdade filen.', E_USER_ERROR);
  }
  
  if ($input->iPageID > 0)
  {
    $sql = "DELETE FROM HTMLEDITOR_GROUPS WHERE PAGE_ID = " . $input->iPageID;
  
    if (!\db\mysql_query($sql))
    {
      trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
    }
    
    $query = sprintf("UPDATE HTMLEDITOR_PAGES " .
                    "SET MENU_PATH = '%s', DATA = '%s'" .
                    "WHERE PAGE_ID = " . $input->iPageID,
                    \db\mysql_real_escape_string($input->iMenuPath),
                    $input->iData);
    \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
  }
  else
  {
    $query = sprintf("INSERT INTO HTMLEDITOR_PAGES " .
                    "(" .
                    "  MENU_PATH, DATA" .
                    ")" .
                    " VALUES " .
                    "(" .
                    "  '%s', '%s'" .
                    ")",
                    \db\mysql_real_escape_string($input->iMenuPath),
                    $input->iData);
  
    \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
  
    $input->iPageID = \db\mysql_insert_id();
          
    if ($input->iPageID == 0)
    {
      trigger_error("Can't get the 'page_id' auto_increment value", E_USER_ERROR);
    }
  }
  unset($input->iMenuPath);
  unset($input->iData);
  
  foreach($input->iGroupIds as $groupId)
  {
    $query = sprintf("INSERT INTO HTMLEDITOR_GROUPS " .
                    "(" .
                    "  PAGE_ID, GROUP_ID" .
                    ")" .
                    " VALUES " .
                    "(" .
                    "  %d, %d" .
                    ")",
                    $input->iPageID,
                    $groupId);
  
    \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
  }
  unset($input->iGroupIds);
}
elseif (isset($input->iUrl))
{
  if ($input->iLinkID > 0)
  {
    $query = sprintf("UPDATE HTMLEDITOR_LINKS " .
                    "SET MENU_PATH = '%s', URL = '%s'" .
                    "WHERE LINK_ID = " . $input->iLinkID,
                    \db\mysql_real_escape_string($input->iMenuPath),
                    \db\mysql_real_escape_string($input->iUrl));
    \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
  }
  else
  {
    $query = sprintf("INSERT INTO HTMLEDITOR_LINKS " .
                    "(" .
                    "  MENU_PATH, URL" .
                    ")" .
                    " VALUES " .
                    "(" .
                    "  '%s', '%s'" .
                    ")",
                    \db\mysql_real_escape_string($input->iMenuPath),
                    \db\mysql_real_escape_string($input->iUrl));
  
    \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
  
    $input->iLinkID = \db\mysql_insert_id();
          
    if ($input->iLinkID == 0)
    {
      trigger_error("Can't get the 'link_id' auto_increment value", E_USER_ERROR);
    }
  }

  unset($input->iMenuPath);
  unset($input->iUrl);
}
else
{
  trigger_error('Parameter "iPageID" eller "iUrl" saknas.', E_USER_ERROR);
}

CloseDatabase();

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json");
echo json_encode($input);
exit();
?>