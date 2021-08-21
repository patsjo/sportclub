<?php
//############################################################
//# File:    users.php                                       #
//# Created: 2001-09-09                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2001-09-09  PatSjo  Initial version                      #
//# 2001-09-30  PatSjo  Added function getUserName           #
//# 2001-12-02  Niklas  Added function CheckValidLogin       #
//#                     Added public variable not_valid      #
//# 2002-07-14  PatSjo  Added sub ValidWMLLogin              #
//# 2003-12-19  PatSjo  Added constant cADMIN_GROUP_ID       #
//# 2005-02-11  PatSjo  Adjust printUserGroupDropDown        #
//# 2005-08-26  PatSjo  Changes from Access to MySQL         #
//# 2005-12-31  PatSjo  Changes from ASP to PHP              #
//# 2020-11-04  PatSjo  Adjust for eventor login             #
//# 2021-08-21  PatSjo  Remove HTML functions                #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");

$cADMIN_GROUP_ID = 1;
$user_id = 0;
$not_valid = true;

function cors() {

  if (isset($_SERVER['HTTP_ORIGIN'])) {
      header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
      header('Access-Control-Allow-Credentials: true');
      header('Access-Control-Max-Age: 86400');    // cache for 1 day
  }

  if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {

      if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
          header("Access-Control-Allow-Methods: GET, POST, OPTIONS");         

      if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
          header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");

      exit(0);
  } else {
    header('Access-Control-Allow-Headers: *');
  }
}

function NotAuthorized($UseForbidden = false)
{
    if ($UseForbidden || (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] == "XMLHttpRequest")) {
      header("HTTP/1.0 403 Forbidden");
    } else {
      header("HTTP/1.0 401 Unauthorized");
      header("WWW-Authenticate: Basic realm=\"Värend GN\"");
    }
    die(0);
}

function Authorized()
{
  global $user_id;
  global $userName;
  global $eventorPersonId;

  $userInfo = new stdClass();
  $userInfo->id = $user_id;
  $userInfo->name = $userName;
  $userInfo->isAdmin = ValidGroup(1);
  $userInfo->eventorPersonId = (string)$eventorPersonId;

  $json = json_encode($userInfo);
  header("Content-type: application/json");
  header("Content-length: " . strlen($json));
  
  echo $json;  
  die(0);
}

function get_http_authorization()
{
  ini_set("safe_mode", false);
  if (!isset($auth_user) && isset($_SERVER['HTTP_AUTHORIZATION']))
  {
    // The base64 user_password is send throw <INPUT TYPE="hidden"...>
    $matches = array();
    $base64_client = $_SERVER['HTTP_AUTHORIZATION'];

    if (preg_match('/Basic +(.*)$/i', $base64_client, $matches))
    {
      $auth_info = base64_decode($matches[1]);
      list($name, $password) = explode(':', $auth_info);
      $auth_user = strip_tags($name);
      $auth_password = strip_tags($password);
    }
  }

  if (!isset($auth_user) && isset($_SERVER['REMOTE_USER']))
  {
    $matches = array();
    $user = $_SERVER['REMOTE_USER'];

    if (preg_match('/Basic +(.*)$/i', $user, $matches))
    {
      $auth_info = base64_decode($matches[1]);
      list($name, $password) = explode(':', $auth_info);
      $auth_user = strip_tags($name);
      $auth_password = strip_tags($password);
    }
  }

  if (!isset($auth_user) && isset($_SERVER['REDIRECT_REMOTE_USER']))
  {
    // The base64 user_password is send throw <INPUT TYPE="hidden"...>
    $matches = array();
    $base64_client = $_SERVER["REDIRECT_REMOTE_USER"];

    if (preg_match('/Basic +(.*)$/i', $base64_client, $matches))
    {
      $auth_info = base64_decode($matches[1]);
      list($name, $password) = explode(':', $auth_info);
      $auth_user = strip_tags($name);
      $auth_password = strip_tags($password);
    }
  }

  // Takes raw data from the request
  $json = file_get_contents('php://input');
  // Converts it into a PHP object
  $input = json_decode($json);

  if (!isset($auth_user) && isset($input->username) && isset($input->password))
  {
    $auth_user = $input->username;
    $auth_password  = $input->password;
  }

  if (!isset($auth_user))
  {
    return NULL;
  }

  $_SESSION['PHP_AUTH_USER'] = $auth_user;
  $_SESSION['PHP_AUTH_PW'] = $auth_password;

  return base64_encode($auth_user . ":" . $auth_password);
}

