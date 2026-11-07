import { afterEach, describe, expect, it, vi } from 'vitest';
import { FetchError, IFetchProgress, PostJsonData, PostJsonDataWithProgress } from './api';

/** An answer that arrives in parts, as a large download does */
const streamedResponse = (body: string, parts: number, headers: Record<string, string> = {}, status = 200) => {
  const bytes = new TextEncoder().encode(body);
  const size = Math.ceil(bytes.length / parts);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += size) controller.enqueue(bytes.slice(i, i + size));
      controller.close();
    }
  });
  return new Response(stream, { status, headers });
};

describe('PostJsonDataWithProgress', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('tells the phases and returns the json', async () => {
    const body = JSON.stringify({ name: 'Åsa', list: Array.from({ length: 200 }, (_, i) => i) });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => streamedResponse(body, 4, { 'Content-Length': String(new TextEncoder().encode(body).length) }))
    );
    const phases: IFetchProgress[] = [];
    const json = await PostJsonDataWithProgress<{ name: string; list: number[] }>('x', {}, true, {}, p =>
      phases.push(p)
    );
    expect(json?.name).toBe('Åsa');
    expect(json?.list).toHaveLength(200);
    expect(phases[0].phase).toBe('waiting');
    expect(phases.at(-1)).toMatchObject({ phase: 'parsing', total: new TextEncoder().encode(body).length });
  });

  it('returns the text when the answer is not json', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => streamedResponse('<html>length</html>', 2))
    );
    expect(await PostJsonDataWithProgress<string>('x', {}, true)).toBe('<html>length</html>');
  });

  it('tries again, and throws the message of the server at last', async () => {
    const fetchMock = vi.fn(async () => streamedResponse(JSON.stringify({ message: 'Proxy error' }), 1, {}, 500));
    vi.stubGlobal('fetch', fetchMock);
    const attempts: number[] = [];
    await expect(
      PostJsonDataWithProgress('x', {}, true, {}, p => p.phase === 'waiting' && attempts.push(p.attempt), 2)
    ).rejects.toThrow('Proxy error');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(attempts).toEqual([1, 2]);
    // The second attempt tells why the first failed
    const previous: (IFetchProgress['previousError'] | undefined)[] = [];
    await PostJsonDataWithProgress('x', {}, false, {}, p => p.phase === 'waiting' && previous.push(p.previousError), 2);
    expect(previous[0]).toBeUndefined();
    expect(previous[1]).toMatchObject({ status: 500, attempts: 1, message: 'Proxy error' });
    // Without throwing, nothing is returned
    expect(await PostJsonDataWithProgress('x', {}, false, {}, undefined, 1)).toBeUndefined();
  });
});

describe('FetchError', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('tells the status, the attempts and the server message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        streamedResponse(
          JSON.stringify({
            message: 'Proxy error: Failed with status code 500',
            phpFile: '/x/proxy.php',
            phpLineNumber: 37
          }),
          1,
          {},
          500
        )
      )
    );
    const error = (await PostJsonDataWithProgress('x', {}, true, {}, undefined, 2).catch(e => e)) as FetchError;
    expect(error).toBeInstanceOf(FetchError);
    expect(error).toMatchObject({
      status: 500,
      attempts: 2,
      phase: 'waiting',
      serverFile: '/x/proxy.php',
      serverLine: 37
    });
    expect(error.message).toBe('Proxy error: Failed with status code 500');
  });

  it('tells that no answer came', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      })
    );
    const error = (await PostJsonData('x', {}, true, {}, 1).catch(e => e)) as FetchError;
    expect(error).toBeInstanceOf(FetchError);
    expect(error).toMatchObject({ status: undefined, phase: 'connecting', attempts: 1, message: 'Failed to fetch' });
  });
});

describe('PostJsonDataWithProgress in stream mode', () => {
  afterEach(() => vi.unstubAllGlobals());
  const body = JSON.stringify({ name: 'Åsa', list: Array.from({ length: 100 }, (_, i) => i) });
  const header =
    '#start ' +
    ' '.repeat(50) +
    '\n#progress {"step":"eventor","downloaded":0,"total":0,"attempt":1,"attempts":3}\n' +
    '#progress {"step":"eventor","attempt":2,"attempts":3,"previousError":"status code 502"}\n' +
    '#progress {"step":"converting","index":3,"total":10}\n';

  it('tells what the server does, and returns the answer', async () => {
    // Small parts, so that the lines are split between them
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => streamedResponse(header + `#result ${new TextEncoder().encode(body).length}\n` + body, 37))
    );
    const progress: IFetchProgress[] = [];
    const json = await PostJsonDataWithProgress<{ name: string; list: number[] }>('x', { stream: true }, true, {}, p =>
      progress.push(p)
    );
    expect(json?.name).toBe('Åsa');
    expect(json?.list).toHaveLength(100);
    const server = progress.filter(p => p.phase === 'server').map(p => p.server);
    expect(server).toEqual([
      { step: 'eventor', downloaded: 0, total: 0, attempt: 1, attempts: 3 },
      { step: 'eventor', attempt: 2, attempts: 3, previousError: 'status code 502' },
      { step: 'converting', index: 3, total: 10 }
    ]);
    expect(progress.at(-1)).toMatchObject({ phase: 'parsing', total: new TextEncoder().encode(body).length });
  });

  it('throws the error of the server, without asking again', async () => {
    const fetchMock = vi.fn(async () =>
      streamedResponse(
        header + '#error\n' + JSON.stringify({ message: 'Proxy error: Failed with status code 500', phpLineNumber: 9 }),
        5
      )
    );
    vi.stubGlobal('fetch', fetchMock);
    const error = (await PostJsonDataWithProgress('x', {}, true, {}, undefined, 8).catch(e => e)) as FetchError;
    expect(error).toBeInstanceOf(FetchError);
    expect(error).toMatchObject({ message: 'Proxy error: Failed with status code 500', serverLine: 9, noRetry: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('asks again when the connection is closed before the answer, and gets it', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => streamedResponse(header, 3))
      .mockImplementationOnce(async () =>
        streamedResponse(`#progress {"step":"eventor","shared":true}\n#result 0\n${body}`, 2)
      );
    vi.stubGlobal('fetch', fetchMock);
    const previous: (FetchError | undefined)[] = [];
    const json = await PostJsonDataWithProgress<{ name: string }>('x', {}, true, {}, p =>
      previous.push(p.previousError)
    );
    expect(json?.name).toBe('Åsa');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(previous.at(-1)?.message).toMatch(/closed the connection before the answer/);
  });
});
