<?php
//############################################################
//# File:    invoices.php                                    #
//# Created: 2026-11-17                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Invoices paid with Swish (Swish Handel, the Swish        #
//# Commerce API), see README "Invoices and Swish".          #
//# An invoice goes to a user, a competitor or a family.     #
//# A user sees (and can pay) the invoices of the whole      #
//# family: to the user, to the competitor linked to the     #
//# user, to the family of that competitor, and to the other #
//# competitors in the family and their users.               #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-17  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
if (file_exists($_SERVER["DOCUMENT_ROOT"] . "/include/swishKeys.php"))
{
  include_once($_SERVER["DOCUMENT_ROOT"] . "/include/swishKeys.php");
}

$cINVOICE_STATUSES = array('UNPAID', 'PAID', 'OVERPAID', 'CANCELLED');
// A payment request at Swish expires after 3 minutes
$cSWISH_EXPIRE_SECONDS = 180;

function invoiceSetting($iFunction)
{
  return function_exists($iFunction) ? trim(call_user_func($iFunction)) : '';
}

function swishEnabled()
{
  return invoiceSetting('GetSwishPayeeAlias') != '' && invoiceSetting('GetSwishCertificateFile') != '' &&
         invoiceSetting('GetSwishCallbackUrl') != '' && function_exists('curl_init');
}

// The SQL condition (on the alias i for INVOICES) for the invoices the user can see and pay, the invoices of the
// whole family: to the user, the linked competitor, the family, and the other competitors in the family and their users
function myInvoicesWhere($iUserId)
{
  $userId = intval($iUserId);
  $myCompetitor = "SELECT u.competitor_id FROM users u WHERE u.user_id = " . $userId . " AND u.competitor_id IS NOT NULL";
  $myFamily = "SELECT c.FAMILY_ID FROM users u INNER JOIN RACE_COMPETITORS c ON (u.competitor_id = c.COMPETITOR_ID) " .
              "WHERE u.user_id = " . $userId . " AND c.FAMILY_ID IS NOT NULL";
  $familyCompetitors = "SELECT fc.COMPETITOR_ID FROM RACE_COMPETITORS fc WHERE fc.FAMILY_ID IN (" . $myFamily . ")";
  return "(i.USER_ID = " . $userId .
         " OR i.COMPETITOR_ID IN (" . $myCompetitor . ")" .
         " OR i.FAMILY_ID IN (" . $myFamily . ")" .
         " OR i.COMPETITOR_ID IN (" . $familyCompetitors . ")" .
         " OR i.USER_ID IN (SELECT fu.user_id FROM users fu WHERE fu.competitor_id IN (" . $familyCompetitors . ")))";
}

// The number of unpaid and overdue invoices of the user, both 0 when the invoice tables are missing
// (the patch isn't run), so the login still works
function myInvoiceCounts($iUserId)
{
  $counts = new stdClass();
  $counts->unpaid = 0;
  $counts->overdue = 0;
  if (intval($iUserId) <= 0)
  {
    return $counts;
  }
  try
  {
    $result = \db\mysql_query("SELECT COUNT(*) AS unpaid, SUM(CASE WHEN b.DUE_DATE < CURDATE() THEN 1 ELSE 0 END) AS overdue " .
                              "FROM INVOICES i INNER JOIN INVOICE_BATCHES b ON (i.BATCH_ID = b.BATCH_ID) " .
                              "WHERE i.STATUS = 'UNPAID' AND " . myInvoicesWhere($iUserId));
    if ($result)
    {
      $row = \db\mysql_fetch_assoc($result);
      $counts->unpaid = intval($row['unpaid']);
      $counts->overdue = intval($row['overdue']);
      \db\mysql_free_result($result);
    }
  }
  catch (\Throwable $e)
  {
    // The invoice tables are missing
  }
  return $counts;
}

// A quoted SQL string, NULL when empty
function invoiceSqlString($iValue)
{
  return is_null($iValue) || strlen($iValue) == 0 ? 'NULL' : "'" . \db\mysql_real_escape_string($iValue) . "'";
}

function invoiceMoney($iValue)
{
  return round(floatval($iValue), 2);
}

