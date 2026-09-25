import assert from 'node:assert/strict';
import test from 'node:test';
import { postAuthDestination } from '../src/lib/redirect.ts';

test('password recovery is the only permitted auth callback destination', () => {
  assert.equal(postAuthDestination('/update-password'), '/update-password');
  for (const next of [null, '/', '/admin', '//evil.example', '/\\evil.example', 'https://evil.example']) {
    assert.equal(postAuthDestination(next), '/');
  }
});