function getAuthenticatePerson()
{
  $auth_user = $_SESSION['PHP_AUTH_USER'];
  $auth_password = $_SESSION['PHP_AUTH_PW'];
  $request_url = 'https://eventor.orientering.se/api/authenticatePerson';
  $request_headers = array();
  
  array_push($request_headers, "Username: $auth_user");
  array_push($request_headers, "Password: $auth_password");

  $ch = curl_init($request_url);

  curl_setopt($ch, CURLOPT_HTTPHEADER, $request_headers);
  curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
  curl_setopt($ch, CURLOPT_UNRESTRICTED_AUTH, true);
  curl_setopt($ch, CURLOPT_AUTOREFERER, true);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_NOBODY, true);
  curl_setopt($ch, CURLOPT_HEADER, true);
  curl_setopt($ch, CURLOPT_HTTPGET, true);
  curl_setopt ( $ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows; U; Windows NT 5.1; pl; rv:1.9) Gecko/2008052906 Firefox/3.0" );
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
  curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);

  // retrieve response (headers and content)
  $response = curl_exec($ch);
  $responseStatusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  if($response == false || curl_errno($ch))
  {
    return null;
  }
  curl_close($ch);

  // split response to header and content
  list($response_headers, $response_content) = preg_split('/(\r\n){2}/', $response, 2);
  if($responseStatusCode != 200)
  {
    return null;
  }

  // convert xml to json
  $response_content = str_replace(array("\n", "\r", "\t"), '', $response_content);
  $response_content = trim(str_replace('"', "'", $response_content));
  $simpleXml = simplexml_load_string($response_content);
  return $simpleXml;
}

function setUserID()
{
  global $user_id;
  global $eventorPersonId;
  global $userName;

  $user_id = 0;
  $eventorPersonId = null;
  $userName = "Okänd";
  $base64_client = get_http_authorization();
  $person = null;

  if (isset($_SESSION['user_id']))
  {
    $user_id = $_SESSION['user_id'];
  }
  if (isset($_SESSION['user_name']))
  {
    $userName = $_SESSION['user_name'];
  }
  if (isset($_SESSION['eventor_person_id']))
  {
    $eventorPersonId = $_SESSION['eventor_person_id'];
  }
  
  if ($user_id > 0 || ((!is_null($base64_client)) && (strlen($base64_client) > 0)))
  {
    OpenDatabase();

    if ($user_id <= 0)
    {
        $base64_hash = hash("sha512", $base64_client);
        $query = sprintf("SELECT eventor_person_id FROM user_login WHERE base64 = '%s'",
                         \db\mysql_real_escape_string($base64_hash));
        $result = \db\mysql_query($query);
        if (!$result)
        {
          trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
        }
    
        while ($row = \db\mysql_fetch_assoc($result))
        {
          $eventorPersonId = intval($row['eventor_person_id']);
          $_SESSION['eventor_person_id'] = $eventorPersonId;
        }
      
        \db\mysql_free_result($result);
    
        if (is_null($eventorPersonId))
        {
          $person = getAuthenticatePerson();
          if (is_null($person) || !isset($person->PersonId))
          {
            return;
          }
          $eventorPersonId = $person->PersonId;
          $_SESSION['eventor_person_id'] = (string)$eventorPersonId;
        }
      
        $query = sprintf("SELECT user_id FROM user_login WHERE eventor_person_id = %s", $eventorPersonId);
        $result = \db\mysql_query($query);
        if (!$result)
        {
          trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
        }
    
        while ($row = \db\mysql_fetch_assoc($result))
        {
          $user_id = intval($row['user_id']);
          $_SESSION['user_id'] = $user_id;
        }
      
        \db\mysql_free_result($result);

        if ($user_id == 0 && !is_null($person) && (string)$person->OrganisationId == "584")
        {
          $sql = "INSERT INTO users (birthday,first_name,last_name) " .
            "VALUES ('" . \db\mysql_real_escape_string($person->BirthDate->Date) . "', " .
            "'" . \db\mysql_real_escape_string($person->PersonName->Given) . "', " .
            "'" . \db\mysql_real_escape_string($person->PersonName->Family) . "')";

          \db\mysql_query($sql);
          $user_id = \db\mysql_insert_id();

          $sql = "INSERT INTO user_login (user_id,eventor_person_id,base64) " .
            "VALUES (" . $user_id . ", " . $eventorPersonId . ", " .
            "'" . \db\mysql_real_escape_string($base64_hash) . "')";

          \db\mysql_query($sql);
        }
        elseif ($user_id > 0 && !is_null($person))
        {
            $sql = "UPDATE user_login " .
                   "SET base64 = '" . \db\mysql_real_escape_string($base64_hash) . "' " .
                   "WHERE user_id = " . $user_id;
        
            \db\mysql_query($sql);
        }
    }

    $query = sprintf("SELECT first_name, last_name FROM users WHERE user_id = %s", $user_id);
    $result = \db\mysql_query($query);
    if (!$result)
    {
      trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
    }

    while ($row = \db\mysql_fetch_assoc($result))
    {
      $userName = $row['first_name'] . " " . $row['last_name'];
      $_SESSION['user_name'] = $userName;
    }

    \db\mysql_free_result($result);
  }
}

