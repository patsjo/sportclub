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
//# 2026-11-07  PatSjo  Stream mode for the large answers,    #
//#                     beyond the time limit of the host     #
//# 2026-11-08  PatSjo  Waiting attempts notice a worker that #
//#                     was stopped, time of Eventor's answer #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/eventorApiKey.php");

cors();

// Eventor answers with 500 now and then, and it is usually gone on the next try.
// Retrying here rather than leaving it to the browser keeps one bad moment at
// Eventor from surfacing as a failed page.
define('EVENTOR_URL_PREFIX', 'https://eventor.orientering.se/');
define('WINSPLITS_API_URL_PREFIX', 'https://obasen.orientering.se/winsplits/api/');
define('EVENTOR_ATTEMPTS', 3);
define('EVENTOR_RETRY_DELAY', 300000); // microseconds, doubled for every attempt
define('EVENTOR_CONNECT_TIMEOUT', 15);
// A large result list, e.g. O-Ringen with its split times, takes Eventor minutes to build
define('EVENTOR_TIMEOUT', 600);

// Stream mode, see runStream() below
define('STREAM_PROGRESS_INTERVAL', 2); // seconds between the progress lines
define('STREAM_RESULT_LIFETIME', 300); // seconds a finished answer is handed to a new attempt
define('STREAM_FILE_LIFETIME', 3600); // seconds before the files of an old request are removed

$streamMode = false;
$streamFiles = null;
$streamIsWorker = false;
$streamLastSent = 0.0;
// The lock of the worker, held until the request ends, however it ends
$streamLock = null;

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
    // Silenced with @, e.g. the lock file of stream mode that is already there. PHP 7
    // reports 0 while silenced, PHP 8 keeps only the fatal levels.
    $level = error_reporting();
    if ($level === 0 || $level === (E_ERROR | E_CORE_ERROR | E_COMPILE_ERROR | E_USER_ERROR | E_RECOVERABLE_ERROR | E_PARSE)) {
        return false;
    }
    if ($GLOBALS['streamMode']) {
        // The answer has begun, the error is told in it
        streamFail($errstr, $errfile, $errline);
    }
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
function appendElementAsJson(&$out, DOMElement $element, $isRoot = false)
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

    $nofChildren = $isRoot ? array_sum($counts) : 0;
    $childIndex = 0;
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
            if ($isRoot) {
                streamProgress(array('step' => 'converting', 'index' => $childIndex, 'total' => $nofChildren));
                $childIndex++;
            }
            appendChildAsJson($out, $child);
        }
        if ($isList) {
            $out .= ']';
        }
    }

    $out .= '}';
}

// ---------------------------------------------------------------------------------------------
// Stream mode
//
// A large answer, e.g. the result list of O-Ringen, can take Eventor minutes to build, and the
// web host closes a request after about 100 seconds. In stream mode the proxy answers at once and
// keeps the connection alive with lines telling how far it has come:
//   #start                   followed by spaces, buffers along the way often wait for a few kB
//   #progress {"step":...}   eventor (with downloaded/total bytes and attempt), parsing, converting
//   #result <bytes>          followed by the JSON
//   #error                   followed by the error as JSON: {message, phpFile, phpLineNumber}
// The work is shared through files in the cache folder. When the host cuts the connection
// anyway, the work goes on, and the next attempt of the browser waits for it and gets its
// answer, instead of asking Eventor all over again.
// ---------------------------------------------------------------------------------------------

function streamSend($text)
{
    echo $text;
    @flush();
}

function streamStart()
{
    global $streamMode;
    $streamMode = true;
    // The work goes on when the connection is cut, a later attempt gets its answer
    ignore_user_abort(true);
    @set_time_limit(0);
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    @ini_set('zlib.output_compression', '0');
    @ini_set('implicit_flush', '1');
    if (function_exists('apache_setenv')) {
        @apache_setenv('no-gzip', '1');
    }
    header('Content-type: text/plain; charset=utf-8');
    header('Cache-Control: no-cache, no-store, no-transform');
    header('X-Accel-Buffering: no');
    streamSend('#start ' . str_repeat(' ', 4096) . "\n");
}

