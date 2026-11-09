<?php

//############################################################
//# File:    liveloxProxy.php                                #
//# Created: 2026-11-07                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-07  PatSjo  Initial version                      #
//# 2026-11-07  PatSjo  Search for events in Livelox         #
//############################################################

// Course lengths from Livelox. The pages and answers are read by the browser (liveloxHelper.ts), this only
// fetches them. Only these requests are made, it is not an open proxy.
//
// The page of an event in Livelox, with the course lengths of every class and relay leg, or the page of a race
// in Eventor with its link to Livelox (Eventor has a browser check that a server seldom passes):
//   Input:  { "url": "https://www.livelox.com/Events/Show/199348?culture=en-US" }
//       or  { "url": "https://eventor.orientering.se/Events/Show/54099" }
//   Output: { "url": "<the address after any redirect>", "html": "<the page>" }
//
// A page of results from any public https address (only when logged in), e.g. the total results of an event
// of several days that is not in Eventor:
//   Input:  { "page": "https://host-open.dk/media/v2paaar0/samlet-klasseresultat.html" }
//   Output: { "url": "<the address>", "html": "<the page, as UTF-8>" }
//
// The events in Livelox on some days, by name, the same search as the start page of Livelox:
//   Input:  { "search": { "from": "2026-10-10", "to": "2026-10-11", "text": "25manna" } }
//   Output: { "url": "https://www.livelox.com/Home/SearchEvents", "events": [ { "id": 199348, "name": ..., ... } ] }

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");

cors();

define('PAGE_CONNECT_TIMEOUT', 15);
define('PAGE_TIMEOUT', 60);
define('PAGE_URL_PATTERN',
    '#^https://(eventor\.orientering\.se/Events/Show/\d+|www\.livelox\.com/Events/Show/\d+)(\?culture=[a-z]{2}-[A-Z]{2})?$#');
define('SEARCH_URL', 'https://www.livelox.com/Home/SearchEvents');
define('SEARCH_MAX_RESULTS', 100);
define('SEARCH_MAX_DAYS', 7);

// The same as in eventorProxyWithCache.php: error_handler() in functions.php flushes before it sets the
// status, which would send the error as a 200. The status is set first, and anything written is dropped.
set_error_handler(function ($errno, $errstr, $errfile, $errline) {
    // Silenced with @: PHP 7 reports 0, PHP 8 only the fatal levels among those set
    if ((error_reporting() & ~(E_ERROR | E_CORE_ERROR | E_COMPILE_ERROR | E_USER_ERROR | E_RECOVERABLE_ERROR | E_PARSE)) === 0) {
        return false;
    }
    if (headers_sent()) {
        error_log('liveloxProxy: ' . $errstr . ' in ' . $errfile . ' on line ' . $errline);
        exit(1);
    }
    header_remove('Content-length');
    header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error');
    if (ob_get_level() > 0) {
        ob_clean();
    }
    return error_handler($errno, $errstr, $errfile, $errline);
});

function proxyError($message)
{
    trigger_error($message, E_USER_WARNING);
    exit(1);
}

function notFound()
{
    header($_SERVER['SERVER_PROTOCOL'] . ' 404 Not Found');
    header('Status: 404 Not Found');
    $_SERVER['REDIRECT_STATUS'] = 404;
    exit;
}

// The answer to a GET, or to a POST of the JSON, with the address after any redirect
function fetchUrl($url, $postJson = null, $followRedirects = true, $resolve = null)
{
    $ch = curl_init($url);
    if ($resolve !== null) {
        // The address that was checked, a second lookup could give another one
        curl_setopt($ch, CURLOPT_RESOLVE, array($resolve));
    }
    // A page from any address is not redirected, a redirect could lead into the network of the server
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, $followRedirects);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
    curl_setopt($ch, CURLOPT_MAXFILESIZE, 20 * 1024 * 1024);
    // Livelox redirects to the address with the name of the event, nothing but https is followed
    curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
    curl_setopt($ch, CURLOPT_REDIR_PROTOCOLS, CURLPROTO_HTTPS);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, false);
    curl_setopt($ch, CURLOPT_ENCODING, '');
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, PAGE_CONNECT_TIMEOUT);
    curl_setopt($ch, CURLOPT_TIMEOUT, PAGE_TIMEOUT);
    curl_setopt($ch, CURLOPT_USERAGENT, 'sportclub-liveloxProxy/1.0');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    if ($postJson === null) {
        curl_setopt($ch, CURLOPT_HTTPGET, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Accept: text/html'));
    } else {
        // As the start page of Livelox asks
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postJson);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Accept: application/json',
            'Content-Type: application/json; charset=utf-8',
            'X-Requested-With: XMLHttpRequest'
        ));
    }

    $response = curl_exec($ch);
    $curlError = curl_errno($ch) ? curl_error($ch) : '';
    $responseStatusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $effectiveUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);

    if ($response === false || $curlError !== '') {
        proxyError('Proxy error: ' . $curlError . ', ' . $url);
    }
    if ($responseStatusCode != 200) {
        // Only the start of its text. Eventor answers 403 with a browser check (Cloudflare) that the server
        // cannot pass, the text tells it ("Just a moment...").
        $responseText = (string)preg_replace('#<(style|script)\b[^>]*>.*?</\1>#is', ' ', substr($response, 0, 65536));
        $responseStart = substr(trim((string)preg_replace('/\s+/', ' ', strip_tags($responseText))), 0, 300);
        proxyError('Proxy error: Failed with status code ' . $responseStatusCode . ' for ' . $url . ', ' . $responseStart);
    }
    return array($response, $effectiveUrl ? $effectiveUrl : $url);
}