function ValidLogin($shouldRedirect = false, $returnJsonUserInfo = false, $UseForbidden = false)
{
  session_start();
  cors();
  global $user_id;
  setUserID();

  if ($user_id <= 0)
  {
    NotAuthorized($UseForbidden);
  }
  if ($returnJsonUserInfo && !$shouldRedirect)
  {
    Authorized();
  }
}

function ValidGroup($iGroupID)
{
  global $user_id;
  $number_of = 0;

  //########################
  //# group_id = 1 = ADMIN #
  //########################

  OpenDatabase();

  $query = sprintf("SELECT COUNT(*) AS number_of FROM user_groups WHERE (group_id = 1 OR group_id = %s) AND user_id = %s",
                   $iGroupID,
                   $user_id);

  $result = \db\mysql_query($query);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  while ($row = \db\mysql_fetch_assoc($result))
  {
    $number_of = intval($row['number_of']);
  }

  \db\mysql_free_result($result);

  if ($number_of > 0)
  {
    return true;
  }

  return false;
}

function getUserName($iUserID)
{
  $first_name = NULL;
  $last_name = NULL;

  OpenDatabase();

  $sql = "SELECT first_name, last_name FROM users WHERE user_id = " . $iUserID;

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  while ($row = \db\mysql_fetch_assoc($result))
  {
    $first_name = $row['first_name'];
    $last_name = $row['last_name'];
  }

  \db\mysql_free_result($result);

  if (is_null($first_name) && is_null($last_name))
  {
    return 'Info&nbsp;saknas';
  }

  return $first_name . '&nbsp;' . $last_name;
}

function getGroupName($iGroupID)
{
  $group_name = NULL;

  OpenDatabase();

  $sql = "SELECT description FROM groups WHERE group_id = " . $iGroupID;

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  while ($row = \db\mysql_fetch_assoc($result))
  {
    $group_name = $row['description'];
  }

  \db\mysql_free_result($result);

  if (is_null($group_name))
  {
    return 'Info&nbsp;saknas';
  }

  return $group_name;
}

function getGroupEmails($iGroupID)
{
  $emails = NULL;

  OpenDatabase();

  $sql = "SELECT u.email, u.first_name, u.last_name " .
         "FROM users AS u " .
         "INNER JOIN user_groups AS ug ON (u.user_id = ug.user_id) " .
         "WHERE ug.group_id = " . $iGroupID;

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  while ($row = \db\mysql_fetch_assoc($result))
  {
    $email = $row['first_name'] . " " . $row['last_name'] . "<" . $row['email'] . ">";
    if (is_null($emails))
    {
    	$emails = $email;
    }
    else
    {
    	$emails = $emails . "," . $email;
    }
  }

  \db\mysql_free_result($result);

  return $emails;
}

function getGroupEmailsHTML($iGroupID)
{
  $emails = NULL;

  OpenDatabase();

  $sql = "SELECT u.email, u.first_name, u.last_name " .
         "FROM users AS u " .
         "INNER JOIN user_groups AS ug ON (u.user_id = ug.user_id) " .
         "WHERE ug.group_id = " . $iGroupID;

  $result = \db\mysql_query($sql);
  if (!$result)
  {
    trigger_error('SQL Error: ' . \db\mysql_error(), E_USER_ERROR);
  }

  while ($row = \db\mysql_fetch_assoc($result))
  {
    $email = $row['first_name'] . " " . $row['last_name'] . "<A href=\"mailto:" . $row['email'] . "?Subject=OK Orion\" target=\"_top\">&lt;" . $row['email'] . "&gt;</A>";

    if (is_null($emails))
    {
    	$emails = $email;
    }
    else
    {
    	$emails = $emails . ", " . $email;
    }
  }

  \db\mysql_free_result($result);

  return $emails;
}

?>