// Tells how far the work has come, at most every few seconds, and shares it with the
// attempts that wait for this one
function streamProgress($values, $force = false)
{
    global $streamMode, $streamFiles, $streamIsWorker, $streamLastSent;
    if (!$streamMode) {
        return;
    }
    $now = microtime(true);
    if (!$force && $now - $streamLastSent < STREAM_PROGRESS_INTERVAL) {
        return;
    }
    $streamLastSent = $now;
    $line = json_encode($values);
    if ($streamIsWorker && $streamFiles !== null) {
        @file_put_contents($streamFiles['progress'], $line, LOCK_EX);
    }
    streamSend('#progress ' . $line . "\n");
}

function streamResult($json)
{
    streamSend('#result ' . strlen($json) . "\n");
    streamSend($json);
}

function streamFail($message, $file = null, $line = null)
{
    global $streamFiles, $streamIsWorker;
    $error = json_encode(array('message' => $message, 'phpFile' => $file, 'phpLineNumber' => $line));
    if ($streamIsWorker && $streamFiles !== null) {
        // The attempts waiting for this one get the same error
        @file_put_contents($streamFiles['error'], $error, LOCK_EX);
        @unlink($streamFiles['progress']);
        @unlink($streamFiles['lock']);
    }
    streamReleaseLock();
    streamSend("#error\n" . $error);
    exit(1);
}

// Lets the waiting attempts go, after the answer or the error has been written for them
function streamReleaseLock()
{
    global $streamLock;
    if ($streamLock !== null) {
        @flock($streamLock, LOCK_UN);
        @fclose($streamLock);
        $streamLock = null;
    }
}

// Hands this attempt the answer or the error another attempt left, true when there was one
function streamFromFiles($waitStarted)
{
    global $streamFiles;
    clearstatcache();
    // The answer of an attempt that lost its connection
    if (is_file($streamFiles['result']) && filemtime($streamFiles['result']) > time() - STREAM_RESULT_LIFETIME) {
        $json = @file_get_contents($streamFiles['result']);
        if ($json !== false && $json !== '') {
            streamResult($json);
            return true;
        }
    }
    // The attempt this one waited for failed
    if (is_file($streamFiles['error']) && filemtime($streamFiles['error']) >= $waitStarted) {
        $error = @file_get_contents($streamFiles['error']);
        streamSend("#error\n" . ($error ? $error : json_encode(array('message' => 'Proxy error: unknown error'))));
        return true;
    }
    return false;
}

// What the worker was doing when it was stopped, from the last progress it shared
function streamStoppedMessage($values)
{
    $step = is_array($values) && isset($values['step']) ? $values['step'] : 'eventor';
    if ($step === 'parsing') {
        $doing = 'reading the XML from Eventor ('
            . round((isset($values['size']) ? $values['size'] : 0) / 1048576, 1) . ' MB)';
    } elseif ($step === 'converting') {
        $doing = 'converting the answer to JSON (part '
            . ((isset($values['index']) ? $values['index'] : 0) + 1) . ' of '
            . (isset($values['total']) ? $values['total'] : '?') . ')';
    } else {
        $doing = 'waiting for Eventor';
    }
    return 'Proxy error: The server stopped while ' . $doing . ', without leaving an answer or an error. '
        . 'The web host most likely ended it, e.g. for using too much memory.';
}

// A fatal error, e.g. out of memory, never reaches the error handler
register_shutdown_function(function () {
    $error = error_get_last();
    if ($GLOBALS['streamMode'] && $error !== null
        && in_array($error['type'], array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR), true)) {
        streamFail('Proxy error: ' . $error['message'], $error['file'], $error['line']);
    }
});

