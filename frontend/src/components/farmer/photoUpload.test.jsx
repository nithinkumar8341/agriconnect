import 'fake-indexeddb/auto';
import { act, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { changeLanguage } from '../../i18n/index.js';
import { createApiClient } from '../../lib/api.js';
import { findSmallEnough, TARGET_BYTES } from '../../lib/imageCompression.js';
import { listDrafts, resetDraftsForTests } from '../../lib/photoDrafts.js';
import { usePhotoUploads } from '../../hooks/usePhotoUploads.js';
import { renderApp, sellHandlers, signedInHandlers, testUsers } from '../../test/helpers.jsx';

// Image decoding needs a real browser; in jsdom the "compressed" photo is just a small blob.
vi.mock('../../lib/imageCompression.js', async (importOriginal) => ({
  ...(await importOriginal()),
  compressImage: vi.fn(async () => new Blob(['jpeg-bytes'], { type: 'image/jpeg' })),
}));

// A scriptable XMLHttpRequest stand-in: each upload waits until the test answers it.
function createFakeXhrServer() {
  const requests = [];
  class FakeXhr {
    constructor() {
      this.upload = {};
      this.headers = {};
      requests.push(this);
    }
    open(method, url) {
      this.method = method;
      this.url = url;
    }
    setRequestHeader(name, value) {
      this.headers[name] = value;
    }
    send(body) {
      this.body = body;
    }
    abort() {
      this.onabort?.();
    }
    progress(fraction) {
      this.upload.onprogress?.({ lengthComputable: true, loaded: fraction * 100, total: 100 });
    }
    respond(status, body) {
      this.status = status;
      this.responseText = JSON.stringify(body);
      this.onload();
    }
    fail() {
      this.onerror();
    }
  }
  return { requests, xhrFactory: () => new FakeXhr() };
}

let assetCount = 0;
const asset = () => {
  assetCount += 1;
  return {
    id: `asset${assetCount}`.padEnd(24, '0'),
    url: `/uploads/photos/a${assetCount}.jpg`,
    thumbnailUrl: `/uploads/photos/a${assetCount}-thumb.webp`,
    status: 'pending',
  };
};

const photoFile = (name = 'IMG_001.jpg') =>
  new File(['raw'], name, { type: 'image/jpeg', lastModified: Date.parse('2026-10-25T06:00:00Z') });

function setOnline(value) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value });
  window.dispatchEvent(new Event(value ? 'online' : 'offline'));
}

beforeAll(() => {
  // jsdom has no object URLs (and Node's own version rejects jsdom Blobs).
  URL.createObjectURL = () => 'blob:preview';
  URL.revokeObjectURL = () => {};
});

beforeEach(async () => {
  await resetDraftsForTests();
  indexedDB.deleteDatabase('agriconnect');
  setOnline(true);
});

describe('findSmallEnough (compression search)', () => {
  const fakeEncoder = (sizeFor) =>
    vi.fn(async (edge, quality) => ({ size: sizeFor(edge, quality) }));

  it('keeps the first quality that fits under 300 KB', async () => {
    const encode = fakeEncoder((edge, quality) => (quality > 0.7 ? 400_000 : 250_000));

    const result = await findSmallEnough(encode, { startEdge: 1280 });

    expect(result).toMatchObject({ edge: 1280, quality: 0.62 });
    expect(result.blob.size).toBeLessThanOrEqual(TARGET_BYTES);
  });

  it('shrinks the photo when no quality is small enough at full size', async () => {
    const encode = fakeEncoder((edge) => (edge > 1100 ? 900_000 : 200_000));

    const result = await findSmallEnough(encode, { startEdge: 1280 });

    expect(result.edge).toBe(1024);
  });

  it('gives up gracefully on a photo that never gets small enough', async () => {
    const encode = fakeEncoder(() => 5_000_000);

    const result = await findSmallEnough(encode, { startEdge: 1280 });

    expect(result.blob.size).toBe(5_000_000);
    expect(result.edge).toBeGreaterThanOrEqual(480);
  });
});