// The status from what is paid, a cancelled invoice is owed nothing
function invoiceStatusFromPaid($iStatus, $iTotal, $iPaidAmount)
{
  $owed = $iStatus == 'CANCELLED' ? 0 : invoiceMoney($iTotal);
  $paid = invoiceMoney($iPaidAmount);
  if ($paid > $owed)
  {
    return 'OVERPAID';
  }
  if ($iStatus != 'CANCELLED' && $paid >= $owed)
  {
    return 'PAID';
  }
  return $iStatus == 'CANCELLED' ? 'CANCELLED' : 'UNPAID';
}

function addInvoiceHistory($iInvoiceId, $iOldStatus, $iNewStatus, $iOldPaidAmount, $iNewPaidAmount, $iComment, $iSwishPaymentId, $iChangedByUserId)
{
  sqlQueryOrError(sprintf("INSERT INTO INVOICE_HISTORY (INVOICE_ID, OLD_STATUS, NEW_STATUS, OLD_PAID_AMOUNT, NEW_PAID_AMOUNT, " .
                          "COMMENT, SWISH_PAYMENT_ID, CHANGED_BY_USER_ID, CRE_DATE) VALUES (%d, %s, '%s', %s, %s, %s, %s, %s, NOW())",
                          $iInvoiceId,
                          is_null($iOldStatus) ? 'NULL' : "'" . \db\mysql_real_escape_string($iOldStatus) . "'",
                          \db\mysql_real_escape_string($iNewStatus),
                          is_null($iOldPaidAmount) ? 'NULL' : number_format(invoiceMoney($iOldPaidAmount), 2, '.', ''),
                          number_format(invoiceMoney($iNewPaidAmount), 2, '.', ''),
                          is_null($iComment) || $iComment == '' ? 'NULL' : "'" . \db\mysql_real_escape_string($iComment) . "'",
                          is_null($iSwishPaymentId) ? 'NULL' : "'" . \db\mysql_real_escape_string($iSwishPaymentId) . "'",
                          is_null($iChangedByUserId) ? 'NULL' : intval($iChangedByUserId)));
}

// A payment from Swish, added to what is already paid (two payments of the same invoice gives overpaid)
function applySwishPaymentToInvoice($iInvoiceId, $iAmount, $iPaymentId, $iDatePaid)
{
  $invoice = sqlFirstRow(sprintf("SELECT STATUS, AMOUNT, INVOICE_FEE, PAID_AMOUNT FROM INVOICES WHERE INVOICE_ID = %d FOR UPDATE", $iInvoiceId));
  if (is_null($invoice))
  {
    return;
  }
  $total = invoiceMoney($invoice['AMOUNT']) + invoiceMoney($invoice['INVOICE_FEE']);
  $paid = invoiceMoney($invoice['PAID_AMOUNT']) + invoiceMoney($iAmount);
  $status = invoiceStatusFromPaid($invoice['STATUS'], $total, $paid);
  sqlQueryOrError(sprintf("UPDATE INVOICES SET STATUS = '%s', PAID_AMOUNT = %s, PAID_DATE = %s WHERE INVOICE_ID = %d",
                          $status,
                          number_format($paid, 2, '.', ''),
                          is_null($iDatePaid) ? 'NOW()' : "'" . \db\mysql_real_escape_string($iDatePaid) . "'",
                          $iInvoiceId));
  addInvoiceHistory($iInvoiceId, $invoice['STATUS'], $status, $invoice['PAID_AMOUNT'], $paid, 'Swish', $iPaymentId, null);
}

// Only the characters Swish allows in the message, at most 50
function swishMessage($iText)
{
  $text = preg_replace('/[^a-zA-Z0-9åäöÅÄÖ :;.,?!()"\-]/u', ' ', $iText);
  $text = trim(preg_replace('/\s+/u', ' ', $text));
  if (preg_match('/^.{0,50}/u', $text, $matches))
  {
    $text = trim($matches[0]);
  }
  return $text;
}

// A new instructionUUID, 32 upper case hex characters
function swishNewPaymentId()
{
  return strtoupper(bin2hex(random_bytes(16)));
}

function isSwishPaymentId($iPaymentId)
{
  return is_string($iPaymentId) && preg_match('/^[0-9A-F]{32}$/', $iPaymentId) === 1;
}

