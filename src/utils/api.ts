const RETRIES = 3;
const rxOne = /^[\],:{}\s]*$/;
const rxTwo = /\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})/g;
const rxThree = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g;
const rxFour = /(?:^|:|,)(?:\s*\[)+/g;
const isJSON = (input: string) =>
  input.length && rxOne.test(input.replace(rxTwo, '@').replace(rxThree, ']').replace(rxFour, ''));

export type FetchPhase = 'connecting' | 'waiting' | 'downloading' | 'parsing';

/** A request that failed, with what is needed to see where it went wrong */
export class FetchError extends Error {
  /** The HTTP status of the answer, undefined when no answer came */
  status?: number;
  statusText?: string;
  url: string;
  /** How far the request came */
  phase: FetchPhase;
  attempts: number;
  /** Where on the server it failed, when the server tells it */
  serverFile?: string;
  serverLine?: number;
  /** The server has already tried again, another attempt would only give the same error */
  noRetry?: boolean;

  constructor(
    message: string,
    values: Pick<FetchError, 'url' | 'phase' | 'attempts'> &
      Partial<Pick<FetchError, 'status' | 'statusText' | 'serverFile' | 'serverLine' | 'noRetry'>>
  ) {
    super(message);
    this.name = 'FetchError';
    this.url = values.url;
    this.phase = values.phase;
    this.attempts = values.attempts;
    this.status = values.status;
    this.statusText = values.statusText;
    this.serverFile = values.serverFile;
    this.serverLine = values.serverLine;
    this.noRetry = values.noRetry;
  }
}

const requestUrl = (input: RequestInfo) => (typeof input === 'string' ? input : input.url);
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);

/** The error of an answer that is not ok, with the message of the server when it sends one */
const responseError = (
  res: Response,
  json: { message?: string; phpFile?: string; phpLineNumber?: number } | undefined,
  input: RequestInfo,
  attempts: number
) =>
  new FetchError(
    json?.message ||
      `Bad response from server (HTTP ${res.status}${res.statusText ? ' ' + res.statusText : ''}) ${requestUrl(input)}`,
    {
      url: requestUrl(input),
      phase: 'waiting',
      attempts,
      status: res.status,
      statusText: res.statusText,
      serverFile: json?.phpFile,
      serverLine: json?.phpLineNumber
    }
  );

/** A failure without an answer, e.g. no network, keeps what is known of where it failed */
const toFetchError = (error: unknown, input: RequestInfo, phase: FetchPhase, attempts: number) =>
  error instanceof FetchError
    ? error
    : new FetchError(errorMessage(error), { url: requestUrl(input), phase, attempts });

const fetch_retry = async <T>(
  input: RequestInfo,
  init: RequestInit | undefined,
  throwError: boolean,
  n: number,
  attempt = 1
): Promise<T | undefined> => {
  let phase: FetchPhase = 'connecting';
  try {
    const res = await fetch(input, init);
    phase = 'downloading';
    const text = await res.text();
    phase = 'parsing';
    let json;

    if (isJSON(text)) {
      json = JSON.parse(text); // parses response to JSON
    }

    if (!res.ok) throw responseError(res, json, input, attempt);

    if (json) return json;
    return text as T;
  } catch (error) {
    if (n === 1 && throwError) throw toFetchError(error, input, phase, attempt);
    if (n === 1) return undefined;
    return fetch_retry<T>(input, init, throwError, n - 1, attempt + 1);
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
      body: JSON.stringify(data, (_, value) => (value === undefined ? null : value)) // body data type must match "Content-Type" header
    },
    throwError,
    retries
  );
}

/** What the proxy tells in stream mode, while it works on a large answer */
export interface IServerProgress {
  /** Eventor builds and sends the answer, the server reads the XML, or converts it to JSON */
  step: 'eventor' | 'parsing' | 'converting';
  /** Bytes the server has got from Eventor, and the size when Eventor tells it (0 otherwise) */
  downloaded?: number;
  total?: number;
  /** The size of the XML from Eventor */
  size?: number;
  /** The part being converted, e.g. the class of a result list, of total */
  index?: number;
  /** The attempt of the server to ask Eventor, and why the previous failed */
  attempt?: number;
  attempts?: number;
  previousError?: string;
  /** The work of an earlier attempt, that lost its connection, goes on */
  shared?: boolean;
}

export interface IFetchProgress {
  /** Waiting for the answer, the server telling how far it has come, downloading the answer or reading it */
  phase: 'waiting' | 'server' | 'downloading' | 'parsing';
  /** What the server is doing, in stream mode */
  server?: IServerProgress;
  /** Bytes downloaded so far */
  loaded: number;
  /** The size of the answer, null when the server does not tell it */
  total: number | null;
  attempt: number;
  attempts: number;
  /** Why the previous attempt failed, when this is a new attempt */
  previousError?: FetchError;
}