describe('api.upload', () => {
  it('sends the token, reports progress and returns the body', async () => {
    const { requests, xhrFactory } = createFakeXhrServer();
    const client = createApiClient({ xhrFactory, fetchImpl: vi.fn() });
    client.setAccessToken('token-1');
    const progress = [];

    const done = client.upload('/uploads/photos', new FormData(), {
      onProgress: (p) => progress.push(p),
    });
    requests[0].progress(0.5);
    requests[0].respond(201, { asset: { id: 'x' } });

    expect(await done).toEqual({ asset: { id: 'x' } });
    expect(requests[0]).toMatchObject({ method: 'POST', url: '/api/v1/uploads/photos' });
    expect(requests[0].headers.Authorization).toBe('Bearer token-1');
    expect(progress).toEqual([0.5]);
  });

  it('refreshes an expired token once and sends the upload again', async () => {
    const { requests, xhrFactory } = createFakeXhrServer();
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ accessToken: 'fresh', user: {} }),
    }));
    const client = createApiClient({ xhrFactory, fetchImpl });
    client.setAccessToken('stale');

    const done = client.upload('/uploads/photos', new FormData());
    requests[0].respond(401, { error: { code: 'TOKEN_EXPIRED' } });
    await waitFor(() => expect(requests).toHaveLength(2));
    requests[1].respond(201, { asset: { id: 'y' } });

    expect(await done).toEqual({ asset: { id: 'y' } });
    expect(requests[1].headers.Authorization).toBe('Bearer fresh');
  });

  it('reports a dropped connection as NETWORK_ERROR and server errors in the API shape', async () => {
    const { requests, xhrFactory } = createFakeXhrServer();
    const client = createApiClient({ xhrFactory, fetchImpl: vi.fn() });

    const dropped = client.upload('/uploads/photos', new FormData());
    requests[0].fail();
    await expect(dropped).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });

    const rejected = client.upload('/uploads/photos', new FormData());
    requests[1].respond(400, { error: { code: 'INVALID_IMAGE', message: 'nope' } });
    await expect(rejected).rejects.toMatchObject({ code: 'INVALID_IMAGE', status: 400 });
  });
});

