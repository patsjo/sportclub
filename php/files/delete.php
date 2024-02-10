<?php
//############################################################
//# File:    delete_file.php                                 #
//# Created: 2005-02-11                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: fileId                                       #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2005-02-11  PatSjo  Initial version                      #
//# 2005-09-04  PatSjo  Changes from Access to MySQL         #
//# 2014-10-17  PatSjo  Changes from ASP to PHP              #
//# 2024-02-03  PatSjo  Change to JSON in and out            #
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
$parent_folder_id = 0;
$folder_id = 0;
$cre_by_user_id = 0;
$number_of = 0;

if (!isset($input->iType))
{
  $input->iType = "";
}

OpenDatabase();

if ($input->iType == "FILE")
{
  if (!isset($input->fileId))
  {
    trigger_error('Missing parameter "fileId"', E_USER_ERROR);
  }

  $query = "SELECT folder_id, cre_by_user_id " .
           "FROM files " .
           "WHERE file_id = " . $input->fileId;

  $result = \db\mysql_query($query);
  if (!$result)
  {
    die('SQL Error: ' . \db\mysql_error());
  }

  while ($row = \db\mysql_fetch_assoc($result))
  {
    $folder_id = intval($row['folder_id']);
    $cre_by_user_id = intval($row['cre_by_user_id']);
  }

  \db\mysql_free_result($result);

  if (!((ValidGroup($cADMIN_GROUP_ID)) || ($cre_by_user_id == $user_id)))
  {
    NotAuthorized();
  }

  $query = "SELECT COUNT(*) AS number_of FROM news WHERE file_id = " . $input->fileId;

  $result = \db\mysql_query($query);
  if (!$result)
  {
    die('SQL Error: ' . \db\mysql_error());
  }

  while ($row = \db\mysql_fetch_assoc($result))
  {
    $number_of = intval($row['number_of']);
  }

  \db\mysql_free_result($result);

  if ($number_of > 0)
  {
    die('SQL Error: File is connected to a news');
  }

  $query = "DELETE FROM files " .
          "WHERE file_id = " . $input->fileId;

  if (!\db\mysql_query($query))
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }
}
elseif ($input->iType == "FOLDER")
{
  if (!isset($input->folderId))
  {
    trigger_error('Missing parameter "folderId"', E_USER_ERROR);
  }

  $query = "SELECT parent_folder_id, cre_by_user_id " .
           "FROM folders " .
           "WHERE folder_id = " . $input->folderId;

  $result = \db\mysql_query($query);
  if (!$result)
  {
    die('SQL Error: ' . \db\mysql_error());
  }

  while ($row = \db\mysql_fetch_assoc($result))
  {
    $parent_folder_id = intval($row['parent_folder_id']);
    $cre_by_user_id = intval($row['cre_by_user_id']);
  }

  \db\mysql_free_result($result);

  if (!((ValidGroup($cADMIN_GROUP_ID)) || ($cre_by_user_id == $user_id)))
  {
    NotAuthorized();
  }

  $query = "SELECT COUNT(*) AS number_of FROM files WHERE folder_id = " . $input->folderId;

  $result = \db\mysql_query($query);
  if (!$result)
  {
    die('SQL Error: ' . \db\mysql_error());
  }

  while ($row = \db\mysql_fetch_assoc($result))
  {
    $number_of = intval($row['number_of']);
  }

  \db\mysql_free_result($result);

  if ($number_of > 0)
  {
    die('SQL Error: Files exists in folder');
  }

  $query = "SELECT COUNT(*) AS number_of FROM folders WHERE parent_folder_id = " . $input->folderId;

  $result = \db\mysql_query($query);
  if (!$result)
  {
    die('SQL Error: ' . \db\mysql_error());
  }

  while ($row = \db\mysql_fetch_assoc($result))
  {
    $number_of = intval($row['number_of']);
  }

  \db\mysql_free_result($result);

  if ($number_of > 0)
  {
    die('SQL Error: Subfolders exists in folder');
  }

  $query = "DELETE FROM folders " .
           "WHERE folder_id = " . $input->folderId;

  if (!\db\mysql_query($query))
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }
}

CloseDatabase();
?>