// A request to Swish with the client certificate, returns status, headers and body
function swishRequest($iMethod, $iUrl, $iBody = null, $iContentType = 'application/json', $iUseCertificate = true)
{
  $headers = array();
  $curl = curl_init($iUrl);
  curl_setopt($curl, CURLOPT_CUSTOMREQUEST, $iMethod);
  curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 10);
  curl_setopt($curl, CURLOPT_TIMEOUT, 20);
  curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, true);
  curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, 2);
  if ($iUseCertificate)
  {
    curl_setopt($curl, CURLOPT_SSLCERT, invoiceSetting('GetSwishCertificateFile'));
    $keyFile = invoiceSetting('GetSwishKeyFile');
    if ($keyFile != '')
    {
      curl_setopt($curl, CURLOPT_SSLKEY, $keyFile);
    }
    $keyPassword = function_exists('GetSwishKeyPassword') ? GetSwishKeyPassword() : '';
    if ($keyPassword != '')
    {
      curl_setopt($curl, CURLOPT_SSLKEYPASSWD, $keyPassword);
    }
    $caFile = invoiceSetting('GetSwishCaFile');
    if ($caFile != '')
    {
      curl_setopt($curl, CURLOPT_CAINFO, $caFile);
    }
  }
  if (!is_null($iBody))
  {
    curl_setopt($curl, CURLOPT_POSTFIELDS, $iBody);
    curl_setopt($curl, CURLOPT_HTTPHEADER, array('Content-Type: ' . $iContentType));
  }
  curl_setopt($curl, CURLOPT_HEADERFUNCTION, function ($iCurl, $iHeader) use (&$headers) {
    $parts = explode(':', $iHeader, 2);
    if (count($parts) == 2)
    {
      $headers[strtolower(trim($parts[0]))] = trim($parts[1]);
    }
    return strlen($iHeader);
  });
  $body = curl_exec($curl);
  $response = new stdClass();
  $response->status = intval(curl_getinfo($curl, CURLINFO_HTTP_CODE));
  $response->headers = $headers;
  $response->body = $body === false ? null : $body;
  $response->error = $body === false ? curl_error($curl) : null;
  curl_close($curl);
  return $response;
}

// The error from Swish as a text, e.g. "RP03 Callback URL is missing or does not use HTTPS"
function swishErrorText($iResponse)
{
  if (!is_null($iResponse->error))
  {
    return 'Swish: ' . $iResponse->error;
  }
  $errors = json_decode(is_null($iResponse->body) ? '' : $iResponse->body);
  $texts = array();
  if (is_array($errors))
  {
    foreach ($errors as $error)
    {
      if (is_object($error))
      {
        array_push($texts, trim((isset($error->errorCode) ? $error->errorCode : '') . ' ' . (isset($error->errorMessage) ? $error->errorMessage : '')));
      }
    }
  }
  return 'Swish (HTTP ' . $iResponse->status . ')' . (count($texts) > 0 ? ': ' . implode(', ', $texts) : '');
}

// A payment request without the payer's phone number (the Swish app is opened with the token, or the QR code is scanned)
function swishCreatePaymentRequest($iPaymentId, $iInvoiceId, $iAmount, $iMessage)
{
  $body = new stdClass();
  $body->payeePaymentReference = '' . intval($iInvoiceId);
  $body->callbackUrl = invoiceSetting('GetSwishCallbackUrl');
  $body->payeeAlias = invoiceSetting('GetSwishPayeeAlias');
  $body->amount = number_format(invoiceMoney($iAmount), 2, '.', '');
  $body->currency = 'SEK';
  $body->message = swishMessage($iMessage);
  return swishRequest('PUT', invoiceSetting('GetSwishApiUrl') . '/v2/paymentrequests/' . $iPaymentId, json_encode($body));
}

function swishCancelPaymentRequest($iPaymentId)
{
  return swishRequest('PATCH', invoiceSetting('GetSwishApiUrl') . '/v1/paymentrequests/' . $iPaymentId,
                      '[{"op":"replace","path":"/status","value":"cancelled"}]', 'application/json-patch+json');
}