describe('usePhotoUploads', () => {
  function setup({ sleep = vi.fn(async () => {}) } = {}) {
    const server = createFakeXhrServer();
    const client = createApiClient({ xhrFactory: server.xhrFactory, fetchImpl: vi.fn() });
    client.delete = vi.fn(async () => null);
    const hook = renderHook(() => usePhotoUploads({ client, sleep }));
    return { ...server, client, hook, sleep };
  }

  it('compresses, uploads with progress and remembers the uploaded photo', async () => {
    const { requests, hook } = setup();
    await waitFor(() => expect(hook.result.current.loaded).toBe(true));

    await act(() => hook.result.current.add([photoFile()]));
    await waitFor(() => expect(requests).toHaveLength(1));
    act(() => requests[0].progress(0.4));
    expect(hook.result.current.photos[0]).toMatchObject({ status: 'uploading', progress: 0.4 });

    const uploadedAsset = asset();
    await act(async () => requests[0].respond(201, { asset: uploadedAsset }));

    await waitFor(() => expect(hook.result.current.photos[0].status).toBe('uploaded'));
    expect(requests[0].body.get('capturedAt')).toBe('2026-10-25T06:00:00.000Z');
    const stored = await listDrafts();
    expect(stored[0]).toMatchObject({ status: 'uploaded', asset: uploadedAsset });
    expect(stored[0].blob).toBeUndefined();
  });

  it('keeps photos taken offline on the phone and uploads them when back online', async () => {
    setOnline(false);
    const { requests, hook } = setup();
    await waitFor(() => expect(hook.result.current.loaded).toBe(true));

    await act(() => hook.result.current.add([photoFile()]));

    expect(hook.result.current.photos[0].status).toBe('waiting');
    expect(requests).toHaveLength(0);
    expect((await listDrafts())[0]).toMatchObject({ status: 'waiting' });

    act(() => setOnline(true));
    await waitFor(() => expect(requests).toHaveLength(1));
    await act(async () => requests[0].respond(201, { asset: asset() }));
    await waitFor(() => expect(hook.result.current.photos[0].status).toBe('uploaded'));
  });

  it('resumes waiting photos after the app was closed and opened again', async () => {
    setOnline(false);
    const first = setup();
    await waitFor(() => expect(first.hook.result.current.loaded).toBe(true));
    await act(() => first.hook.result.current.add([photoFile()]));
    first.hook.unmount();

    setOnline(true);
    const second = setup();

    await waitFor(() => expect(second.requests).toHaveLength(1));
    expect(second.hook.result.current.photos).toHaveLength(1);
  });

  it('retries automatically on a server hiccup, then lets the person retry by hand', async () => {
    const { requests, hook, sleep } = setup();
    await waitFor(() => expect(hook.result.current.loaded).toBe(true));
    await act(() => hook.result.current.add([photoFile()]));

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await waitFor(() => expect(requests).toHaveLength(attempt + 1));
      await act(async () => requests[attempt].respond(500, { error: { code: 'INTERNAL_ERROR' } }));
    }
    await waitFor(() => expect(hook.result.current.photos[0].status).toBe('failed'));
    expect(sleep).toHaveBeenCalledTimes(2);

    act(() => hook.result.current.retry(hook.result.current.photos[0].id));
    await waitFor(() => expect(requests).toHaveLength(4));
    await act(async () => requests[3].respond(201, { asset: asset() }));
    await waitFor(() => expect(hook.result.current.photos[0].status).toBe('uploaded'));
  });

  it('does not retry a photo the server rejected as not an image', async () => {
    const { requests, hook } = setup();
    await waitFor(() => expect(hook.result.current.loaded).toBe(true));
    await act(() => hook.result.current.add([photoFile()]));
    await waitFor(() => expect(requests).toHaveLength(1));

    await act(async () => requests[0].respond(400, { error: { code: 'INVALID_IMAGE' } }));

    await waitFor(() =>
      expect(hook.result.current.photos[0]).toMatchObject({
        status: 'failed',
        errorCode: 'INVALID_IMAGE',
      }),
    );
    expect(requests).toHaveLength(1);
  });

  it('removes a photo from the phone and the server', async () => {
    const { requests, hook, client } = setup();
    await waitFor(() => expect(hook.result.current.loaded).toBe(true));
    await act(() => hook.result.current.add([photoFile()]));
    await waitFor(() => expect(requests).toHaveLength(1));
    const uploadedAsset = asset();
    await act(async () => requests[0].respond(201, { asset: uploadedAsset }));
    await waitFor(() => expect(hook.result.current.photos[0].status).toBe('uploaded'));

    await act(() => hook.result.current.remove(hook.result.current.photos[0].id));

    expect(client.delete).toHaveBeenCalledWith(`/uploads/photos/${uploadedAsset.id}`);
    expect(hook.result.current.photos).toHaveLength(0);
    expect(await listDrafts()).toHaveLength(0);
  });

  it('accepts at most 5 photos', async () => {
    setOnline(false);
    const { hook } = setup();
    await waitFor(() => expect(hook.result.current.loaded).toBe(true));

    await act(() =>
      hook.result.current.add(Array.from({ length: 7 }, (_, i) => photoFile(`${i}.jpg`))),
    );

    expect(hook.result.current.photos).toHaveLength(5);
    expect(hook.result.current.canAddMore).toBe(false);
  });
});

describe('Sell screen photo step', () => {
  beforeEach(() => changeLanguage('en'));

  it('opens from the Sell tile with camera and gallery buttons', async () => {
    renderApp('/farmer/sell', sellHandlers(signedInHandlers(testUsers.farmer)));

    expect(
      await screen.findByRole('heading', { name: 'Photos of your produce' }),
    ).toBeInTheDocument();
    const camera = screen.getByLabelText('Take photo');
    expect(camera).toHaveAttribute('capture', 'environment');
    expect(camera).toHaveAttribute('accept', 'image/*');
    expect(screen.getByLabelText('Choose from gallery')).not.toHaveAttribute('capture');
  });

  it('shows a photo taken offline as waiting, with an explanation, in Telugu', async () => {
    await changeLanguage('te');
    setOnline(false);
    const user = userEvent.setup();
    renderApp('/farmer/sell', sellHandlers(signedInHandlers(testUsers.farmer)));

    await user.upload(await screen.findByLabelText('ఫోటో తీయండి'), photoFile());

    const photos = screen.getByRole('region', { name: /ఫోటో/ });
    const tile = (await within(photos).findAllByRole('listitem'))[0];
    expect(within(tile).getByRole('status')).toHaveTextContent('ఇంటర్నెట్ కోసం వేచి ఉంది');
    expect(screen.getByText(/ఫోటోలు ఈ ఫోన్‌లో సేవ్ అయ్యాయి/)).toBeInTheDocument();
  });
});