function runStream($request_url)
{
    global $streamFiles, $streamIsWorker, $streamLock;
    streamStart();

    $folder = $_SERVER['DOCUMENT_ROOT'] . '/cache';
    if (!is_dir($folder)) {
        @mkdir($folder, 0755, true);
    }
    $base = $folder . '/stream-' . sha1($request_url);
    $streamFiles = array(
        'lock' => $base . '.lock',
        'progress' => $base . '.progress',
        'result' => $base . '.json',
        'error' => $base . '.error'
    );
    // Old files of earlier requests
    foreach ((array)glob($folder . '/stream-*') as $file) {
        if (is_file($file) && filemtime($file) < time() - STREAM_FILE_LIFETIME) {
            @unlink($file);
        }
    }

    // The attempt doing the work holds a lock on the lock file. The lock goes with the request
    // whichever way it ends, also when the web host kills it, e.g. for its memory, and then
    // nothing else is left behind. A waiting attempt that gets the lock after it has seen it
    // held therefore knows the work is over, and when there is neither an answer nor an error
    // the work was stopped from outside. Before, it went on waiting for the lock file to grow
    // old, more than half an hour, showing the last progress all the time.
    $waitStarted = time();
    $hasSeenWorker = false;
    for (;;) {
        if (streamFromFiles($waitStarted)) {
            return;
        }
        $lock = @fopen($streamFiles['lock'], 'c');
        if ($lock === false) {
            // The cache folder cannot be written, then the work is not shared
            $streamFiles = null;
            $streamIsWorker = true;
            break;
        }
        $wouldBlock = 0;
        if (@flock($lock, LOCK_EX | LOCK_NB, $wouldBlock)) {
            if (!$hasSeenWorker) {
                // Do the work. The new time keeps the cleaning above off the lock file while in use.
                @touch($streamFiles['lock']);
                $streamLock = $lock;
                $streamIsWorker = true;
                break;
            }
            // The worker let go. It may have finished just after the look above.
            @flock($lock, LOCK_UN);
            fclose($lock);
            if (streamFromFiles($waitStarted)) {
                return;
            }
            $progress = @file_get_contents($streamFiles['progress']);
            $values = $progress ? json_decode($progress, true) : null;
            // Told as the error of the work, the attempts waiting along with this one get it too
            $streamIsWorker = true;
            streamFail(streamStoppedMessage($values));
        }
        fclose($lock);
        if (!$wouldBlock) {
            // The file system has no locks, then the work is not shared
            $streamFiles = null;
            $streamIsWorker = true;
            break;
        }
        $hasSeenWorker = true;
        // Tell how far the other attempt has come
        $progress = @file_get_contents($streamFiles['progress']);
        $values = $progress ? json_decode($progress, true) : null;
        if (!is_array($values)) {
            $values = array('step' => 'eventor');
        }
        $values['shared'] = true;
        streamProgress($values);
        sleep(1);
    }

    if ($streamFiles !== null) {
        @unlink($streamFiles['error']);
        @unlink($streamFiles['result']);
        @unlink($streamFiles['progress']);
    }
    $json = convertToJson(fetchFromEventor($request_url), $request_url);
    if ($streamFiles !== null) {
        // Written to a file of its own first, a waiting attempt never reads half of it
        $temporary = $streamFiles['result'] . '.' . getmypid();
        if (@file_put_contents($temporary, $json) !== false) {
            @rename($temporary, $streamFiles['result']);
        }
        @unlink($streamFiles['progress']);
        @unlink($streamFiles['lock']);
    }
    streamReleaseLock();
    streamResult($json);
}

