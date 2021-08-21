<?php
namespace db;
//############################################################
//# File:    db_mysql.php                                    #
//# Created: 2015-03-17                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2015-03-17  PatSjo  Changes from mysql to mysqli         #
//# 2018-12-17  PatSjo  Added mysql_num_rows                 #
//############################################################

$db_conn;

function mysql_error()
{
  global $db_conn;

  return mysqli_error($db_conn);
}

function mysql_insert_id()
{
  global $db_conn;

  return mysqli_insert_id($db_conn);
}

function mysql_query($sql)
{
  global $db_conn;

  return mysqli_query($db_conn, $sql);
}

function mysql_fetch_array($result)
{
  return mysqli_fetch_array($result);
}

function mysql_fetch_assoc($result)
{
  return mysqli_fetch_assoc($result);
}

function mysql_free_result($result)
{
  mysqli_free_result($result);
}

function mysql_real_escape_string($value)
{
  global $db_conn;

  return mysqli_real_escape_string($db_conn, $value);
}

function mysql_num_rows($result)
{
  return mysqli_num_rows($result);
}

?>