/**
 * The same as PostJsonData, but tells how far the request has come. Meant for the large answers, e.g. the
 * result list of an event with thousands of starters, where the download can be followed by the bytes.
 */
export async function PostJsonDataWithProgress<T>(
  url = '',
  data = {},
  throwError = true,
  requestHeaders = {},
  onProgress?: (progress: IFetchProgress) => void,
  retries = RETRIES
): Promise<T | undefined> {
  let previousError: FetchError | undefined;
  for (let attempt = 1; attempt <= retries; attempt++) {
    let phase: FetchPhase = 'connecting';
    // The phases of this attempt, a new attempt tells why the previous failed
    const report = (values: Pick<IFetchProgress, 'phase' | 'loaded' | 'total' | 'server'>) =>
      onProgress?.({ ...values, attempt, attempts: retries, previousError });
    try {
      report({ phase: 'waiting', loaded: 0, total: null });
      const res = await fetch(url, {
        method: 'POST',
        cache: 'no-cache',
        credentials: 'include',
        headers: {
          ...requestHeaders,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data, (_, value) => (value === undefined ? null : value))
      });

      phase = 'downloading';
      const length = Number(res.headers.get('Content-Length'));
      let total: number | null = Number.isFinite(length) && length > 0 ? length : null;
      let text = '';
      // In stream mode the proxy first tells how far it has come, line by line, then the answer or the error
      let mode: 'detect' | 'progress' | 'answer' | 'error' = 'detect';
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const parts: string[] = [];
        let pending = '';
        let loaded = 0;
        let reported = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (mode === 'answer' || mode === 'error') {
            loaded += value.byteLength;
            parts.push(chunk);
          } else {
            pending += chunk;
            if (mode === 'detect') {
              const start = pending.trimStart();
              if (!start) continue;
              if (start.startsWith('#')) {
                mode = 'progress';
                phase = 'waiting';
                total = null;
              } else {
                mode = 'answer';
              }
            }
            let newline = mode === 'progress' ? pending.indexOf('\n') : -1;
            while (newline >= 0) {
              const line = pending.slice(0, newline).trim();
              pending = pending.slice(newline + 1);
              if (line.startsWith('#progress ')) {
                try {
                  report({ phase: 'server', loaded: 0, total: null, server: JSON.parse(line.slice(10)) });
                } catch {
                  // A line that cannot be read is only a missed progress
                }
              } else if (line.startsWith('#result')) {
                mode = 'answer';
                phase = 'downloading';
                total = parseInt(line.slice(7).trim(), 10) || null;
              } else if (line.startsWith('#error')) {
                mode = 'error';
              }
              newline = mode === 'progress' ? pending.indexOf('\n') : -1;
            }
            if (mode !== 'progress' && pending) {
              loaded += pending.length;
              parts.push(pending);
              pending = '';
            }
          }
          // A compressed answer gives the compressed size, then the size is not known
          if (total != null && loaded > total) total = null;
          if (mode === 'answer' && Date.now() - reported > 200) {
            reported = Date.now();
            report({ phase: 'downloading', loaded, total });
          }
        }
        parts.push(decoder.decode());
        if (mode === 'progress')
          throw new FetchError('The server closed the connection before the answer was ready', {
            url,
            phase: 'waiting',
            attempts: attempt
          });
        phase = 'parsing';
        report({ phase: 'parsing', loaded, total });
        text = parts.join('');
      } else {
        text = await res.text();
        phase = 'parsing';
        report({ phase: 'parsing', loaded: text.length, total });
      }

      let json;
      try {
        json = text.length ? JSON.parse(text) : undefined;
      } catch {
        json = undefined;
      }

      if (!res.ok) throw responseError(res, json, url, attempt);
      if (mode === 'error')
        throw new FetchError(json?.message || text || 'Unknown error on the server', {
          url,
          phase: 'waiting',
          attempts: attempt,
          serverFile: json?.phpFile ?? undefined,
          serverLine: json?.phpLineNumber ?? undefined,
          noRetry: true
        });

      if (json !== undefined) return json as T;
      return text as T;
    } catch (error) {
      previousError = toFetchError(error, url, phase, attempt);
      if (attempt >= retries || previousError.noRetry) {
        if (throwError) throw previousError;
        return undefined;
      }
    }
  }
  return undefined;
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
    body: JSON.stringify(data, (_, value) => (value === undefined ? null : value)) // body data type must match "Content-Type" header
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
