import { act, renderHook, waitFor } from '@testing-library/react';
import { useApiRequest } from './useApiRequest.js';

function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('useApiRequest', () => {
  it('reports loading, then the data', async () => {
    const { result } = renderHook(() => useApiRequest(async () => ['tomato'], 'list'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual(['tomato']));
    expect(result.current.loading).toBe(false);
  });

  it('reports errors and loads again on reload', async () => {
    let calls = 0;
    const load = async () => {
      calls += 1;
      if (calls === 1) throw new Error('offline');
      return 'ok';
    };
    const { result } = renderHook(() => useApiRequest(load, 'thing'));
    await waitFor(() => expect(result.current.error?.message).toBe('offline'));

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.data).toBe('ok'));
    expect(result.current.error).toBeNull();
  });

  it('cancels the old request when the key changes, so a late answer is ignored', async () => {
    const slow = deferred();
    const signals = [];
    const load = (id) => (signal) => {
      signals.push(signal);
      return id === 1 ? slow.promise : Promise.resolve('second');
    };
    const { result, rerender } = renderHook(({ id }) => useApiRequest(load(id), `item:${id}`), {
      initialProps: { id: 1 },
    });

    rerender({ id: 2 });
    await waitFor(() => expect(result.current.data).toBe('second'));
    slow.resolve('first');
    await act(() => slow.promise);

    expect(signals[0].aborted).toBe(true);
    expect(result.current.data).toBe('second');
  });
});
