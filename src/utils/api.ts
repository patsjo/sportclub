const RETRIES = 3;
const rxOne = /^[\],:{}\s]*$/;
const rxTwo = /\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})/g;
const rxThree = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g;
const rxFour = /(?:^|:|,)(?:\s*\[)+/g;
const isJSON = (input: string) =>
  input.length && rxOne.test(input.replace(rxTwo, '@').replace(rxThree, ']').replace(rxFour, ''));

const fetch_retry = async <T>(
  input: RequestInfo,
  init: RequestInit | undefined,
  throwError: boolean,
  n: number
): Promise<T | undefined> => {
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
    return text as T;
  } catch (error) {
    if (n === 1 && throwError) throw new Error((error as { message: string } | undefined)?.message);
    if (n === 1) return undefined;
    return fetch_retry<T>(input, init, throwError, n - 1);
  }
};

export async function GetJsonData<T>(url = '', throwError = true, requestHeaders = {}, retries = RETRIES) {
  // Default options are marked with *
  return fetch_retry<T>(
    url,
    {
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
      // mode: "cors", // no-cors, cors, *same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'include', // include, *same-origin, omit
      headers: {
        ...requestHeaders,
        Accept: 'application/json'
      }
      // redirect: "follow", // manual, *follow, error
      // referrer: "no-referrer" // no-referrer, *client
    },
    throwError,
    retries
  );
}

export async function PostJsonData<T>(url = '', data = {}, throwError = true, requestHeaders = {}, retries = RETRIES) {
  // Default options are marked with *
  return fetch_retry<T>(
    url,
    {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      // mode: "cors", // no-cors, cors, *same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'include', // include, *same-origin, omit
      headers: {
        ...requestHeaders,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      // redirect: "follow", // manual, *follow, error
      // referrer: "no-referrer", // no-referrer, *client
      body: JSON.stringify(data) // body data type must match "Content-Type" header
    },
    throwError,
    retries
  );
}

export async function DownloadData(
  fileName: string,
  url: string,
  data: Record<string, unknown> = {},
  requestHeaders: Record<string, string> = {}
) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    // mode: "cors", // no-cors, cors, *same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'include', // include, *same-origin, omit
    headers: {
      ...requestHeaders,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    // redirect: "follow", // manual, *follow, error
    // referrer: "no-referrer", // no-referrer, *client
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  });

  if (!response) {
    throw new Error(`Failed to fetch the file: ${fileName}`);
  }

  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = fileName;

  // Ensure the link is not added to the DOM
  link.style.display = 'none';

  // Add the link to the document body
  document.body.appendChild(link);

  // Trigger a click event to start the download
  link.click();

  // Remove the link from the DOM after the download is initiated
  document.body.removeChild(link);
}