function answer($values)
{
    $json = json_encode($values, JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        proxyError('Proxy error: Failed to encode the answer as JSON, ' . json_last_error_msg());
    }
    header("Content-type: application/json");
    header("Content-length: " . strlen($json));
    echo $json;
    exit(0);
}

function validDate($value)
{
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        return null;
    }
    $date = DateTime::createFromFormat('!Y-m-d', $value, new DateTimeZone('UTC'));
    return $date !== false && $date->format('Y-m-d') === $value ? $date : null;
}

$input = json_decode(file_get_contents('php://input'));

if (isset($input->search) && is_object($input->search)) {
    $from = validDate(isset($input->search->from) ? $input->search->from : null);
    $to = validDate(isset($input->search->to) ? $input->search->to : null);
    $text = isset($input->search->text) && is_string($input->search->text) ? trim($input->search->text) : '';
    if ($from === null || $to === null || $to <= $from || $from->diff($to)->days > SEARCH_MAX_DAYS
        || $text === '' || mb_strlen($text) > 100) {
        notFound();
    }
    $search = array(
        'organisedByMyOrganisationsOnly' => false,
        'countryId' => null,
        'timePeriod' => 'customTimePeriod',
        'from' => $from->format('Y-m-d\TH:i:s'),
        'to' => $to->format('Y-m-d\TH:i:s'),
        'text' => $text,
        'competitionsOnly' => false,
        'geoRectangle' => null,
        'geoCircle' => null,
        'orderBy' => 'relevance',
        'userLocation' => null,
        'properties' => null,
        'maxNumberOfResults' => SEARCH_MAX_RESULTS,
        'hash' => ''
    );
    list($response) = fetchUrl(SEARCH_URL, json_encode($search));
    $events = json_decode($response, true);
    if (!is_array($events)) {
        proxyError('Proxy error: The search in Livelox did not answer with a list of events, ' . substr($response, 0, 300));
    }
    // Only what is needed to choose the event, the boundaries and icons are of no use here
    $found = array();
    foreach ($events as $event) {
        if (is_array($event) && isset($event['id'], $event['name'])) {
            $found[] = array(
                'id' => $event['id'],
                'name' => $event['name'],
                'timeInterval' => isset($event['timeInterval']) ? $event['timeInterval'] : null,
                'countryName' => isset($event['countryName']) ? $event['countryName'] : null,
                'isRelay' => isset($event['isRelay']) ? $event['isRelay'] : null
            );
        }
    }
    answer(array('url' => SEARCH_URL, 'events' => $found));
}

// A page of results that is not in Eventor, e.g. the total results of an event of several days exported by
// OE/MeOS ("samlet-klasseresultat.html"). Any public https address, so only for those who are logged in.
if (isset($input->page) && is_string($input->page)) {
    ValidLogin();
    $page_url = trim($input->page);
    $parts = parse_url($page_url);
    $host = isset($parts['host']) ? strtolower($parts['host']) : '';
    if (!isset($parts['scheme']) || strtolower($parts['scheme']) !== 'https' || $host === '' || strlen($page_url) > 2000) {
        notFound();
    }
    // Not the server itself or the network it is in
    $addresses = filter_var($host, FILTER_VALIDATE_IP) ? array($host) : gethostbynamel($host);
    if (!$addresses) {
        proxyError('Proxy error: The address could not be found, ' . $page_url);
    }
    foreach ($addresses as $address) {
        if (!filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            notFound();
        }
    }
    $port = isset($parts['port']) ? (int)$parts['port'] : 443;
    $pinned = filter_var($host, FILTER_VALIDATE_IP) ? null : $host . ':' . $port . ':' . $addresses[0];
    list($response, $effectiveUrl) = fetchUrl($page_url, null, false, $pinned);
    // OE and MeOS may write the page in Latin-1
    if (!mb_check_encoding($response, 'UTF-8')) {
        $response = mb_convert_encoding($response, 'UTF-8', 'ISO-8859-1');
    }
    answer(array('url' => $effectiveUrl, 'html' => $response));
}

$request_url = isset($input->url) && is_string($input->url) ? $input->url : '';
if (!preg_match(PAGE_URL_PATTERN, $request_url)) {
    notFound();
}
list($response, $effectiveUrl) = fetchUrl($request_url);
answer(array('url' => $effectiveUrl, 'html' => $response));

// No closing tag on purpose: anything after it is sent after the answer
