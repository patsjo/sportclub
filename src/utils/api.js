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

const decodeHeaders = base64Headers =>
  base64Headers === undefined
    ? {}
    : JSON.parse("{" + atob(base64Headers) + "}");

const fetch_retry = (url, options, n) =>
  fetch(url, options)
    .then(res => {
      if (!res.ok) {
        throw new Error("Bad response from server " + url);
      }
      return res.text();
    })
    .then(text => {
      if (!isJSON(text)) {
        throw new Error("Empty response from server " + url);
      }
      return JSON.parse(text); // parses response to JSON
    })
    .catch(error => {
      if (n === 1) return undefined;
      return fetch_retry(url, options, n - 1);
    });

export async function GetJsonData(url = "", base64headers = undefined) {
  const requestHeaders = decodeHeaders(base64headers);
  // Default options are marked with *
  return fetch_retry(
    url,
    {
      method: "GET", // *GET, POST, PUT, DELETE, etc.
      // mode: "cors", // no-cors, cors, *same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      // credentials: "same-origin", // include, *same-origin, omit
      headers: requestHeaders
      // redirect: "follow", // manual, *follow, error
      // referrer: "no-referrer" // no-referrer, *client
    },
    RETRIES
  );
}
export async function PostJsonData(
  url = "",
  data = {},
  base64headers = undefined
) {
  const requestHeaders = decodeHeaders(base64headers);
  // Default options are marked with *
  return fetch_retry(
    url,
    {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      // mode: "cors", // no-cors, cors, *same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      // credentials: "same-origin", // include, *same-origin, omit
      headers: requestHeaders,
      // redirect: "follow", // manual, *follow, error
      // referrer: "no-referrer", // no-referrer, *client
      body: JSON.stringify(data) // body data type must match "Content-Type" header
    },
    RETRIES
  );
}