// The QR code of the token as a data url (svg), null when Swish doesn't answer
function swishQrCode($iToken)
{
  $body = new stdClass();
  $body->token = $iToken;
  $body->format = 'svg';
  $body->size = 300;
  $body->border = 0;
  $body->transparent = true;
  $response = swishRequest('POST', invoiceSetting('GetSwishQrUrl'), json_encode($body), 'application/json', false);
  if ($response->status != 200 || is_null($response->body) || strlen($response->body) == 0)
  {
    return null;
  }
  return 'data:image/svg+xml;base64,' . base64_encode($response->body);
}

// The Swish date (e.g. "2026-11-17T12:34:56.789+0100") as a local MySQL datetime
function swishDate($iDate)
{
  if (!is_string($iDate) || $iDate == '')
  {
    return null;
  }
  $time = strtotime($iDate);
  return $time === false ? null : date('Y-m-d H:i:s', $time);
}

// Asks Swish about the payment and saves the answer, the invoice is paid when Swish says PAID.
// Never trusts the callback itself, it can be posted by anyone. Returns the saved status.
// When Swish can't be asked: an error with $iFailOnError (the callback, Swish posts it again), otherwise
// still CREATED (the web page asks again).
function refreshSwishPayment($iPaymentId, $iFailOnError = false)
{
  if (!isSwishPaymentId($iPaymentId))
  {
    return null;
  }
  $payment = sqlFirstRow(sprintf("SELECT PAYMENT_ID, INVOICE_ID, STATUS FROM SWISH_PAYMENTS WHERE PAYMENT_ID = '%s' FOR UPDATE", $iPaymentId));
  if (is_null($payment))
  {
    return null;
  }
  if ($payment['STATUS'] != 'CREATED')
  {
    return $payment['STATUS'];
  }
  $response = swishRequest('GET', invoiceSetting('GetSwishApiUrl') . '/v1/paymentrequests/' . $iPaymentId);
  $swish = $response->status == 200 ? json_decode($response->body) : null;
  if (!is_object($swish) || !isset($swish->status) || !is_string($swish->status))
  {
    if ($iFailOnError)
    {
      trigger_error($response->status != 200 ? swishErrorText($response) : 'Swish: Felaktigt svar', E_USER_ERROR);
    }
    return 'CREATED';
  }
  $status = strtoupper($swish->status);
  if (!in_array($status, array('CREATED', 'PAID', 'DECLINED', 'ERROR', 'CANCELLED'), true))
  {
    $status = 'ERROR';
  }
  if ($status == 'CREATED')
  {
    return $status;
  }
  $amount = isset($swish->amount) ? invoiceMoney($swish->amount) : 0;
  $datePaid = isset($swish->datePaid) ? swishDate($swish->datePaid) : null;
  sqlQueryOrError(sprintf("UPDATE SWISH_PAYMENTS SET STATUS = '%s', AMOUNT = CASE WHEN '%s' = 'PAID' THEN %s ELSE AMOUNT END, " .
                          "PAYMENT_REFERENCE = %s, PAYER_ALIAS = %s, ERROR_CODE = %s, ERROR_MESSAGE = %s, DATE_PAID = %s, UPDATE_DATE = NOW() " .
                          "WHERE PAYMENT_ID = '%s' AND STATUS = 'CREATED'",
                          $status,
                          $status,
                          number_format($amount, 2, '.', ''),
                          invoiceSqlString(isset($swish->paymentReference) ? substr('' . $swish->paymentReference, 0, 64) : ''),
                          invoiceSqlString(isset($swish->payerAlias) ? substr('' . $swish->payerAlias, 0, 32) : ''),
                          invoiceSqlString(isset($swish->errorCode) ? substr('' . $swish->errorCode, 0, 16) : ''),
                          invoiceSqlString(isset($swish->errorMessage) ? substr('' . $swish->errorMessage, 0, 255) : ''),
                          is_null($datePaid) ? 'NULL' : "'" . $datePaid . "'",
                          $iPaymentId));
  if ($status == 'PAID')
  {
    applySwishPaymentToInvoice(intval($payment['INVOICE_ID']), $amount, $iPaymentId, $datePaid);
  }
  return $status;
}

