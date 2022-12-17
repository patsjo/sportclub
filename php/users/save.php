<?php

//############################################################
//# File:    save.php                                        #
//# Created: 2022-06-08                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Parameters: user object                                  #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2022-06-08  PatSjo  Initial version                      #
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
$input->birthDay = string2Date($input->birthDay);

if ($user_id != $input->userId && !(ValidGroup($cADMIN_GROUP_ID)))
{
  trigger_error('User needs to be a administrator or the same user, to update a user.');
}

OpenDatabase();

$sql = "DELETE FROM user_groups WHERE user_id = " . $input->userId;

if (!\db\mysql_query($sql))
{
  trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
}

foreach ($input->groupIds as $groupId)
{
    $sql = "INSERT INTO user_groups (user_id, group_id) VALUES (" . $input->userId . ", " . $groupId . ")";

    if (!\db\mysql_query($sql))
    {
      trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
    }
}

$query = sprintf("UPDATE users " .
                 "SET " .
                 "  birthday = '%s'," .
                 "  first_name = '%s'," .
                 "  last_name = '%s'," .
                 "  address = '%s'," .
                 "  zip = %s," .
                 "  city = '%s'," .
                 "  email = '%s'," .
                 "  phone_no = '%s'," .
                 "  mobile_phone_no = '%s'," .
                 "  work_phone_no = '%s'," .
                 "  council_id = %d," .
                 "  responsibility = '%s' " .
                 "WHERE user_id = %d",
                 Date("Y-m-d G:i:s", $input->birthDay),
                 \db\mysql_real_escape_string($input->firstName),
                 \db\mysql_real_escape_string($input->lastName),
                 \db\mysql_real_escape_string($input->address),
                 \db\mysql_real_escape_string($input->zip),
                 \db\mysql_real_escape_string($input->city),
                 \db\mysql_real_escape_string($input->email),
                 \db\mysql_real_escape_string($input->phoneNo),
                 \db\mysql_real_escape_string($input->mobilePhoneNo),
                 \db\mysql_real_escape_string($input->workPhoneNo),
                 $input->councilId,
                 \db\mysql_real_escape_string($input->responsibility),
                 $input->userId);

\db\mysql_query($query) || trigger_error(sprintf('SQL-Error (%s)', substr($query, 0, 1024)), E_USER_ERROR);

$sql = "SELECT users.USER_ID, BIRTHDAY, FIRST_NAME, LAST_NAME, ADDRESS, ZIP, CITY, " .
"   EMAIL, PHONE_NO, MOBILE_PHONE_NO, WORK_PHONE_NO, COUNCIL_ID, RESPONSIBILITY, " .
"   GROUP_CONCAT(GROUP_ID SEPARATOR ',') AS GROUP_IDS " .
"FROM users " .
"LEFT OUTER JOIN user_groups ON (users.user_id = user_groups.user_id) ".
"WHERE users.USER_ID = " . $input->userId . " ".
"GROUP BY users.USER_ID, BIRTHDAY, FIRST_NAME, LAST_NAME, ADDRESS, ZIP, CITY, " .
"   EMAIL, PHONE_NO, MOBILE_PHONE_NO, WORK_PHONE_NO, COUNCIL_ID, RESPONSIBILITY";

$result = \db\mysql_query($sql);
if (!$result)
{
  trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
}
  
if (\db\mysql_num_rows($result) > 0) {
    while($row = \db\mysql_fetch_assoc($result)) {
      $x = new stdClass();
      $x->userId                = intval($row['USER_ID']);
      $x->birthDay              = $row['BIRTHDAY'];
      $x->firstName             = $row['FIRST_NAME'];
      $x->lastName              = $row['LAST_NAME'];
      $x->address               = $row['ADDRESS'];
      $x->zip                   = $row['ZIP'];
      $x->city                  = $row['CITY'];
      $x->email                 = $row['EMAIL'];
      $x->phoneNo               = $row['PHONE_NO'];
      $x->mobilePhoneNo         = $row['MOBILE_PHONE_NO'];
      $x->workPhoneNo           = $row['WORK_PHONE_NO'];
      $x->councilId             = intval($row['COUNCIL_ID']);
      $x->responsibility        = $row['RESPONSIBILITY'];
      $x->groupIds              = is_null($row['GROUP_IDS']) ? array() : array_map('intval', explode(",", $row['GROUP_IDS']));
      sort($x->groupIds);
  }
}
  
CloseDatabase();

header("Content-Type: application/json");
echo json_encode($x);
?>