<?php
//############################################################
//# File:    invoices.php                                    #
//# Created: 2026-11-17                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Invoices paid with Swish, see README "Invoices and       #
//# Swish". Parameters: iType                                #
//#  For the logged in user:                                 #
//#   MY                my invoices                          #
//#   SWISH_START       invoiceId, a payment request to      #
//#                     Swish (token and QR code)            #
//#   SWISH_STATUS      paymentId                            #
//#   SWISH_CANCEL      paymentId                            #
//#   EVENT_FEE_PERIODS the invoiced periods of event fees,  #
//#                     the next period starts the day after #
//#  For administrators and the economy responsible:         #
//#   OVERVIEW          all invoices, grouped in batches     #
//#   HISTORY           invoiceId                            #
//#   RECIPIENTS        users and families                   #
//#   CREATE            a batch with one invoice per         #
//#                     recipient                            #
//#  Only for the economy responsible:                       #
//#   SET_STATUS        invoiceIds, status, paidAmount,      #
//#                     comment                              #
//#   REMIND            invoiceIds, emails a reminder        #
//#   DELETE_INVOICE    invoiceIds (or invoiceId), only when #
//#                     nothing is paid. The batch is        #
//#                     deleted with its last invoice.       #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2026-11-17  PatSjo  Initial version                      #
//############################################################

include_once($_SERVER["DOCUMENT_ROOT"] . "/include/db.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/functions.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/users.php");
include_once($_SERVER["DOCUMENT_ROOT"] . "/include/invoices.php");

ValidLogin();

header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT"); // Date in the past

// Takes raw data from the request
$json = file_get_contents('php://input');
// Converts it into a PHP object
$input = json_decode($json === false ? '' : $json);
if (!is_object($input) || !isset($input->iType) || !is_string($input->iType))
{
  trigger_error('Felaktig parameter "iType".', E_USER_ERROR);
}

OpenDatabase();
$isAdmin = ValidGroup($cADMIN_GROUP_ID);
$isEconomy = ValidGroup($cECONOMY_GROUP_ID);
$overviewTypes = array('OVERVIEW', 'HISTORY', 'RECIPIENTS', 'CREATE');
$economyTypes = array('SET_STATUS', 'REMIND', 'DELETE_INVOICE');
if ((in_array($input->iType, $overviewTypes, true) && !$isAdmin && !$isEconomy) ||
    (in_array($input->iType, $economyTypes, true) && !$isEconomy))
{
  NotAuthorized(true);
}

function inputInt($iInput, $iName, $iDefault = 0)
{
  return isset($iInput->$iName) && is_numeric($iInput->$iName) ? intval($iInput->$iName) : $iDefault;
}

function inputMoney($iInput, $iName, $iDefault = null)
{
  return isset($iInput->$iName) && is_numeric($iInput->$iName) ? invoiceMoney($iInput->$iName) : $iDefault;
}

function inputString($iInput, $iName, $iMaxLength)
{
  if (!isset($iInput->$iName) || !is_string($iInput->$iName))
  {
    return '';
  }
  $value = trim($iInput->$iName);
  return function_exists('mb_substr') ? mb_substr($value, 0, $iMaxLength) : substr($value, 0, $iMaxLength);
}

// A date YYYY-MM-DD, null when it isn't valid
function inputDate($iInput, $iName)
{
  $value = isset($iInput->$iName) && is_string($iInput->$iName) ? $iInput->$iName : '';
  if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $parts) !== 1 || !checkdate(intval($parts[2]), intval($parts[3]), intval($parts[1])))
  {
    return null;
  }
  return $value;
}

function inputIds($iInput, $iName)
{
  $ids = array();
  if (isset($iInput->$iName) && is_array($iInput->$iName))
  {
    foreach ($iInput->$iName as $id)
    {
      if (is_numeric($id) && intval($id) > 0)
      {
        $ids[intval($id)] = intval($id);
      }
    }
  }
  return array_values($ids);
}

function moneyString($iValue)
{
  return number_format(invoiceMoney($iValue), 2, '.', '');
}

function addDays($iDate, $iDays)
{
  return date('Y-m-d', strtotime($iDate . ' ' . ($iDays >= 0 ? '+' : '') . intval($iDays) . ' days'));
}

$cINVOICE_SELECT = "SELECT i.INVOICE_ID, i.BATCH_ID, i.USER_ID, i.COMPETITOR_ID, i.FAMILY_ID, i.RECIPIENT_NAME, i.MESSAGE, " .
                   "  i.AMOUNT, i.INVOICE_FEE, i.STATUS, i.PAID_AMOUNT, i.PAID_DATE, i.REMINDERS, i.LAST_REMINDER_DATE, " .
                   "  b.BATCH_TYPE, b.TITLE, b.INVOICE_DATE, b.DUE_DATE " .
                   "FROM INVOICES i INNER JOIN INVOICE_BATCHES b ON (i.BATCH_ID = b.BATCH_ID) ";

