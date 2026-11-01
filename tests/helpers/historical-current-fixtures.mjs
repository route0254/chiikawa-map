import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// These exploration scenarios use a clock before this POP UP ended.
export async function withArchivedMachidaAsCurrentFixture(page) {
  const [current, archive] = await Promise.all(['official-spots.json', 'official-events-archive.json'].map(name =>
    readFile(new URL('../../data/' + name, import.meta.url), 'utf8').then(JSON.parse)
  ));
  const id = 'popup-2026-10-09-machida-modi';
  const fixture = [...current];
  if (!fixture.some(spot => spot.id === id)) {
    const archived = archive.find(spot => spot.id === id);
    assert(archived);
    fixture.push(archived);
  }
  await page.route('**/data/official-spots.json', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify(fixture)
  }));
  return fixture;
}
