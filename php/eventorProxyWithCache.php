<?php

//############################################################
//# File:    db.php                                          #
//# Created: 2021-08-24                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2021-08-24  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/eventorApiKey.php");

cors();

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);
$use_cache = false;
$request_url = "";
$request_headers = array();

if (isset($input->csurl)) {
    $request_url = urldecode($input->csurl);
}
if (!isset($input->csurl) || strpos($request_url, "https://eventor.orientering.se/") !== 0) {
    header($_SERVER['SERVER_PROTOCOL'] . ' 404 Not Found');
    header('Status: 404 Not Found');
    $_SERVER['REDIRECT_STATUS'] = 404;
    exit;
}
if (isset($input->cache) && $input->cache == true) {
    $use_cache = true;
}

if ($use_cache) {
    $cache_file = $_SERVER["DOCUMENT_ROOT"] . '/cache/cached-' . sha1($request_url) . '.html';
    if (file_exists($cache_file) && (filemtime($cache_file) > (time() - 3600 ))) {
       // Cache file is less than 60 minutes old. 
       // Don't bother refreshing, just use the file as-is.
       $json = file_get_contents($cache_file);
       header("Content-type: application/json");
       // header('Content-Transfer-Encoding: binary');
       // header('Accept-Ranges: bytes');
       header("Content-length: " . strlen($json));
    
       echo $json;
       exit(0);
    }
}

array_push($request_headers, "ApiKey: " . GetApiKey());

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
    trigger_error('Proxy error: ' . curl_error($ch), E_USER_ERROR);
}
curl_close($ch);

// split response to header and content
list($response_headers, $response_content) = preg_split('/(\r\n){2}/', $response, 2);
if($responseStatusCode != 200)
{
    trigger_error('Proxy error: Failed with status code ' . $responseStatusCode . ', ' . strip_tags($response_content), E_USER_ERROR);
}

if (isset($input->noJsonConvert) && $input->noJsonConvert == true) {
    echo $response_content;
    die(0);
}

// convert xml to json
$response_content = str_replace(array("\n", "\r", "\t"), '', $response_content);
$response_content = trim(str_replace('"', "'", $response_content));
$simpleXml = simplexml_load_string($response_content);
$json = json_encode($simpleXml);

header("Content-type: application/json");
header("Content-length: " . strlen($json));
header("Cache-Control: max-age=1800");

echo $json;

if ($use_cache) {
    $files = glob($_SERVER["DOCUMENT_ROOT"] . '/cache/*');
    $now   = time();

    foreach ($files as $file) {
    if (is_file($file)) {
        if ($now - filemtime($file) >= 3600) { // 30 minutes
        unlink($file);
        }
    }
    }

    file_put_contents($cache_file, $json, LOCK_EX);
}
?>