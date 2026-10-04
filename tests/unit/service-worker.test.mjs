import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../service-worker.js', import.meta.url), 'utf8');
const cacheVersion = source.match(/const CACHE_VERSION\s*=\s*"([^"]+)"/)[1];

function offlineWorker(exactResponse) {
  const listeners = new Map(), fallbackRequests = [], cacheNames = [];
  const context = vm.createContext({
    URL,
    self: {
      location: {origin: 'https://example.test'},
      addEventListener: (name, handler) => listeners.set(name, handler),
      skipWaiting: () => {}
    },
    fetch: async () => {throw new Error('offline');},
    caches: {
      match: async () => exactResponse,
      open: async name => {
        cacheNames.push(name);
        return {match: async (path, options) => {
          fallbackRequests.push({path, ignoreSearch: options.ignoreSearch});
          return {body: 'current precached file'};
        }};
      }
    }
  });
  vm.runInContext(source, context);
  async function request(url) {
    let response;
    listeners.get('fetch')({request: {method: 'GET', mode: 'cors', url}, respondWith: value => {response = value;}});
    return response;
  }
  return {request, fallbackRequests, cacheNames};
}

test('cold offline versioned scripts and styles use only the current core files', async () => {
  const worker = offlineWorker();
  for (const file of ['official.js', 'official.css', 'theme.css']) {
    assert.equal((await worker.request('https://example.test/' + file + '?v=layout-restore')).body, 'current precached file');
  }
  assert.deepEqual(worker.fallbackRequests, [
    {path: '/official.js', ignoreSearch: true},
    {path: '/official.css', ignoreSearch: true},
    {path: '/theme.css', ignoreSearch: true}
  ]);
  assert.equal(worker.cacheNames.length, 3);
  assert.ok(worker.cacheNames.every(name => name === `${cacheVersion}-core`));
});

test('an exactly cached asset wins over the unversioned core fallback', async () => {
  const cached = {body: 'exact requested version'}, worker = offlineWorker(cached);
  assert.equal(await worker.request('https://example.test/app.js?v=exact'), cached);
  assert.deepEqual(worker.fallbackRequests, []);
});

test('offline query matching does not expand to data or other resources', async () => {
  const worker = offlineWorker();
  for (const path of ['/data/official-spots.json?revision=other', '/favicon.svg?v=other']) {
    await assert.rejects(worker.request('https://example.test' + path), /offline/);
  }
  assert.deepEqual(worker.fallbackRequests, []);
  assert.equal(await worker.request('https://another.test/official.js?v=other'), undefined);
});
