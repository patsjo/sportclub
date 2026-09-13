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
//# 2026-03-08  PatSjo  PHP 8.5 fixes                        #
//# 2026-09-13  PatSjo  Convert without SimpleXML, retry      #
//#                     transient errors from Eventor         #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/eventorApiKey.php");

cors();

// Eventor answers with 500 now and then, and it is usually gone on the next try.
// Retrying here rather than leaving it to the browser keeps one bad moment at
// Eventor from surfacing as a failed page.
define('EVENTOR_ATTEMPTS', 3);
define('EVENTOR_RETRY_DELAY', 300000); // microseconds, doubled for every attempt
define('EVENTOR_CONNECT_TIMEOUT', 15);
define('EVENTOR_TIMEOUT', 180);

// Passing E_USER_ERROR to trigger_error() is deprecated since PHP 8.4.
// error_handler() in functions.php answers with a JSON 500 for any reported
// error level, the exit() below makes the termination explicit.
function proxyError($message)
{
    trigger_error($message, E_USER_WARNING);
    exit(1);
}

// error_handler() in functions.php starts with ob_flush(), which sends whatever answer
// has been written so far, and only then throws the buffer away and prints its own
// error document. Anything going wrong after the answer was written therefore put two
// JSON documents in one response, and flushing also commits the headers, so the 500 it
// tries to set afterwards is ignored and the whole thing leaves as a 200.
// Both are dealt with before handing over: the status is set first, and the answer
// written so far is dropped, so exactly one JSON document is ever sent.
set_error_handler(function ($errno, $errstr, $errfile, $errline) {
    if (headers_sent()) {
        // Already on its way to the browser and cannot be taken back. Appending an
        // error document would only turn a complete answer into a parse error.
        error_log('eventorProxyWithCache: ' . $errstr . ' in ' . $errfile . ' on line ' . $errline);
        exit(1);
    }
    // These describe the answer that is about to be dropped: a Content-length left
    // over from it would have the browser waiting for a body that never comes, and
    // a failure has no business being cached for half an hour
    header_remove('Content-length');
    header_remove('Cache-Control');
    header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error');
    if (ob_get_level() > 0) {
        ob_clean();
    }
    return error_handler($errno, $errstr, $errfile, $errline);
});

// Keeps the parser from reporting through error_handler() before the return value of
// loadXML() has been looked at, which would replace the message below with libxml's
libxml_use_internal_errors(true);

function jsonValue($value)
{
    $json = json_encode($value);
    if ($json === false) {
        proxyError('Proxy error: Failed to encode the response as JSON, ' . json_last_error_msg());
    }
    return $json;
}

// The text of an element as libxml joins it: every direct text and CDATA child
// concatenated, with any elements in between skipped.
function elementText(DOMElement $element)
{
    $text = '';
    for ($child = $element->firstChild; $child !== null; $child = $child->nextSibling) {
        if ($child->nodeType === XML_TEXT_NODE || $child->nodeType === XML_CDATA_SECTION_NODE) {
            $text .= $child->nodeValue;
        }
    }
    return $text;
}

function isNonBlankText($node)
{
    return $node !== null && $node->nodeType === XML_TEXT_NODE && trim($node->nodeValue) !== '';
}

// The key a child is stored under: an element by its name without any prefix, a
// comment by "comment" and a processing instruction by its target. Comments and
// processing instructions really do end up in the JSON, as empty objects.
function childName($node)
{
    if ($node->nodeType === XML_ELEMENT_NODE) {
        return $node->localName;
    }
    if ($node->nodeType === XML_COMMENT_NODE) {
        return 'comment';
    }
    if ($node->nodeType === XML_PI_NODE) {
        return $node->nodeName;
    }
    return null;
}

// Appends one child node to $out.
function appendChildAsJson(&$out, $node)
{
    if ($node->nodeType !== XML_ELEMENT_NODE) {
        // A comment or a processing instruction carries neither attributes nor children
        $out .= '{}';
        return;
    }
    // A child element whose content begins with text is represented by that text
    // alone. Its attributes are dropped, which is why Id, an element that carries a
    // type attribute, is a plain string in iof.xsd-3.0.ts. Elements that follow the
    // text are dropped along with them.
    if (isNonBlankText($node->firstChild)) {
        $out .= jsonValue(elementText($node));
        return;
    }
    appendElementAsJson($out, $node);
}

