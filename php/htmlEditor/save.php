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

$title                  = "Spara sida";
$errCode                = 0;
$errText                = Null;
$x = new stdClass();

if (is_numeric($_REQUEST['iPageID']))
{
  $x->pageId = intval($_REQUEST['iPageID']);
}
else
{
  trigger_error('Felaktig parameter "iPageID"', E_USER_ERROR);
}
if ($_REQUEST['iMenuPath'])
{
  $x->menuPath = getIso88591($_REQUEST['iMenuPath']);
}
else
{
  trigger_error('Felaktig parameter "iMenuPath"', E_USER_ERROR);
}
$x->groupIds = json_decode($_REQUEST['iGroupIds']);

if (file_exists($_FILES['iData']['tmp_name']))
{
  $x->data = \db\mysql_real_escape_string(fread(fopen($_FILES['iData']['tmp_name'], "r"),$_FILES['iData']['size']));
  if (!strlen($x->data))
  {
    trigger_error('Kunde ej läsa den uppladdade filen.', E_USER_ERROR);
  }
}
else
{
  trigger_error('Ingen fil skickad.', E_USER_ERROR);
}

OpenDatabase();
$now = date("Y-m-d G:i:s"); // MySQL DATETIME

if ($x->pageId > 0)
{
  $sql = "DELETE FROM HTMLEDITOR_GROUPS WHERE PAGE_ID = " . $x->pageId;

  if (!\db\mysql_query($sql))
  {
    $errCode = 1;
    $errText = "<P>Databasfel: " . \db\mysql_error() . "</P>\n";
  }
  
  $query = sprintf("UPDATE HTMLEDITOR_PAGES " .
                  "SET MENU_PATH = '%s', DATA = '%s'" .
                  "WHERE PAGE_ID = " . $x->pageId,
                  \db\mysql_real_escape_string($x->menuPath),
                  $x->data);
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
                  \db\mysql_real_escape_string($x->menuPath),
                  $x->data);

  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $x->pageId = \db\mysql_insert_id();
        
  if ($x->pageId == 0)
  {
    trigger_error("Can't get the 'file_id' auto_increment value", E_USER_ERROR);
  }
}
unset($x->menuPath);
unset($x->data);

foreach($x->groupIds as $groupId)
{
  $query = sprintf("INSERT INTO HTMLEDITOR_GROUPS " .
                  "(" .
                  "  PAGE_ID, GROUP_ID" .
                  ")" .
                  " VALUES " .
                  "(" .
                  "  %d, %d" .
                  ")",
                  $x->pageId,
                  $groupId);

  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
}
unset($x->groupIds);

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json; charset=ISO-8859-1");
echo utf8_decode(json_encode($x));
CloseDatabase();
exit();