// The answer of Eventor to the url, tried again when it fails in a way that tends to pass by itself
function fetchFromEventor($request_url)
{
    global $streamMode;
    // The API key of the club is only for Eventor, never sent to WinSplits
    $request_headers = strpos($request_url, EVENTOR_URL_PREFIX) === 0 ? array("ApiKey: " . GetApiKey()) : array();

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

    $attempt = 1;
    if ($streamMode) {
        // Called about once a second also while Eventor is silent, which keeps the connection alive
        curl_setopt($ch, CURLOPT_NOPROGRESS, false);
        curl_setopt(
            $ch,
            defined('CURLOPT_XFERINFOFUNCTION') ? CURLOPT_XFERINFOFUNCTION : CURLOPT_PROGRESSFUNCTION,
            function ($resource, $downloadTotal, $downloaded) use (&$attempt) {
                streamProgress(array(
                    'step' => 'eventor',
                    'downloaded' => $downloaded,
                    'total' => $downloadTotal,
                    'attempt' => $attempt,
                    'attempts' => EVENTOR_ATTEMPTS
                ));
                return 0;
            }
        );
    }

    // retrieve response, giving Eventor another chance when it fails in a way that
    // tends to pass by itself
    $attempts = 0;
    $seconds = 0;
    $response = false;
    $curlError = '';
    $responseStatusCode = 0;
    for ($attempt = 1; $attempt <= EVENTOR_ATTEMPTS; $attempt++) {
        $attempts = $attempt;
        $started = microtime(true);
        $response = curl_exec($ch);
        // How long Eventor took tells a lot about a failure: an error at once, or after minutes of work
        $seconds = (int)round(microtime(true) - $started);
        $curlErrno = curl_errno($ch);
        $curlError = $curlErrno ? curl_error($ch) : '';
        $responseStatusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($response !== false && $curlError === '' && $responseStatusCode < 500) {
            break;
        }

        // A 500 is Eventor's own code falling over on this particular request, and it
        // falls over the same way every time, so asking again only costs time. Only the
        // failures that tend to pass by themselves are worth another attempt: a
        // connection that never came up, or a gateway that was busy. Neither is a request
        // that ran out of time, Eventor would only take as long again.
        $isWorthRetrying = ($curlError !== '' && $curlErrno !== 28)
            || in_array($responseStatusCode, array(502, 503, 504), true);
        if (!$isWorthRetrying || $attempt >= EVENTOR_ATTEMPTS) {
            break;
        }
        streamProgress(array(
            'step' => 'eventor',
            'attempt' => $attempt + 1,
            'attempts' => EVENTOR_ATTEMPTS,
            'previousError' => $curlError !== '' ? $curlError : 'status code ' . $responseStatusCode
        ), true);
        usleep(EVENTOR_RETRY_DELAY * $attempt);
    }

    if ($response === false || $curlError !== '')
    {
        proxyError('Proxy error: ' . $curlError . ' after ' . $attempts . ' attempt(s), the last after '
            . $seconds . ' s, ' . $request_url);
    }

    if($responseStatusCode != 200)
    {
        // Only the start of its text, an error page from Eventor is mostly markup. The styles and
        // scripts are not text, and would fill the message on their own.
        $responseText = (string)preg_replace('#<(style|script)\b[^>]*>.*?</\1>#is', ' ', substr($response, 0, 65536));
        $responseStart = substr(trim((string)preg_replace('/\s+/', ' ', strip_tags($responseText))), 0, 300);
        proxyError('Proxy error: Failed with status code ' . $responseStatusCode . ' after ' . $attempts
            . ' attempt(s), Eventor answered after ' . $seconds . ' s, for ' . $request_url . ', ' . $responseStart);
    }

    return $response;
}

// The XML of Eventor as JSON
function convertToJson($response, $request_url)
{
    streamProgress(array('step' => 'parsing', 'size' => strlen($response)), true);

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
    appendElementAsJson($json, $dom->documentElement, true);
    return $json;
}

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json);
$use_cache = false;
$no_json_convert = isset($input->noJsonConvert) && $input->noJsonConvert == true;
$request_url = "";

if (isset($input->csurl)) {
    $request_url = urldecode($input->csurl);
}
// Eventor, and the API of WinSplits Online, which answers with IOF XML 3.0 as Eventor does (races that are
// not in Eventor, e.g. abroad)
if (!isset($input->csurl)
    || (strpos($request_url, EVENTOR_URL_PREFIX) !== 0 && strpos($request_url, WINSPLITS_API_URL_PREFIX) !== 0)) {
    header($_SERVER['SERVER_PROTOCOL'] . ' 404 Not Found');
    header('Status: 404 Not Found');
    $_SERVER['REDIRECT_STATUS'] = 404;
    exit;
}

if (isset($input->stream) && $input->stream == true && !$no_json_convert) {
    runStream($request_url);
    exit(0);
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

$response = fetchFromEventor($request_url);

if ($no_json_convert) {
    header("Content-length: " . strlen($response));
    echo $response;
    die(0);
}

$json = convertToJson($response, $request_url);
unset($response);

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
