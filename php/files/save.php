<?php

//############################################################
//# File:    save_file.php                                   #
//# Created: 2005-02-11                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: fileId (Values: -1 = New, > 0 Update         #
//#             fileName, folderId, story                    #
//#             needPassword, allowedGroupId, fileData       #
//#             orderField                                   #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2005-02-11  PatSjo  Initial version                      #
//# 2005-08-31  PatSjo  Changes from Access to MySQL         #
//# 2005-09-05  PatSjo  Changes from AppendChunk to streaming#
//# 2005-12-31  PatSjo  Changes from ASP to PHP              #
//# 2008-01-02  PatSjo  Max file size changed from 256K to 8M#
//# 2024-02-03  PatSjo  Change to JSON in and out            #
//# 2008-01-02  PatSjo  Max file size changed from 8M to 32M #
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
$image_width = 0;
$image_height = 0;
$cre_by_user_id = 0;

if (!isset($input->iType))
{
  $input->iType = "";
}

OpenDatabase();
$now = date("Y-m-d G:i:s"); // MySQL DATETIME

if ($input->iType == "FILE")
{
  $input->fileName = stripslashes($input->fileName);
  if (!isset($input->folderId))
  {
    trigger_error('Missing parameter "folderId"', E_USER_ERROR);
  }
  $input->story = stripslashes($input->story);
  if (!isset($input->allowedGroupId))
  {
    trigger_error('Missing parameter "allowedGroupId"', E_USER_ERROR);
  }
  if (!isset($input->orderField))
  {
    trigger_error('Missing parameter "orderField"', E_USER_ERROR);
  }
  if (!isset($input->fileId))
  {
    trigger_error('Missing parameter "fileId"', E_USER_ERROR);
  }

  if ($input->fileId == -1) // New File to upload
  {
    if (!isset($input->fileData) || !isset($input->mimeType) || !isset($input->fileSize) || !isset($input->fileName))
    {
      trigger_error('Wrong/missing parameter "fileName", file missing.', E_USER_ERROR);
    }
    if (strlen($input->fileName) > 255)
    {
      trigger_error('Wrong parameter "fileName", more than 255 characters.', E_USER_ERROR);
    }

    if ($input->fileSize <= 0)
    {
      trigger_error('New file, but missing the actual file data.', E_USER_ERROR);
    }
    if ($input->fileSize > 32000000) // Don't allow bigger than 32MB
    {
      trigger_error('Maximum size of 32 MB reached.', E_USER_ERROR);
    }

    $decoded_filedata = base64_decode($input->fileData);
    $input->fileData = \db\mysql_real_escape_string($decoded_filedata);
    if (!strlen($input->fileData))
    {
      trigger_error('Not able to read the uploaded file.', E_USER_ERROR);
    }
    
    $cache_file = $_SERVER["DOCUMENT_ROOT"] . '/cache/' . $input->fileName;
    file_put_contents($cache_file, $decoded_filedata, LOCK_EX);
    list($image_width, $image_height, $image_type, $image_attr) = @getimagesize('file://' . $cache_file);
    unlink($cache_file);

    $query = sprintf("INSERT INTO files " .
                    "(" .
                    "  file_name, folder_id, file_size, file_blob, mime_type, image_width, image_height, " .
                    "  story, need_password, allowed_group_id, cre_by_user_id, cre_date, order_field" .
                    ")" .
                    " VALUES " .
                    "(" .
                    "  '%s', %d, %d, '%s', '%s', %d, %d, " .
                    "  '%s', '%s', %d, %d, '%s', %d" .
                    ")",
                    \db\mysql_real_escape_string($input->fileName),
                    $input->folderId,
                    $input->fileSize,
                    $input->fileData,
                    \db\mysql_real_escape_string($input->mimeType),
                    $image_width,
                    $image_height,
                    \db\mysql_real_escape_string($input->story),
                    isset($input->needPassword) && $input->needPassword ? "YES" : "NO",
                    $input->allowedGroupId,
                    $user_id,
                    $now,
                    $input->orderField);

    if (!\db\mysql_query($query))
    {
      trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
    }

    $input->fileId = \db\mysql_insert_id();
          
    if ($input->fileId == 0)
    {
      trigger_error("Can't get the 'file_id' auto_increment value", E_USER_ERROR);
    }
  }
  else
  {
    $query = sprintf("SELECT cre_by_user_id FROM files WHERE file_id = %d",
                    $input->fileId);
    $result = \db\mysql_query($query);
    while ($row = \db\mysql_fetch_assoc($result))
    {
      $cre_by_user_id = $row['cre_by_user_id'];
    }
    \db\mysql_free_result($result);

    if (!((ValidGroup($cADMIN_GROUP_ID)) || ($cre_by_user_id == $user_id)))
    {
      NotAuthorized();
    }

    $query = sprintf("UPDATE files " .
                    "SET " .
                    "  file_name = '%s'," .
                    "  folder_id = %d," .
                    "  story = '%s'," .
                    "  need_password = '%s'," .
                    "  allowed_group_id = %d," .
                    "  cre_by_user_id = %d," .
                    "  cre_date = '%s'," .
                    "  order_field = %d " .
                    "WHERE file_id = %d",
                    \db\mysql_real_escape_string($input->fileName),
                    $input->folderId,
                    \db\mysql_real_escape_string($input->story),
                    isset($input->needPassword) && $input->needPassword ? "YES" : "NO",
                    $input->allowedGroupId,
                    $user_id,
                    $now,
                    $input->orderField,
                    $input->fileId);

    if (!\db\mysql_query($query))
    {
      trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
    }
  }
}
elseif ($input->iType == "FOLDER")
{
  if (!isset($input->folderId))
  {
    trigger_error('Missing parameter "folderId"', E_USER_ERROR);
  }
  $input->folderName = stripslashes($input->folderName);
  if (strlen($input->folderName) > 255)
  {
    trigger_error('Wrong parameter "folderName", more than 255 characters.', E_USER_ERROR);
  }
  if (!isset($input->parentFolderId))
  {
    trigger_error('Missing parameter "parentFolderId"', E_USER_ERROR);
  }
  $input->preStory = stripslashes($input->preStory);
  $input->postStory = stripslashes($input->postStory);
  if (!isset($input->allowedGroupId))
  {
    trigger_error('Missing parameter "allowedGroupId"', E_USER_ERROR);
  }
  
  if ($input->folderId == -1) // New Folder
  {
    $query = sprintf("INSERT INTO folders " .
                     "(" .
                     "  folder_name, parent_folder_id, pre_story, post_story, need_password, " .
                     "  allowed_group_id, cre_by_user_id, cre_date" .
                     ")" .
                     " VALUES " .
                     "(" .
                     "  '%s', %d, '%s', '%s', '%s'," .
                     "  %d, %d, '%s'" .
                     ")",
                     \db\mysql_real_escape_string($input->folderName),
                     $input->parentFolderId,
                     \db\mysql_real_escape_string($input->preStory),
                     \db\mysql_real_escape_string($input->postStory),
                     isset($input->needPassword) && $input->needPassword ? "YES" : "NO",
                     $input->allowedGroupId,
                     $user_id,
                     $now);
  
    if (!\db\mysql_query($query))
    {
      trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
    }
  
    $input->folderId = \db\mysql_insert_id();
  
    if ($input->folderId == 0)
    {
      trigger_error("Can't get the 'folder_id' auto_increment value", E_USER_ERROR);
    }
  }
  else
  {
    $query = "UPDATE folders " .
           "SET folder_name = '" . str_replace("'", "", $input->folderName) . "', parent_folder_id = " . $input->parentFolderId . ", " .
           "    pre_story = '" . str_replace("'", "", $input->preStory) . "', post_story = '" . str_replace("''", "", $input->postStory) . "', " .
           "    need_password = '" . str_replace("'", "", $input->needPassword) . "', allowed_group_id = " . $input->allowedGroupId . ", " .
           "    cre_by_user_id = " . $user_id . ", cre_date = '" . datetime2String(time()) . "'" .
           "WHERE folder_id = " . $input->folderId;
    $query = sprintf("UPDATE folders " .
                     "SET " .
                     "  folder_name = '%s'," .
                     "  parent_folder_id = %d," .
                     "  pre_story = '%s'," .
                     "  post_story = '%s'," .
                     "  need_password = '%s'," .
                     "  allowed_group_id = %d," .
                     "  cre_by_user_id = %d," .
                     "  cre_date = '%s' " .
                     "WHERE folder_id = %d",
                     \db\mysql_real_escape_string($input->folderName),
                     $input->parentFolderId,
                     \db\mysql_real_escape_string($input->preStory),
                     \db\mysql_real_escape_string($input->postStory),
                     isset($input->needPassword) && $input->needPassword ? "YES" : "NO",
                     $input->allowedGroupId,
                     $user_id,
                     $now,
                     $input->folderId);
  
    if (!\db\mysql_query($query))
    {
      trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
    }
  }
}

CloseDatabase();

unset($input->fileData);

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json");
echo json_encode($input);
?>