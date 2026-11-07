import { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import { FetchError } from '../../utils/api';
import { loadWarningShort, toLoadWarning } from './LoadProgress';

// The key and the values, so that the test sees what is used
const t = ((key: string, values?: Record<string, unknown>) =>
  values ? `${key} ${JSON.stringify(values)}` : key) as unknown as TFunction;

describe('toLoadWarning', () => {
  it('tells the Eventor status, the url and a hint', () => {
    const error = new FetchError(
      'Proxy error: Failed with status code 404 after 1 attempt(s) for https://eventor.orientering.se/api/x',
      { url: 'proxy.php', phase: 'waiting', attempts: 3, status: 500, statusText: 'Internal Server Error' }
    );
    const warning = toLoadWarning(t, 'iofSplits', 'Result list', error, 'https://eventor.orientering.se/api/x');
    expect(warning.hint).toBe('results.LoadHintNotFound');
    expect(warning.url).toBe('https://eventor.orientering.se/api/x');
    expect(warning.details.join(' ')).toContain('Internal Server Error');
    expect(warning.details.join(' ')).toContain('results.LoadDetailEventorStatus {"status":404}');
    expect(warning.details.join(' ')).toContain('results.LoadDetailAttempts {"count":3}');
    expect(loadWarningShort(t, error)).toBe('results.LoadTaskFailed (HTTP 404)');
  });

  it('tells that there was no contact', () => {
    const error = new FetchError('Failed to fetch', { url: 'proxy.php', phase: 'connecting', attempts: 1 });
    expect(toLoadWarning(t, 'fees', 'Fees', error).hint).toBe('results.LoadHintNetwork');
    expect(loadWarningShort(t, error)).toBe('results.LoadTaskFailed');
  });

  it('tells an answer that is not a result list', () => {
    const warning = toLoadWarning(t, 'iof', 'IOF', new Error('Response is not a IOF XML, parsed to a json by proxy.'));
    expect(warning.hint).toBe('results.LoadHintNotIof');
    expect(warning.details).toEqual([]);
  });
});