function invoiceFromRow($iRow)
{
  $x = new stdClass();
  $x->invoiceId = intval($iRow['INVOICE_ID']);
  $x->batchId = intval($iRow['BATCH_ID']);
  $x->batchType = $iRow['BATCH_TYPE'];
  $x->title = $iRow['TITLE'];
  $x->message = $iRow['MESSAGE'];
  $x->recipientName = $iRow['RECIPIENT_NAME'];
  $x->userId = is_null($iRow['USER_ID']) ? null : intval($iRow['USER_ID']);
  $x->competitorId = is_null($iRow['COMPETITOR_ID']) ? null : intval($iRow['COMPETITOR_ID']);
  $x->familyId = is_null($iRow['FAMILY_ID']) ? null : intval($iRow['FAMILY_ID']);
  $x->invoiceDate = $iRow['INVOICE_DATE'];
  $x->dueDate = $iRow['DUE_DATE'];
  $x->amount = invoiceMoney($iRow['AMOUNT']);
  $x->invoiceFee = invoiceMoney($iRow['INVOICE_FEE']);
  $x->total = invoiceMoney($x->amount + $x->invoiceFee);
  $x->status = $iRow['STATUS'];
  $x->paidAmount = invoiceMoney($iRow['PAID_AMOUNT']);
  $x->paidDate = $iRow['PAID_DATE'];
  $x->reminders = intval($iRow['REMINDERS']);
  $x->lastReminderDate = $iRow['LAST_REMINDER_DATE'];
  $x->isOverdue = $x->status == 'UNPAID' && $x->dueDate < date('Y-m-d');
  $x->rows = array();
  return $x;
}

// The invoices from the SQL, with their rows
function loadInvoices($iSql)
{
  $invoices = array();
  $index = array();
  $result = sqlQueryOrError($iSql);
  while ($row = \db\mysql_fetch_assoc($result))
  {
    $invoice = invoiceFromRow($row);
    $index[$invoice->invoiceId] = count($invoices);
    array_push($invoices, $invoice);
  }
  \db\mysql_free_result($result);
  if (count($invoices) > 0)
  {
    $result = sqlQueryOrError("SELECT INVOICE_ID, DESCRIPTION, NUMBER_OF, TOTAL_FEE, AMOUNT FROM INVOICE_ROWS " .
                              "WHERE INVOICE_ID IN (" . implode(',', array_keys($index)) . ") ORDER BY INVOICE_ID, SORT_ORDER, ROW_ID");
    while ($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->description = $row['DESCRIPTION'];
      $x->numberOf = intval($row['NUMBER_OF']);
      $x->totalFee = invoiceMoney($row['TOTAL_FEE']);
      $x->amount = invoiceMoney($row['AMOUNT']);
      array_push($invoices[$index[intval($row['INVOICE_ID'])]]->rows, $x);
    }
    \db\mysql_free_result($result);
  }
  return $invoices;
}

// The invoice, only when the user can see it (or is the economy responsible)
function loadMyInvoiceRow($iInvoiceId, $iForUpdate = false)
{
  global $user_id, $isEconomy, $cINVOICE_SELECT;
  return sqlFirstRow($cINVOICE_SELECT . sprintf("WHERE i.INVOICE_ID = %d", $iInvoiceId) .
                     ($isEconomy ? "" : " AND " . myInvoicesWhere($user_id)) . ($iForUpdate ? " FOR UPDATE" : ""));
}

// The Swish payment, only when the user can see the invoice
function loadMyPayment($iPaymentId)
{
  if (!isSwishPaymentId($iPaymentId))
  {
    trigger_error('Felaktig parameter "paymentId".', E_USER_ERROR);
  }
  $payment = sqlFirstRow(sprintf("SELECT PAYMENT_ID, INVOICE_ID, STATUS, CRE_DATE FROM SWISH_PAYMENTS WHERE PAYMENT_ID = '%s'", $iPaymentId));
  if (is_null($payment) || is_null(loadMyInvoiceRow(intval($payment['INVOICE_ID']))))
  {
    trigger_error('Betalningen finns inte.', E_USER_ERROR);
  }
  return $payment;
}

function paymentStatus($iPaymentId)
{
  $payment = sqlFirstRow(sprintf("SELECT s.STATUS, s.AMOUNT, s.ERROR_CODE, s.ERROR_MESSAGE, i.STATUS AS INVOICE_STATUS " .
                                 "FROM SWISH_PAYMENTS s INNER JOIN INVOICES i ON (s.INVOICE_ID = i.INVOICE_ID) WHERE s.PAYMENT_ID = '%s'", $iPaymentId));
  $x = new stdClass();
  $x->paymentId = $iPaymentId;
  $x->status = $payment['STATUS'];
  $x->amount = invoiceMoney($payment['AMOUNT']);
  $x->errorCode = $payment['ERROR_CODE'];
  $x->errorMessage = $payment['ERROR_MESSAGE'];
  $x->invoiceStatus = $payment['INVOICE_STATUS'];
  return $x;
}

