<?php
//############################################################
//# File:    jsonFilesQuery.php                              #
//# Created: 2024-02-03                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2024-02-03  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

cors();

session_start();
global $user_id;
setUserID();
$isAdmin = $user_id > 0 && ValidGroup($cADMIN_GROUP_ID);

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

function compareByMenuPath($a, $b) {
  return strcmp($a->menuPath, $b->menuPath);
}

function getFolders($isAdmin, $iParentFolderID = 0, $iPath = "/")
{
  $rows = array();
  $query = sprintf("SELECT folder_id, folder_name, pre_story, post_story, need_password, allowed_group_id, cre_by_user_id FROM folders WHERE folder_id != 1 AND parent_folder_id = %d AND (UPPER(need_password) != 'YES' OR ",
                   $iParentFolderID);
  if (!$isAdmin && $user_id > 0)
  {
    $query = $query . sprintf(" (allowed_group_id = 0 OR allowed_group_id IN (SELECT group_id FROM user_groups WHERE user_id = %d)))",
                              $user_id);
  }
  elseif (!$isAdmin)
  {
    $query = $query . " 1 = 0)";
  }
  else
  {
    $query = $query . " 1 = 1)";
  }
  $result = \db\mysql_query($query);
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $data = new stdClass();
    $data->folderId = intval($row['folder_id']);
    $data->folderName = $row['folder_name'];
    $data->parentFolderId = $iParentFolderID;
    $data->preStory = $row['pre_story'];
    $data->postStory = $row['post_story'];
    $data->needPassword = $row['need_password'] == 'YES' ? true : false;
    $data->allowedGroupId = intval($row['allowed_group_id']);
    $data->menuPath = $iPath . $row['folder_name'];
    $data->createdByUserId = intval($row['cre_by_user_id']);
    array_push($rows, $data);
    $rows = array_merge($rows, getFolders($isAdmin, $data->folderId, $data->menuPath . "/"));
  }

  \db\mysql_free_result($result);
  return $rows;
}

function getFiles($isAdmin, $iParentFolderID = 0, $iPath = "/")
{
  $rows = array();
  $query = sprintf("SELECT file_id, file_name, cre_by_user_id FROM files WHERE folder_id = %d AND (UPPER(need_password) != 'YES' OR ",
                   $iParentFolderID);
  if (!$isAdmin && $user_id > 0)
  {
    $query = $query . sprintf(" (allowed_group_id = 0 OR allowed_group_id IN (SELECT group_id FROM user_groups WHERE user_id = %d)))",
                              $user_id);
  }
  elseif (!$isAdmin)
  {
    $query = $query . " 1 = 0)";
  }
  else
  {
    $query = $query . " 1 = 1)";
  }
  $result = \db\mysql_query($query);
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $data = new stdClass();
    $data->fileId = intval($row['file_id']);
    $data->menuPath = $iPath . $row['file_name'];
    $data->createdByUserId = intval($row['cre_by_user_id']);
    array_push($rows, $data);
  }

  \db\mysql_free_result($result);

  $query = sprintf("SELECT folder_id, folder_name FROM folders WHERE folder_id != 1 AND parent_folder_id = %d AND (UPPER(need_password) != 'YES' OR ",
                   $iParentFolderID);
  if (!$isAdmin && $user_id > 0)
  {
    $query = $query . sprintf(" (allowed_group_id = 0 OR allowed_group_id IN (SELECT group_id FROM user_groups WHERE user_id = %d)))",
                              $user_id);
  }
  elseif (!$isAdmin)
  {
    $query = $query . " 1 = 0)";
  }
  else
  {
    $query = $query . " 1 = 1)";
  }
  $result = \db\mysql_query($query);
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $folderId = intval($row['folder_id']);
    $menuPath = $iPath . $row['folder_name'];
    $rows = array_merge($rows, getFiles($isAdmin, $folderId, $menuPath . "/"));
  }

  \db\mysql_free_result($result);
  return $rows;
}

if (!isset($input->iType))
{
  $input->iType = "";
}

OpenDatabase();

if ($input->iType == "FOLDERS")
{
  $rows = getFolders($isAdmin);
  usort($rows, 'compareByMenuPath');
}
elseif ($input->iType == "FILES")
{
  $rows = getFiles($isAdmin);
  usort($rows, 'compareByMenuPath');
}
elseif ($input->iType == "FILE")
{
  $rows = new stdClass();
  $query = sprintf("SELECT file_id, folder_id, file_name, story, need_password, allowed_group_id, order_field FROM files WHERE file_id = %d AND (UPPER(need_password) != 'YES' OR ",
                   $input->fileId);
  if (!$isAdmin && $user_id > 0)
  {
    $query = $query . sprintf(" (allowed_group_id = 0 OR allowed_group_id IN (SELECT group_id FROM user_groups WHERE user_id = %d)))",
                              $user_id);
  }
  elseif (!$isAdmin)
  {
    $query = $query . " 1 = 0)";
  }
  else
  {
    $query = $query . " 1 = 1)";
  }
  $result = \db\mysql_query($query);
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $rows->fileId = intval($row['file_id']);
    $rows->folderId = intval($row['folder_id']);
    $rows->fileName = $row['file_name'];
    $rows->story = $row['story'];
    $rows->needPassword = $row['need_password'] == 'YES' ? true : false;
    $rows->allowedGroupId = intval($row['allowed_group_id']);
    $rows->orderField = intval($row['order_field']);
  }

  \db\mysql_free_result($result);
}
else
{
  trigger_error('Wrong iType parameter', E_USER_ERROR);
}

CloseDatabase();

header("Content-Type: application/json");
ini_set( 'precision', 20 );
ini_set( 'serialize_precision', 14 );
echo json_encode($rows);
?>