// Appends $element to $out as a JSON object, in the same shape that
// json_encode(SimpleXMLElement) produced. Written straight into one string instead of
// building a SimpleXMLElement first: SimpleXML creates an object and a property table
// for every element in the document and, because each one holds on to its children,
// they are all alive at the same time. That tree, not the document, is what ran the
// request out of memory. The root element is always an object, only children are ever
// replaced by their text.
function appendElementAsJson(&$out, DOMElement $element)
{
    $out .= '{';
    $isFirst = true;

    $attributes = array();
    foreach ($element->attributes as $attribute) {
        // SimpleXMLElement::attributes() returns the attributes that have no
        // namespace, namespace declarations are not attributes to begin with
        if ($attribute->namespaceURI === null) {
            $attributes[$attribute->name] = $attribute->value;
        }
    }
    if (count($attributes) > 0) {
        $out .= '"@attributes":' . jsonValue($attributes);
        $isFirst = false;
    }

    // An element holding nothing but one piece of text keeps it under the key "0".
    // Any other mix of text and nodes loses the text.
    $onlyChild = $element->firstChild;
    if ($onlyChild !== null && $onlyChild->nextSibling === null && isNonBlankText($onlyChild)) {
        if (!$isFirst) {
            $out .= ',';
        }
        $out .= '"0":' . jsonValue(elementText($element)) . '}';
        return;
    }

    // Children are keyed by name in order of first appearance, and a name used by
    // more than one child becomes an array. The document is already parsed, so the
    // children can be counted before any of them is written.
    $counts = array();
    $order = array();
    for ($child = $element->firstChild; $child !== null; $child = $child->nextSibling) {
        $name = childName($child);
        if ($name === null) {
            continue;
        }
        if (!isset($counts[$name])) {
            $counts[$name] = 0;
            $order[] = $name;
        }
        $counts[$name]++;
    }

    foreach ($order as $name) {
        if (!$isFirst) {
            $out .= ',';
        }
        $isFirst = false;
        $out .= jsonValue($name) . ':';

        $isList = $counts[$name] > 1;
        if ($isList) {
            $out .= '[';
        }
        $written = 0;
        for ($child = $element->firstChild; $child !== null; $child = $child->nextSibling) {
            if (childName($child) !== $name) {
                continue;
            }
            if ($written++ > 0) {
                $out .= ',';
            }
            appendChildAsJson($out, $child);
        }
        if ($isList) {
            $out .= ']';
        }
    }

    $out .= '}';
}

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);
$use_cache = false;
$no_json_convert = isset($input->noJsonConvert) && $input->noJsonConvert == true;
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
    // The converted and the raw answer to the same url are not interchangeable,
    // so they must not share a cache entry
    $cache_file = $_SERVER["DOCUMENT_ROOT"] . '/cache/cached-'
        . sha1($request_url . ($no_json_convert ? '|xml' : '|json')) . '.html';
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
// The headers are of no use here, and asking for them meant a redirect could put a
// second set of them at the front of what was taken to be the body
curl_setopt($ch, CURLOPT_HEADER, false);
curl_setopt($ch, CURLOPT_HTTPGET, true);
// Lets Eventor compress the answer, these can be tens of megabytes
curl_setopt($ch, CURLOPT_ENCODING, '');
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, EVENTOR_CONNECT_TIMEOUT);
curl_setopt($ch, CURLOPT_TIMEOUT, EVENTOR_TIMEOUT);
curl_setopt ( $ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows; U; Windows NT 5.1; pl; rv:1.9) Gecko/2008052906 Firefox/3.0" );
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);

// retrieve response, giving Eventor another chance when it fails in a way that
// tends to pass by itself
$attempts = 0;
for ($attempt = 1; $attempt <= EVENTOR_ATTEMPTS; $attempt++) {
    $attempts = $attempt;
    $response = curl_exec($ch);
    $curlError = curl_errno($ch) ? curl_error($ch) : '';
    $responseStatusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($response !== false && $curlError === '' && $responseStatusCode < 500) {
        break;
    }

    // A 500 is Eventor's own code falling over on this particular request, and it
    // falls over the same way every time, so asking again only costs time. Only the
    // failures that tend to pass by themselves are worth another attempt: a
    // connection that never came up, a timeout, or a gateway that was busy.
    $isWorthRetrying = $curlError !== '' || in_array($responseStatusCode, array(502, 503, 504), true);
    if (!$isWorthRetrying || $attempt >= EVENTOR_ATTEMPTS) {
        break;
    }
    usleep(EVENTOR_RETRY_DELAY * $attempt);
}

if ($response === false || $curlError !== '')
{
    proxyError('Proxy error: ' . $curlError . ', ' . $request_url);
}

if($responseStatusCode != 200)
{
    // Only the start of it, an error page from Eventor is mostly markup
    $responseStart = trim((string)preg_replace('/\s+/', ' ', strip_tags(substr($response, 0, 2048))));
    proxyError('Proxy error: Failed with status code ' . $responseStatusCode . ' after ' . $attempts
        . ' attempt(s) for ' . $request_url . ', ' . $responseStart);
}

if ($no_json_convert) {
    header("Content-length: " . strlen($response));
    echo $response;
    die(0);
}

// convert xml to json
// Line breaks and tabs are taken out of the document before it is parsed, the same
// as before. It matters for more than looks: the parser turns any of them inside an
// attribute value into a space, so removing them first is what keeps the converted
// answer identical to the one this proxy has always returned.
$response = str_replace(array("\n", "\r", "\t"), '', $response);

$dom = new DOMDocument();
// LIBXML_NOBLANKS drops the text nodes that only hold the indentation, which is most
// of the nodes in a pretty printed document, and LIBXML_COMPACT stores short texts
// inside the element instead of in a node of their own. Both are only about memory.
// The eventor: prefix no longer has to be cut out of the document as a string either,
// the names are read without their prefix further down.
$parsed = $dom->loadXML($response, LIBXML_NOBLANKS | LIBXML_COMPACT);
unset($response);
if (!$parsed || $dom->documentElement === null) {
    $error = libxml_get_last_error();
    proxyError('Proxy error: Failed to parse the XML response, '
        . ($error ? trim($error->message) : 'no details') . ', ' . $request_url);
}

$json = '';
appendElementAsJson($json, $dom->documentElement);
// Nothing below needs the parsed document, and it is the largest thing in memory
unset($dom);

header("Content-type: application/json");
header("Content-length: " . strlen($json));
header("Cache-Control: max-age=1800");

if ($use_cache) {
    // Filling the cache is worth nothing next to answering the request, and it is the
    // one part here that fails on its own: another request cleaning up at the same
    // moment removes a file between the listing and the unlink. Left to the error
    // handler that would throw away a complete answer, so it is kept best effort.
    set_error_handler(function () {
        return true;
    });

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

    restore_error_handler();
}

echo $json;

// No closing tag on purpose: anything after it, even a line break, is sent after
// the answer and makes the response longer than the Content-length says it is