function recipientName($iRecipient)
{
  if (!is_null($iRecipient->userId))
  {
    $row = sqlFirstRow(sprintf("SELECT first_name, last_name FROM users WHERE user_id = %d", $iRecipient->userId));
    return is_null($row) ? null : trim($row['first_name'] . ' ' . $row['last_name']);
  }
  if (!is_null($iRecipient->competitorId))
  {
    $row = sqlFirstRow(sprintf("SELECT FIRST_NAME, LAST_NAME FROM RACE_COMPETITORS WHERE COMPETITOR_ID = %d", $iRecipient->competitorId));
    return is_null($row) ? null : trim($row['FIRST_NAME'] . ' ' . $row['LAST_NAME']);
  }
  $row = sqlFirstRow(sprintf("SELECT FAMILY_NAME FROM RACE_FAMILIES WHERE FAMILY_ID = %d", $iRecipient->familyId));
  return is_null($row) ? null : trim($row['FAMILY_NAME']);
}

// The message of one invoice, {namn} or {name} is the name of the recipient
function invoiceMessage($iTemplate, $iName)
{
  $message = str_replace(array('{namn}', '{name}', '{NAMN}', '{NAME}'), $iName, $iTemplate);
  return function_exists('mb_substr') ? mb_substr($message, 0, 128) : substr($message, 0, 128);
}

// Nothing may be paid on an invoice that is deleted, then it must be cancelled instead
function assertNothingPaid($iWhere)
{
  $row = sqlFirstRow("SELECT COUNT(*) AS number_of FROM INVOICES i WHERE " . $iWhere .
                     " AND (i.PAID_AMOUNT > 0 OR EXISTS (SELECT 1 FROM SWISH_PAYMENTS s WHERE s.INVOICE_ID = i.INVOICE_ID AND s.STATUS IN ('CREATED', 'PAID')))");
  if (!is_null($row) && intval($row['number_of']) > 0)
  {
    trigger_error('Det finns betalningar, makulera fakturan i stället för att radera den.', E_USER_ERROR);
  }
}

$rows = new stdClass();

