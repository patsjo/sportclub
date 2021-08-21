<?php
//############################################################
//# File:    jsonHtmlEditorQuery.php                         #
//# Created: 2020-10-18                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: iType (MENUS, PAGE)                          #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2020-10-18  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

cors();

session_start();
global $user_id;
setUserID();

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

$rows = array();

if(!isset($input->iType))
{
  $input->iType = "";
}

OpenDatabase();

if ($input->iType == "MENUS")
{
  $sql = "SELECT HTMLEDITOR_PAGES.PAGE_ID, MENU_PATH," .
    "   GROUP_CONCAT(GROUP_ID SEPARATOR ',') AS GROUP_IDS " .
    "FROM HTMLEDITOR_PAGES " .
    "LEFT OUTER JOIN HTMLEDITOR_GROUPS ON (HTMLEDITOR_PAGES.PAGE_ID = HTMLEDITOR_GROUPS.PAGE_ID) ".
    "GROUP BY HTMLEDITOR_PAGES.PAGE_ID, MENU_PATH";

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $groupIds = is_null($row['GROUP_IDS']) ? array() : array_map('intval', explode(",", $row['GROUP_IDS']));
      if (is_null($row['GROUP_IDS']) || ($user_id > 0 && (ValidGroup(1) || array_reduce($groupIds, function ($validGroup, $groupId) { return $validGroup || ValidGroup($groupId); }))))
      {
        $x = new stdClass();
        $x->pageId     = intval($row['PAGE_ID']);
        $x->menuPath   = $row['MENU_PATH'];
        array_push($rows, $x);
      }
    }
  }
  \db\mysql_free_result($result);

  $sql = "SELECT LINK_ID, MENU_PATH, URL " .
    "FROM HTMLEDITOR_LINKS ";

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->linkId     = intval($row['LINK_ID']);
      $x->menuPath   = $row['MENU_PATH'];
      $x->url        = $row['URL'];
      array_push($rows, $x);
    }
  }
  \db\mysql_free_result($result);
}
elseif ($input->iType == "PAGE")
{
  $rows = new stdClass();
  $sql = "SELECT PAGE_ID, MENU_PATH, DATA " .
    "FROM HTMLEDITOR_PAGES " .
    "WHERE PAGE_ID = " . $input->iPageID;

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  $rows->pageId  = -1;
  $rows->groups  = array();
  $selectedGroups = array();

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $rows->pageId    = intval($row['PAGE_ID']);
      $rows->menuPath  = $row['MENU_PATH'];
      $rows->data      = $row['DATA'];
    }
  }
  \db\mysql_free_result($result);
  $sql = "SELECT groups.group_id, groups.description, HTMLEDITOR_GROUPS.GROUP_ID AS selected_group_id " .
    "FROM groups " .
    "LEFT OUTER JOIN HTMLEDITOR_GROUPS ON (groups.group_id = HTMLEDITOR_GROUPS.GROUP_ID AND HTMLEDITOR_GROUPS.PAGE_ID = " . $input->iPageID . ") ";

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  if (\db\mysql_num_rows($result) > 0)
  {
    while($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->groupId     = intval($row['group_id']);
      $x->description = $row['description'];
      $x->selected    = !is_null($row['selected_group_id']);
      array_push($rows->groups, $x);
      if ($x->selected)
      {
        array_push($selectedGroups, $x);
      }
    }
  }

  $rows->isEditable = $user_id > 0 && ValidGroup(1);
  if (count($selectedGroups) > 0 && ($user_id <= 0 || (!ValidGroup(1) && !array_reduce($selectedGroups, function ($validGroup, $group) { return $validGroup || ValidGroup($group->groupId); }))))
  {
    $rows->data = '';
  }
  \db\mysql_free_result($result);
}
else
{
  trigger_error('Wrong iType parameter', E_USER_ERROR);
}

header("Content-Type: application/json");
ini_set( 'precision', 20 );
ini_set( 'serialize_precision', 14 );
echo json_encode($rows);
?>