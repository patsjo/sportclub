<?php
//############################################################
//# File:    settings.php                                    #
//# Created: 2026-11-21                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Settings for the whole club (table CLUB_SETTINGS), the   #
//# value is saved as JSON.                                  #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-21  PatSjo  Initial version                      #
//############################################################

// The order of the top level in the menu, the keys of the menu items and dividers
$cSETTING_MENU_ORDER = 'MENU_ORDER';
$cSETTINGS = array($cSETTING_MENU_ORDER);

function settingsError($message)
{
  trigger_error($message, E_USER_WARNING);
  exit(1);
}

function settingsQuery($sql)
{
  $result = \db\mysql_query($sql);
  if (!$result)
  {
    settingsError('SQL Error: ' . \db\mysql_error());
  }
  return $result;
}

function settingsSqlString($value)
{
  return "'" . \db\mysql_real_escape_string(strval($value)) . "'";
}

// The value of the setting, or null when it isn't saved
function getSetting($key)
{
  $result = settingsQuery("SELECT SETTING_VALUE FROM CLUB_SETTINGS WHERE SETTING_KEY = " . settingsSqlString($key));
  $row = \db\mysql_fetch_assoc($result);
  \db\mysql_free_result($result);
  return $row ? json_decode($row['SETTING_VALUE']) : null;
}

// A null value deletes the setting (back to the default)
function saveSetting($key, $value, $userId)
{
  if (is_null($value))
  {
    settingsQuery("DELETE FROM CLUB_SETTINGS WHERE SETTING_KEY = " . settingsSqlString($key));
    return;
  }
  settingsQuery(sprintf("INSERT INTO CLUB_SETTINGS (SETTING_KEY, SETTING_VALUE, MOD_BY_USER_ID, MOD_DATE) VALUES (%s, %s, %d, '%s') " .
                        "ON DUPLICATE KEY UPDATE SETTING_VALUE = VALUES(SETTING_VALUE), MOD_BY_USER_ID = VALUES(MOD_BY_USER_ID), MOD_DATE = VALUES(MOD_DATE)",
                        settingsSqlString($key), settingsSqlString(json_encode($value)), $userId, date("Y-m-d G:i:s")));
}

// The keys of the menu items, at most 500 keys and 128 characters each, no duplicates
function validMenuOrder($value)
{
  if (!is_array($value) || count($value) > 500)
  {
    settingsError('Felaktig parameter "iValue", måste vara en lista med högst 500 menypunkter.');
  }
  $keys = array();
  foreach ($value as $key)
  {
    if (!is_string($key) || $key == '' || strlen($key) > 128)
    {
      settingsError('Felaktig parameter "iValue", en menypunkt måste vara en text med högst 128 tecken.');
    }
    $keys[] = $key;
  }
  return array_values(array_unique($keys));
}

function settingsOutputJson($value)
{
  header("Access-Control-Allow-Credentials: true");
  if (isset($_SERVER['HTTP_ORIGIN']))
  {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
  }
  header("Access-Control-Allow-Headers: *");
  header("Content-Type: application/json");
  echo json_encode($value);
}

?>