switch ($input->iType)
{
  case 'MY':
    $rows->swishEnabled = swishEnabled();
    $rows->invoices = loadInvoices($cINVOICE_SELECT . "WHERE " . myInvoicesWhere($user_id) . " ORDER BY b.DUE_DATE DESC, i.INVOICE_ID DESC");
    $counts = myInvoiceCounts($user_id);
    $rows->unpaidInvoices = $counts->unpaid;
    $rows->overdueInvoices = $counts->overdue;
    break;

  case 'SWISH_START':
    if (!swishEnabled())
    {
      trigger_error('Betalning med Swish är inte påslaget.', E_USER_ERROR);
    }
    $invoice = loadMyInvoiceRow(inputInt($input, 'invoiceId'), true);
    if (is_null($invoice))
    {
      trigger_error('Fakturan finns inte.', E_USER_ERROR);
    }
    if ($invoice['STATUS'] != 'UNPAID')
    {
      trigger_error('Fakturan är redan betald eller makulerad.', E_USER_ERROR);
    }
    $left = invoiceMoney(invoiceMoney($invoice['AMOUNT']) + invoiceMoney($invoice['INVOICE_FEE']) - invoiceMoney($invoice['PAID_AMOUNT']));
    if ($left < 1)
    {
      trigger_error('Det finns inget att betala.', E_USER_ERROR);
    }
    // Only one payment at a time, an earlier unfinished payment of the invoice is cancelled
    $result = sqlQueryOrError(sprintf("SELECT PAYMENT_ID FROM SWISH_PAYMENTS WHERE INVOICE_ID = %d AND STATUS = 'CREATED'", $invoice['INVOICE_ID']));
    $oldPaymentIds = array();
    while ($row = \db\mysql_fetch_assoc($result))
    {
      array_push($oldPaymentIds, $row['PAYMENT_ID']);
    }
    \db\mysql_free_result($result);
    foreach ($oldPaymentIds as $oldPaymentId)
    {
      if (refreshSwishPayment($oldPaymentId) == 'CREATED')
      {
        swishCancelPaymentRequest($oldPaymentId);
        refreshSwishPayment($oldPaymentId);
      }
    }
    if (sqlFirstRow(sprintf("SELECT STATUS FROM INVOICES WHERE INVOICE_ID = %d", $invoice['INVOICE_ID']))['STATUS'] != 'UNPAID')
    {
      CommitDatabase();
      trigger_error('Fakturan är redan betald.', E_USER_ERROR);
    }

    // Saved before Swish is asked, so the callback finds the payment
    $paymentId = swishNewPaymentId();
    sqlQueryOrError(sprintf("INSERT INTO SWISH_PAYMENTS (PAYMENT_ID, INVOICE_ID, USER_ID, AMOUNT, STATUS, CRE_DATE, UPDATE_DATE) " .
                            "VALUES ('%s', %d, %d, %s, 'CREATED', NOW(), NOW())",
                            $paymentId, $invoice['INVOICE_ID'], $user_id, moneyString($left)));
    CommitDatabase();
    $response = swishCreatePaymentRequest($paymentId, $invoice['INVOICE_ID'], $left, $invoice['MESSAGE']);
    if ($response->status != 201)
    {
      sqlQueryOrError(sprintf("DELETE FROM SWISH_PAYMENTS WHERE PAYMENT_ID = '%s'", $paymentId));
      CommitDatabase();
      trigger_error(swishErrorText($response), E_USER_ERROR);
    }
    $rows->paymentId = $paymentId;
    $rows->amount = $left;
    $rows->token = isset($response->headers['paymentrequesttoken']) ? $response->headers['paymentrequesttoken'] : null;
    $rows->qrCode = is_null($rows->token) ? null : swishQrCode($rows->token);
    break;

  case 'SWISH_STATUS':
    $payment = loadMyPayment(isset($input->paymentId) ? $input->paymentId : '');
    if ($payment['STATUS'] == 'CREATED')
    {
      refreshSwishPayment($payment['PAYMENT_ID']);
    }
    $rows = paymentStatus($payment['PAYMENT_ID']);
    break;

  case 'SWISH_CANCEL':
    $payment = loadMyPayment(isset($input->paymentId) ? $input->paymentId : '');
    if ($payment['STATUS'] == 'CREATED')
    {
      swishCancelPaymentRequest($payment['PAYMENT_ID']);
      refreshSwishPayment($payment['PAYMENT_ID']);
    }
    $rows = paymentStatus($payment['PAYMENT_ID']);
    break;

  case 'OVERVIEW':
    $rows->canVerify = $isEconomy;
    $rows->swishEnabled = swishEnabled();
    $rows->batches = array();
    $batchIndex = array();
    $result = sqlQueryOrError("SELECT b.BATCH_ID, b.BATCH_TYPE, b.TITLE, b.MESSAGE_TEMPLATE, b.INVOICE_DATE, b.DUE_DATE, b.PERIOD_FROM, b.PERIOD_TO, " .
                              "  b.CRE_DATE, u.first_name, u.last_name " .
                              "FROM INVOICE_BATCHES b LEFT OUTER JOIN users u ON (b.CRE_BY_USER_ID = u.user_id) " .
                              "ORDER BY b.INVOICE_DATE DESC, b.BATCH_ID DESC");
    while ($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->batchId = intval($row['BATCH_ID']);
      $x->batchType = $row['BATCH_TYPE'];
      $x->title = $row['TITLE'];
      $x->messageTemplate = $row['MESSAGE_TEMPLATE'];
      $x->invoiceDate = $row['INVOICE_DATE'];
      $x->dueDate = $row['DUE_DATE'];
      $x->periodFrom = $row['PERIOD_FROM'];
      $x->periodTo = $row['PERIOD_TO'];
      $x->creDate = $row['CRE_DATE'];
      $x->createdBy = trim($row['first_name'] . ' ' . $row['last_name']);
      $x->invoices = array();
      $batchIndex[$x->batchId] = count($rows->batches);
      array_push($rows->batches, $x);
    }
    \db\mysql_free_result($result);
    foreach (loadInvoices($cINVOICE_SELECT . "ORDER BY i.RECIPIENT_NAME, i.INVOICE_ID") as $invoice)
    {
      if (isset($batchIndex[$invoice->batchId]))
      {
        array_push($rows->batches[$batchIndex[$invoice->batchId]]->invoices, $invoice);
      }
    }
    break;

  case 'HISTORY':
    $rows->history = array();
    $result = sqlQueryOrError(sprintf("SELECT h.OLD_STATUS, h.NEW_STATUS, h.OLD_PAID_AMOUNT, h.NEW_PAID_AMOUNT, h.COMMENT, h.SWISH_PAYMENT_ID, " .
                                      "  h.CHANGED_BY_USER_ID, h.CRE_DATE, u.first_name, u.last_name " .
                                      "FROM INVOICE_HISTORY h LEFT OUTER JOIN users u ON (h.CHANGED_BY_USER_ID = u.user_id) " .
                                      "WHERE h.INVOICE_ID = %d ORDER BY h.CRE_DATE, h.HISTORY_ID", inputInt($input, 'invoiceId')));
    while ($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->oldStatus = $row['OLD_STATUS'];
      $x->newStatus = $row['NEW_STATUS'];
      $x->oldPaidAmount = is_null($row['OLD_PAID_AMOUNT']) ? null : invoiceMoney($row['OLD_PAID_AMOUNT']);
      $x->newPaidAmount = invoiceMoney($row['NEW_PAID_AMOUNT']);
      $x->comment = $row['COMMENT'];
      $x->swishPaymentId = $row['SWISH_PAYMENT_ID'];
      $x->changedBy = is_null($row['CHANGED_BY_USER_ID']) ? null : trim($row['first_name'] . ' ' . $row['last_name']);
      $x->creDate = $row['CRE_DATE'];
      array_push($rows->history, $x);
    }
    \db\mysql_free_result($result);
    $rows->payments = array();
    $result = sqlQueryOrError(sprintf("SELECT s.PAYMENT_ID, s.AMOUNT, s.STATUS, s.PAYMENT_REFERENCE, s.PAYER_ALIAS, s.ERROR_CODE, s.ERROR_MESSAGE, " .
                                      "  s.CRE_DATE, s.DATE_PAID, u.first_name, u.last_name " .
                                      "FROM SWISH_PAYMENTS s LEFT OUTER JOIN users u ON (s.USER_ID = u.user_id) " .
                                      "WHERE s.INVOICE_ID = %d ORDER BY s.CRE_DATE", inputInt($input, 'invoiceId')));
    while ($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->paymentId = $row['PAYMENT_ID'];
      $x->amount = invoiceMoney($row['AMOUNT']);
      $x->status = $row['STATUS'];
      $x->paymentReference = $row['PAYMENT_REFERENCE'];
      $x->payerAlias = $row['PAYER_ALIAS'];
      $x->errorCode = $row['ERROR_CODE'];
      $x->errorMessage = $row['ERROR_MESSAGE'];
      $x->creDate = $row['CRE_DATE'];
      $x->datePaid = $row['DATE_PAID'];
      $x->startedBy = trim($row['first_name'] . ' ' . $row['last_name']);
      array_push($rows->payments, $x);
    }
    \db\mysql_free_result($result);
    break;

  case 'RECIPIENTS':
    $rows->users = array();
    $result = sqlQueryOrError("SELECT u.user_id, u.first_name, u.last_name, u.email, u.competitor_id, c.FAMILY_ID " .
                              "FROM users u LEFT OUTER JOIN RACE_COMPETITORS c ON (u.competitor_id = c.COMPETITOR_ID) " .
                              "ORDER BY u.last_name, u.first_name");
    while ($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->userId = intval($row['user_id']);
      $x->name = trim($row['first_name'] . ' ' . $row['last_name']);
      $x->email = $row['email'];
      $x->competitorId = is_null($row['competitor_id']) ? null : intval($row['competitor_id']);
      $x->familyId = is_null($row['FAMILY_ID']) ? null : intval($row['FAMILY_ID']);
      array_push($rows->users, $x);
    }
    \db\mysql_free_result($result);
    $rows->families = array();
    $result = sqlQueryOrError("SELECT f.FAMILY_ID, f.FAMILY_NAME, " .
                              "  GROUP_CONCAT(CONCAT(c.FIRST_NAME, ' ', c.LAST_NAME) ORDER BY c.BIRTHDAY SEPARATOR ', ') AS MEMBERS " .
                              "FROM RACE_FAMILIES f LEFT OUTER JOIN RACE_COMPETITORS c ON (f.FAMILY_ID = c.FAMILY_ID) " .
                              "GROUP BY f.FAMILY_ID, f.FAMILY_NAME ORDER BY f.FAMILY_NAME");
    while ($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->familyId = intval($row['FAMILY_ID']);
      $x->familyName = $row['FAMILY_NAME'];
      $x->members = is_null($row['MEMBERS']) ? '' : $row['MEMBERS'];
      array_push($rows->families, $x);
    }
    \db\mysql_free_result($result);
    // The competitors in the families, also families without any user (the linked users are in users, competitorId)
    $rows->familyCompetitors = array();
    $result = sqlQueryOrError("SELECT COMPETITOR_ID, FIRST_NAME, LAST_NAME, FAMILY_ID FROM RACE_COMPETITORS " .
                              "WHERE FAMILY_ID IS NOT NULL ORDER BY FAMILY_ID, BIRTHDAY");
    while ($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->competitorId = intval($row['COMPETITOR_ID']);
      $x->name = trim($row['FIRST_NAME'] . ' ' . $row['LAST_NAME']);
      $x->familyId = intval($row['FAMILY_ID']);
      array_push($rows->familyCompetitors, $x);
    }
    \db\mysql_free_result($result);
    break;

  case 'EVENT_FEE_PERIODS':
    $rows->periods = array();
    $result = sqlQueryOrError("SELECT BATCH_ID, TITLE, PERIOD_FROM, PERIOD_TO FROM INVOICE_BATCHES " .
                              "WHERE BATCH_TYPE = 'EVENT_FEES' AND PERIOD_TO IS NOT NULL ORDER BY PERIOD_TO");
    while ($row = \db\mysql_fetch_assoc($result))
    {
      $x = new stdClass();
      $x->batchId = intval($row['BATCH_ID']);
      $x->title = $row['TITLE'];
      $x->periodFrom = $row['PERIOD_FROM'];
      $x->periodTo = $row['PERIOD_TO'];
      array_push($rows->periods, $x);
    }
    \db\mysql_free_result($result);
    break;

  case 'CREATE':
    $batchType = isset($input->batchType) && $input->batchType === 'EVENT_FEES' ? 'EVENT_FEES' : 'GENERAL';
    $title = inputString($input, 'title', 128);
    $messageTemplate = inputString($input, 'messageTemplate', 128);
    $dueDate = inputDate($input, 'dueDate');
    $invoiceFee = inputMoney($input, 'invoiceFee', 0);
    $today = date('Y-m-d');
    if ($title == '' || $messageTemplate == '')
    {
      trigger_error('Rubrik och meddelande måste fyllas i.', E_USER_ERROR);
    }
    if (is_null($dueDate) || $dueDate < $today)
    {
      trigger_error('Förfallodatum måste vara idag eller senare.', E_USER_ERROR);
    }
    if ($invoiceFee < 0)
    {
      trigger_error('Fakturaavgiften kan inte vara negativ.', E_USER_ERROR);
    }
    $periodFrom = null;
    $periodTo = null;
    if ($batchType == 'EVENT_FEES')
    {
      $periodFrom = inputDate($input, 'periodFrom');
      $periodTo = inputDate($input, 'periodTo');
      if (is_null($periodFrom) || is_null($periodTo) || $periodFrom > $periodTo)
      {
        trigger_error('Perioden är felaktig.', E_USER_ERROR);
      }
      if ($periodTo > addDays($today, -2))
      {
        trigger_error('Perioden måste sluta senast ' . addDays($today, -2) . ' (minst två dagar sedan).', E_USER_ERROR);
      }
      // Locked until the batch is saved, so two can't invoice the same period at the same time
      $last = sqlFirstRow("SELECT MAX(PERIOD_TO) AS PERIOD_TO FROM INVOICE_BATCHES WHERE BATCH_TYPE = 'EVENT_FEES' FOR UPDATE");
      if (!is_null($last) && !is_null($last['PERIOD_TO']) && $periodFrom != addDays($last['PERIOD_TO'], 1))
      {
        trigger_error('Perioden måste börja ' . addDays($last['PERIOD_TO'], 1) . ', dagen efter den senast fakturerade perioden (inget överlapp eller glapp).', E_USER_ERROR);
      }
    }

    $recipients = array();
    $recipientKeys = array();
    if (isset($input->recipients) && is_array($input->recipients))
    {
      foreach ($input->recipients as $inputRecipient)
      {
        if (!is_object($inputRecipient))
        {
          continue;
        }
        $recipient = new stdClass();
        $recipient->userId = inputInt($inputRecipient, 'userId') > 0 ? inputInt($inputRecipient, 'userId') : null;
        $recipient->competitorId = inputInt($inputRecipient, 'competitorId') > 0 ? inputInt($inputRecipient, 'competitorId') : null;
        $recipient->familyId = inputInt($inputRecipient, 'familyId') > 0 ? inputInt($inputRecipient, 'familyId') : null;
        if ((is_null($recipient->userId) ? 0 : 1) + (is_null($recipient->competitorId) ? 0 : 1) + (is_null($recipient->familyId) ? 0 : 1) != 1)
        {
          trigger_error('En mottagare måste vara en användare, en löpare eller en familj.', E_USER_ERROR);
        }
        $key = (is_null($recipient->userId) ? '' : 'U' . $recipient->userId) . (is_null($recipient->competitorId) ? '' : 'C' . $recipient->competitorId) .
               (is_null($recipient->familyId) ? '' : 'F' . $recipient->familyId);
        if (isset($recipientKeys[$key]))
        {
          continue;
        }
        $recipientKeys[$key] = true;
        $recipient->name = recipientName($recipient);
        if (is_null($recipient->name))
        {
          trigger_error('Mottagaren finns inte (' . $key . ').', E_USER_ERROR);
        }
        $recipient->amount = inputMoney($inputRecipient, 'amount', -1);
        if ($recipient->amount < 0)
        {
          trigger_error('Beloppet saknas för ' . $recipient->name . '.', E_USER_ERROR);
        }
        $recipient->rows = array();
        if (isset($inputRecipient->rows) && is_array($inputRecipient->rows))
        {
          foreach ($inputRecipient->rows as $inputRow)
          {
            if (is_object($inputRow) && inputString($inputRow, 'description', 255) != '')
            {
              array_push($recipient->rows, $inputRow);
            }
          }
        }
        array_push($recipients, $recipient);
      }
    }
    if (count($recipients) == 0)
    {
      trigger_error('Välj minst en mottagare.', E_USER_ERROR);
    }

    sqlQueryOrError(sprintf("INSERT INTO INVOICE_BATCHES (BATCH_TYPE, TITLE, MESSAGE_TEMPLATE, INVOICE_DATE, DUE_DATE, PERIOD_FROM, PERIOD_TO, CRE_BY_USER_ID, CRE_DATE) " .
                            "VALUES ('%s', '%s', '%s', CURDATE(), '%s', %s, %s, %d, NOW())",
                            $batchType,
                            \db\mysql_real_escape_string($title),
                            \db\mysql_real_escape_string($messageTemplate),
                            $dueDate,
                            is_null($periodFrom) ? 'NULL' : "'" . $periodFrom . "'",
                            is_null($periodTo) ? 'NULL' : "'" . $periodTo . "'",
                            $user_id));
    $batchId = \db\mysql_insert_id();
    foreach ($recipients as $recipient)
    {
      sqlQueryOrError(sprintf("INSERT INTO INVOICES (BATCH_ID, USER_ID, COMPETITOR_ID, FAMILY_ID, RECIPIENT_NAME, MESSAGE, AMOUNT, INVOICE_FEE, STATUS, PAID_AMOUNT) " .
                              "VALUES (%d, %s, %s, %s, '%s', '%s', %s, %s, 'UNPAID', 0)",
                              $batchId,
                              is_null($recipient->userId) ? 'NULL' : $recipient->userId,
                              is_null($recipient->competitorId) ? 'NULL' : $recipient->competitorId,
                              is_null($recipient->familyId) ? 'NULL' : $recipient->familyId,
                              \db\mysql_real_escape_string($recipient->name),
                              \db\mysql_real_escape_string(invoiceMessage($messageTemplate, $recipient->name)),
                              moneyString($recipient->amount),
                              moneyString($invoiceFee)));
      $invoiceId = \db\mysql_insert_id();
      foreach ($recipient->rows as $sortOrder => $inputRow)
      {
        sqlQueryOrError(sprintf("INSERT INTO INVOICE_ROWS (INVOICE_ID, SORT_ORDER, DESCRIPTION, NUMBER_OF, TOTAL_FEE, AMOUNT) VALUES (%d, %d, '%s', %d, %s, %s)",
                                $invoiceId,
                                $sortOrder,
                                \db\mysql_real_escape_string(inputString($inputRow, 'description', 255)),
                                inputInt($inputRow, 'numberOf', 1),
                                moneyString(inputMoney($inputRow, 'totalFee', 0)),
                                moneyString(inputMoney($inputRow, 'amount', 0))));
      }
      addInvoiceHistory($invoiceId, null, 'UNPAID', null, 0, null, null, $user_id);
    }
    $rows->batchId = $batchId;
    $rows->numberOfInvoices = count($recipients);
    break;

  case 'SET_STATUS':
    $status = isset($input->status) && is_string($input->status) ? $input->status : '';
    if (!in_array($status, $cINVOICE_STATUSES, true))
    {
      trigger_error('Felaktig status.', E_USER_ERROR);
    }
    $invoiceIds = inputIds($input, 'invoiceIds');
    $paidAmount = inputMoney($input, 'paidAmount');
    $comment = inputString($input, 'comment', 255);
    if (count($invoiceIds) == 0)
    {
      trigger_error('Välj minst en faktura.', E_USER_ERROR);
    }
    if (!is_null($paidAmount) && $paidAmount < 0)
    {
      trigger_error('Det betalda beloppet kan inte vara negativt.', E_USER_ERROR);
    }
    foreach ($invoiceIds as $invoiceId)
    {
      $invoice = sqlFirstRow(sprintf("SELECT INVOICE_ID, RECIPIENT_NAME, STATUS, AMOUNT, INVOICE_FEE, PAID_AMOUNT FROM INVOICES WHERE INVOICE_ID = %d FOR UPDATE", $invoiceId));
      if (is_null($invoice))
      {
        trigger_error('Fakturan ' . $invoiceId . ' finns inte.', E_USER_ERROR);
      }
      $total = invoiceMoney($invoice['AMOUNT']) + invoiceMoney($invoice['INVOICE_FEE']);
      $oldPaid = invoiceMoney($invoice['PAID_AMOUNT']);
      switch ($status)
      {
        case 'PAID':
          $newPaid = is_null($paidAmount) ? $total : $paidAmount;
          if ($newPaid < $total)
          {
            trigger_error('Faktura ' . $invoiceId . ' (' . $invoice['RECIPIENT_NAME'] . '): betalt belopp är mindre än ' . moneyString($total) . '.', E_USER_ERROR);
          }
          $newStatus = $newPaid > $total ? 'OVERPAID' : 'PAID';
          break;
        case 'OVERPAID':
          $newPaid = is_null($paidAmount) ? $oldPaid : $paidAmount;
          if ($newPaid <= $total)
          {
            trigger_error('Faktura ' . $invoiceId . ' (' . $invoice['RECIPIENT_NAME'] . '): överbetalt belopp måste vara mer än ' . moneyString($total) . '.', E_USER_ERROR);
          }
          $newStatus = 'OVERPAID';
          break;
        case 'UNPAID':
          $newPaid = is_null($paidAmount) ? 0 : $paidAmount;
          if ($newPaid >= $total)
          {
            trigger_error('Faktura ' . $invoiceId . ' (' . $invoice['RECIPIENT_NAME'] . '): ej betald måste ha ett betalt belopp under ' . moneyString($total) . '.', E_USER_ERROR);
          }
          $newStatus = 'UNPAID';
          break;
        default:
          $newPaid = is_null($paidAmount) ? $oldPaid : $paidAmount;
          $newStatus = 'CANCELLED';
          break;
      }
      if ($newStatus == $invoice['STATUS'] && $newPaid == $oldPaid)
      {
        continue;
      }
      sqlQueryOrError(sprintf("UPDATE INVOICES SET STATUS = '%s', PAID_AMOUNT = %s, PAID_DATE = %s WHERE INVOICE_ID = %d",
                              $newStatus,
                              moneyString($newPaid),
                              $newPaid > 0 ? "COALESCE(PAID_DATE, NOW())" : "NULL",
                              $invoiceId));
      addInvoiceHistory($invoiceId, $invoice['STATUS'], $newStatus, $oldPaid, $newPaid, $comment, null, $user_id);
    }
    $rows->invoices = loadInvoices($cINVOICE_SELECT . "WHERE i.INVOICE_ID IN (" . implode(',', $invoiceIds) . ")");
    break;

  case 'REMIND':
    $invoiceIds = inputIds($input, 'invoiceIds');
    if (count($invoiceIds) == 0)
    {
      trigger_error('Välj minst en faktura.', E_USER_ERROR);
    }
    $rows->reminders = array();
    $result = sqlQueryOrError($cINVOICE_SELECT . "WHERE i.STATUS = 'UNPAID' AND i.INVOICE_ID IN (" . implode(',', $invoiceIds) . ")");
    $invoices = array();
    while ($row = \db\mysql_fetch_assoc($result))
    {
      array_push($invoices, $row);
    }
    \db\mysql_free_result($result);
    foreach ($invoices as $invoice)
    {
      $sentTo = sendInvoiceReminder($invoice);
      if (count($sentTo) > 0)
      {
        sqlQueryOrError(sprintf("UPDATE INVOICES SET REMINDERS = REMINDERS + 1, LAST_REMINDER_DATE = NOW() WHERE INVOICE_ID = %d", $invoice['INVOICE_ID']));
      }
      $x = new stdClass();
      $x->invoiceId = intval($invoice['INVOICE_ID']);
      $x->recipientName = $invoice['RECIPIENT_NAME'];
      $x->sentTo = $sentTo;
      array_push($rows->reminders, $x);
    }
    $rows->invoices = loadInvoices($cINVOICE_SELECT . "WHERE i.INVOICE_ID IN (" . implode(',', $invoiceIds) . ")");
    break;

  case 'DELETE_INVOICE':
    // invoiceIds (several) or invoiceId, nothing is deleted if one of them has a payment
    $invoiceIds = inputIds($input, 'invoiceIds');
    if (count($invoiceIds) == 0 && inputInt($input, 'invoiceId') > 0)
    {
      $invoiceIds = array(inputInt($input, 'invoiceId'));
    }
    if (count($invoiceIds) == 0)
    {
      trigger_error('Välj minst en faktura.', E_USER_ERROR);
    }
    $idList = implode(',', $invoiceIds);
    $batchIds = array();
    $numberOfInvoices = 0;
    $result = sqlQueryOrError("SELECT INVOICE_ID, BATCH_ID FROM INVOICES WHERE INVOICE_ID IN (" . $idList . ") FOR UPDATE");
    while ($row = \db\mysql_fetch_assoc($result))
    {
      $numberOfInvoices++;
      $batchIds[intval($row['BATCH_ID'])] = intval($row['BATCH_ID']);
    }
    \db\mysql_free_result($result);
    if ($numberOfInvoices != count($invoiceIds))
    {
      trigger_error('Fakturan finns inte.', E_USER_ERROR);
    }
    assertNothingPaid("i.INVOICE_ID IN (" . $idList . ")");
    sqlQueryOrError("DELETE FROM INVOICES WHERE INVOICE_ID IN (" . $idList . ")");
    // The batch goes too when its last invoice is deleted
    sqlQueryOrError("DELETE FROM INVOICE_BATCHES WHERE BATCH_ID IN (" . implode(',', $batchIds) . ") " .
                    "AND NOT EXISTS (SELECT 1 FROM INVOICES i WHERE i.BATCH_ID = INVOICE_BATCHES.BATCH_ID)");
    $rows->deleted = true;
    break;

  default:
    trigger_error('Felaktig parameter "iType".', E_USER_ERROR);
}

CloseDatabase();

header("Content-Type: application/json");
ini_set('precision', 20);
ini_set('serialize_precision', 14);
echo json_encode($rows);
?>