// The users that see the invoice and have an email
function invoiceEmails($iInvoiceId)
{
  $emails = array();
  // The same users as in myInvoicesWhere: the recipient, and everyone in the family of the recipient
  $result = sqlQueryOrError(sprintf(
    "SELECT DISTINCT u.email, u.first_name, u.last_name FROM INVOICES i " .
    "INNER JOIN users u ON (u.user_id = i.USER_ID OR (u.competitor_id IS NOT NULL AND u.competitor_id = i.COMPETITOR_ID) OR " .
    "  u.competitor_id IN (SELECT c.COMPETITOR_ID FROM RACE_COMPETITORS c WHERE c.FAMILY_ID IS NOT NULL AND (" .
    "    c.FAMILY_ID = i.FAMILY_ID OR " .
    "    c.FAMILY_ID = (SELECT ic.FAMILY_ID FROM RACE_COMPETITORS ic WHERE ic.COMPETITOR_ID = i.COMPETITOR_ID) OR " .
    "    c.FAMILY_ID = (SELECT uc.FAMILY_ID FROM users iu INNER JOIN RACE_COMPETITORS uc ON (iu.competitor_id = uc.COMPETITOR_ID) " .
    "                   WHERE iu.user_id = i.USER_ID)))) " .
    "WHERE i.INVOICE_ID = %d AND u.email IS NOT NULL AND u.email <> ''", $iInvoiceId));
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $email = trim($row['email']);
    if (filter_var($email, FILTER_VALIDATE_EMAIL))
    {
      $emails[strtolower($email)] = $email;
    }
  }
  \db\mysql_free_result($result);
  return array_values($emails);
}

function encodeMailHeader($iText)
{
  return '=?UTF-8?B?' . base64_encode($iText) . '?=';
}

// Sends a reminder of the invoice, returns the addresses it was sent to
function sendInvoiceReminder($iInvoice)
{
  $from = invoiceSetting('GetInvoiceEmailFrom');
  if ($from == '')
  {
    trigger_error('Avsändaren av påminnelser saknas, GetInvoiceEmailFrom() i swishKeys.php.', E_USER_ERROR);
  }
  $emails = invoiceEmails($iInvoice['INVOICE_ID']);
  if (count($emails) == 0)
  {
    return $emails;
  }
  $total = invoiceMoney($iInvoice['AMOUNT']) + invoiceMoney($iInvoice['INVOICE_FEE']);
  $left = max(0, $total - invoiceMoney($iInvoice['PAID_AMOUNT']));
  $webUrl = invoiceSetting('GetInvoiceWebUrl');
  $subject = 'Påminnelse: ' . $iInvoice['TITLE'];
  $text = "Hej!\r\n\r\n" .
          "Vi har inte fått betalt för fakturan nedan.\r\n\r\n" .
          $iInvoice['TITLE'] . "\r\n" .
          "Meddelande: " . $iInvoice['MESSAGE'] . "\r\n" .
          "Fakturanummer: " . $iInvoice['INVOICE_ID'] . "\r\n" .
          "Förfallodatum: " . $iInvoice['DUE_DATE'] . "\r\n" .
          (invoiceMoney($iInvoice['PAID_AMOUNT']) > 0
            ? "Fakturans belopp: " . number_format($total, 2, ',', ' ') . " kr\r\n" .
              "Betalt hittills: " . number_format(invoiceMoney($iInvoice['PAID_AMOUNT']), 2, ',', ' ') . " kr\r\n" .
              "Kvar att betala: " . number_format($left, 2, ',', ' ') . " kr\r\n\r\n"
            : "Att betala: " . number_format($left, 2, ',', ' ') . " kr\r\n\r\n") .
          ($webUrl != '' ? "Logga in och betala med Swish under Mina fakturor: " . $webUrl . "\r\n\r\n" : '') .
          "Har du redan betalt kan du bortse från påminnelsen.\r\n";
  $headers = "From: " . $from . "\r\n" .
             "MIME-Version: 1.0\r\n" .
             "Content-Type: text/plain; charset=UTF-8\r\n" .
             "Content-Transfer-Encoding: 8bit\r\n";
  $sent = array();
  foreach ($emails as $email)
  {
    if (mail($email, encodeMailHeader($subject), $text, $headers))
    {
      array_push($sent, $email);
    }
  }
  return $sent;
}
?>
