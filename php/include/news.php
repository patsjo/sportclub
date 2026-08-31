<?php

//############################################################
//# File:    news.php                                        #
//# Created: 2026-08-30                                      #
//# Author:  Johnny Blästa                                   #
//# -------------------------------------------------------- #
//# Shared helpers for the files (images/attachments) that   #
//# belong to a news. A news can have many files, stored in  #
//# the table news_files. The first file is also kept in     #
//# news.file_id to stay backward compatible.                #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-08-30  JohBla  Initial version                      #
//############################################################

//########################
//# folder_id = 1 = NEWS #
//########################
define('cNEWS_FOLDER_ID', 1);

//# Attach a "files" array to every news object in $newsById, #
//# which is a map of news id => news object.                 #
function addNewsFiles($newsById)
{
  if (count($newsById) == 0)
  {
    return;
  }

  $sql = "SELECT news_files.news_id, files.file_id, files.file_name, files.mime_type, files.file_size, " .
         "  files.image_width, files.image_height " .
         "FROM news_files INNER JOIN files ON (news_files.file_id = files.file_id) " .
         "WHERE news_files.news_id IN (" . implode(", ", array_keys($newsById)) . ") " .
         "ORDER BY news_files.news_id, news_files.order_field, files.file_id";

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error() . ' SQL: ' . $sql, E_USER_ERROR);
  }

  while ($row = \db\mysql_fetch_assoc($result))
  {
    $news_id = intval($row['news_id']);
    if (!isset($newsById[$news_id]))
    {
      continue;
    }
    $file = new stdClass();
    $file->fileId      = intval($row['file_id']);
    $file->fileName    = $row['file_name'];
    $file->fileType    = $row['mime_type'];
    $file->fileSize    = is_null($row['file_size']) ? 0 : intval($row['file_size']);
    $file->imageWidth  = is_null($row['image_width']) ? 0 : intval($row['image_width']);
    $file->imageHeight = is_null($row['image_height']) ? 0 : intval($row['image_height']);
    array_push($newsById[$news_id]->files, $file);
  }
  \db\mysql_free_result($result);

  //# A news saved before news_files existed only has news.file_id #
  foreach ($newsById as $news)
  {
    if (count($news->files) == 0 && $news->fileId > 0)
    {
      $file = new stdClass();
      $file->fileId      = $news->fileId;
      $file->fileName    = $news->fileName;
      $file->fileType    = $news->fileType;
      $file->fileSize    = $news->fileSize;
      $file->imageWidth  = $news->imageWidth;
      $file->imageHeight = $news->imageHeight;
      array_push($news->files, $file);
    }
  }
}

//# All file ids currently connected to a news, both the ones #
//# in news_files and the legacy one in news.file_id.         #
function getNewsFileIds($iNewsID)
{
  $file_ids = array();

  $query = sprintf("SELECT file_id FROM news WHERE id = %d AND file_id > 0", $iNewsID);
  ($result = \db\mysql_query($query)) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
  while ($row = \db\mysql_fetch_assoc($result))
  {
    array_push($file_ids, intval($row['file_id']));
  }
  \db\mysql_free_result($result);

  $query = sprintf("SELECT file_id FROM news_files WHERE news_id = %d", $iNewsID);
  ($result = \db\mysql_query($query)) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
  while ($row = \db\mysql_fetch_assoc($result))
  {
    array_push($file_ids, intval($row['file_id']));
  }
  \db\mysql_free_result($result);

  return array_values(array_unique($file_ids));
}

//# Store an uploaded file in the news folder and return      #
//# array(file_id, image_width, image_height).                #
function insertNewsFile($file, $user_id, $now)
{
  $decoded_filedata = base64_decode($file->iFileData);
  $escaped_filedata = \db\mysql_real_escape_string($decoded_filedata);
  if (!strlen($escaped_filedata))
  {
    trigger_error('Kunde ej l�sa den uppladdade bilden/filen.', E_USER_ERROR);
  }

  $cache_file = $_SERVER["DOCUMENT_ROOT"] . '/cache/' . $file->iFileName;
  file_put_contents($cache_file, $decoded_filedata, LOCK_EX);
  list($image_width, $image_height, $image_type, $image_attr) = @getimagesize('file://' . $cache_file);
  unlink($cache_file);

  $query = sprintf("INSERT INTO files " .
                   "(" .
                   "  file_name, folder_id, file_size, file_blob, mime_type, image_width, image_height, " .
                   "  allowed_group_id, cre_by_user_id, cre_date" .
                   ")" .
                   " VALUES " .
                   "(" .
                   "  '%s', %d, %d, '%s', '%s', %d, %d, " .
                   "  %d, %d, '%s'" .
                   ")",
                   \db\mysql_real_escape_string($file->iFileName),
                   cNEWS_FOLDER_ID,
                   $file->iFileSize,
                   $escaped_filedata,
                   \db\mysql_real_escape_string($file->iMimeType),
                   intval($image_width),
                   intval($image_height),
                   0,
                   $user_id,
                   $now);

  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $file_id = \db\mysql_insert_id();
  if ($file_id == 0)
  {
    trigger_error("Can't get the 'file_id' auto_increment value", E_USER_ERROR);
  }

  return array($file_id, intval($image_width), intval($image_height));
}

//# The image size of an already stored file.                 #
function getNewsFileImageSize($iFileID)
{
  $image_width = 0;
  $image_height = 0;

  $query = sprintf("SELECT image_width, image_height FROM files WHERE file_id = %d", $iFileID);
  ($result = \db\mysql_query($query)) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $image_width = is_null($row['image_width']) ? 0 : intval($row['image_width']);
    $image_height = is_null($row['image_height']) ? 0 : intval($row['image_height']);
  }
  \db\mysql_free_result($result);

  return array($image_width, $image_height);
}

//# Replace the news_files rows of a news, keeping the order  #
//# the files were sent in.                                   #
function saveNewsFiles($iNewsID, $file_ids)
{
  $query = sprintf("DELETE FROM news_files WHERE news_id = %d", $iNewsID);
  \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

  $order_field = 0;
  foreach (array_unique($file_ids) as $file_id)
  {
    $query = sprintf("INSERT INTO news_files (news_id, file_id, order_field) VALUES (%d, %d, %d)",
                     $iNewsID,
                     $file_id,
                     $order_field);
    \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
    $order_field++;
  }
}

//# Delete the files that no longer belong to the news, but   #
//# only if they are stored in the news folder.               #
function deleteNewsFiles($file_ids, $keep_file_ids = array())
{
  foreach ($file_ids as $file_id)
  {
    if ($file_id > 0 && !in_array($file_id, $keep_file_ids))
    {
      $query = sprintf("DELETE FROM news_files WHERE file_id = %d", $file_id);
      \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

      $query = sprintf("DELETE FROM files WHERE folder_id = %d AND file_id = %d", cNEWS_FOLDER_ID, $file_id);
      \db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);
    }
  }
}

?>
