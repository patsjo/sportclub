<?php
//############################################################
//# File:    db.php                                          #
//# Created: 2001-09-23                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2001-09-23  PatSjo  Initial version                      #
//# 2005-08-26  PatSjo  Changes from Access to MySQL         #
//# 2005-12-31  PatSjo  Changes from ASP to PHP              #
//# 2015-03-17  PatSjo  Changes from mysql to mysqli         #
//# 2021-08-21  PatSjo  Change to UTF-8                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db_mysql.php");

function OpenDatabase()
{
  global $db_conn;
  $db_conn=mysqli_connect("hostname.com.mysql", "USERNAME", "PASSWORD", "DATABASE");
  if (!$db_conn) {
    trigger_error('Could not connect: ' . mysqli_connect_error(), E_USER_ERROR);
  }
  $db_conn->options(MYSQLI_OPT_CONNECT_TIMEOUT, 300);
  if (!$db_conn->set_charset('utf8')) {
    trigger_error('Could not set character set to utf8', E_USER_ERROR);
  }
}

function CloseDatabase()
{
  global $db_conn;
  mysqli_close($db_conn);
}
?>