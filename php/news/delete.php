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
//# 2026-08-30  JohBla  Delete all files of the news         #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/news.php");

cors();
ValidLogin();

header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT"); // Date in the past

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);

if(!isset($input->iNewsID))
{
  trigger_error('Felaktig parameter "iNewsID"', E_USER_ERROR);
}

if (!(ValidGroup($cADMIN_GROUP_ID)))
{
  trigger_error('User needs to be a administrator, to delete a news.');
}

OpenDatabase();

$file_ids = getNewsFileIds($input->iNewsID);

$sql = "DELETE FROM news_files WHERE news_id = " . $input->iNewsID;

if (!\db\mysql_query($sql))
{
  trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
}

$sql = "DELETE FROM news WHERE id = " . $input->iNewsID;

if (!\db\mysql_query($sql))
{
  trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
}

deleteNewsFiles($file_ids);

CloseDatabase();
?>