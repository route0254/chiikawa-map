import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const workflow = readFileSync(new URL('../../.github/workflows/check-links.yml', import.meta.url), 'utf8');
const followup = workflow.slice(workflow.indexOf('  nagano:'));
const expression = followup.match(/if: \$\{\{ ([^\r\n]+) \}\}/)[1];
const enabled = (result, cancelled = false) => vm.runInNewContext(expression, {
  needs: { check: { result } }, cancelled: () => cancelled
});

test('Nagano runs after link success or failure and stops for cancellation or skipped checks', () => {
  assert.match(followup, /needs: check/);
  assert.match(expression, /!cancelled\(\)/);
  assert.equal(enabled('success'), true);
  assert.equal(enabled('failure'), true);
  for (const status of ['cancelled', 'skipped']) assert.equal(enabled(status), false);
  for (const status of ['success', 'failure', 'cancelled', 'skipped']) assert.equal(enabled(status, true), false);
});

test('link failure remains failure and the manual negative test is explicit and opt-in', () => {
  assert.doesNotMatch(workflow, /continue-on-error/);
  assert.match(workflow, /verify_link_failure:[\s\S]*?type: boolean[\s\S]*?default: false/);
  assert.match(workflow, /if: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.verify_link_failure \}\}\s+run: exit 1/);
  assert.match(workflow, /run: node scripts\/check-links\.mjs/);
  assert.match(followup, /run: node scripts\/import-nagano-official-series\.mjs --check/);
  assert.doesNotMatch(followup, /--write/);
});
