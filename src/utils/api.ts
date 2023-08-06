const RETRIES = 3;
const rxOne = /^[\],:{}\s]*$/;
const rxTwo = /\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})/g;
const rxThree = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g;
const rxFour = /(?:^|:|,)(?:\s*\[)+/g;
const isJSON = (input: string) =>
  input.length && rxOne.test(input.replace(rxTwo, '@').replace(rxThree, ']').replace(rxFour, ''));

const fetch_retry = async (
  input: RequestInfo,
  init: RequestInit | undefined,
  throwError: boolean,
  n: number
): Promise<any> => {
  try {
    const res = await fetch(input, init);
    const text = await res.text();
    let json;

    if (isJSON(text)) {
      json = JSON.parse(text); // parses response to JSON
    }

    if (!res.ok) {
      if (json?.message) throw new Error(json.message);
      throw new Error('Bad response from server ' + input);
    }

    if (json) return json;
    return text;
  } catch (error: any) {
    if (n === 1 && throwError) throw new Error(error?.message);
    if (n === 1) return undefined;
    return fetch_retry(input, init, throwError, n - 1);
  }
};

export async function GetJsonData(url = '', throwError = true, requestHeaders = {}, retries = RETRIES) {
  // Default options are marked with *
  return fetch_retry(
    url,
    {
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
      // mode: "cors", // no-cors, cors, *same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'include', // include, *same-origin, omit
      headers: {
        ...requestHeaders,
        Accept: 'application/json',
      },
      // redirect: "follow", // manual, *follow, error
      // referrer: "no-referrer" // no-referrer, *client
    },
    throwError,
    retries
  );
}
export async function PostJsonData(url = '', data = {}, throwError = true, requestHeaders = {}, retries = RETRIES) {
  // Default options are marked with *
  return fetch_retry(
    url,
    {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      // mode: "cors", // no-cors, cors, *same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'include', // include, *same-origin, omit
      headers: {
        ...requestHeaders,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      // redirect: "follow", // manual, *follow, error
      // referrer: "no-referrer", // no-referrer, *client
      body: JSON.stringify(data), // body data type must match "Content-Type" header
    },
    throwError,
    retries
  );
}
