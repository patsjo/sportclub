const RETRIES = 5;
const rxOne = /^[\],:{}\s]*$/;
const rxTwo = /\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})/g;
const rxThree = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g;
const rxFour = /(?:^|:|,)(?:\s*\[)+/g;
const isJSON = input =>
  input.length &&
  rxOne.test(
    input
      .replace(rxTwo, "@")
      .replace(rxThree, "]")
      .replace(rxFour, "")
  );

const isHTML = input =>
  input.length && (input.toUpperCase().indexOf("<HTML") === 0 || input.toUpperCase().indexOf("<!DOCTYPE HTML>") === 0);

const isHTMLError = input =>
  input.length &&
  (input.toUpperCase().indexOf("<TITLE>FELMEDDELANDE</TITLE>") >= 0 ||
    input.toUpperCase().indexOf("<TITLE>ERROR</TITLE>") >= 0);

const getHTMLError = input => {
  const bodyIndex = input.length && input.toUpperCase().indexOf("<BODY>");

  if (bodyIndex < 0) return undefined;

  return input
    .substr(bodyIndex)
    .replace(/<[^>]*>?/gm, "")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join("\n");
};

const fetch_retry = (url, options, throwError, n) =>
  fetch(url, options)
    .then(res => {
      if (!res.ok) {
        throw new Error("Bad response from server " + url);
      }
      return res.text();
    })
    .then(text => {
      if (!isJSON(text)) {
        if (isHTML(text)) {
          if (isHTMLError(text)) {
            n = 1;
            throw new Error(getHTMLError(text));
          }
          return text;
        }
        return undefined;
      }
      return JSON.parse(text); // parses response to JSON
    })
    .catch(error => {
      if (n === 1 && throwError) throw new Error(error.message);
      if (n === 1) return undefined;
      return fetch_retry(url, options, throwError, n - 1);
    });

export async function GetJsonData(url = "", throwError = true, requestHeaders = {}, retries = RETRIES) {
  // Default options are marked with *
  return fetch_retry(
    url,
    {
      method: "GET", // *GET, POST, PUT, DELETE, etc.
      // mode: "cors", // no-cors, cors, *same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "include", // include, *same-origin, omit
      headers: {
        ...requestHeaders,
        Accept: "application/json,text/html"
        // DONT USE "Content-Type": "application/x-www-form-urlencoded"
      }
      // redirect: "follow", // manual, *follow, error
      // referrer: "no-referrer" // no-referrer, *client
    },
    throwError,
    retries
  );
}
export async function PostJsonData(url = "", data = {}, throwError = true, requestHeaders = {}, retries = RETRIES) {
  const formData = new FormData();
  for (var key in data) {
    formData.append(key, data[key]);
  }

  // Default options are marked with *
  return fetch_retry(
    url,
    {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      // mode: "cors", // no-cors, cors, *same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "include", // include, *same-origin, omit
      headers: {
        ...requestHeaders,
        Accept: "application/json,text/html"
        // DONT USE "Content-Type": "application/x-www-form-urlencoded"
      },
      // redirect: "follow", // manual, *follow, error
      // referrer: "no-referrer", // no-referrer, *client
      body: formData // body data type must match "Content-Type" header
    },
    throwError,
    retries
  );
}
