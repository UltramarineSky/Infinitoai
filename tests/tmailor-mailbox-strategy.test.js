const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getTmailorApiOnlyPollingMessage,
  shouldUseTmailorApiMailboxOnly,
} = require('../shared/tmailor-mailbox-strategy.js');

test('uses api-only mailbox strategy for TMailor when an access token is available', () => {
  assert.equal(
    shouldUseTmailorApiMailboxOnly({
      mailSource: 'tmailor-mail',
      accessToken: 'token-123',
    }),
    true
  );
});

test('does not use api-only mailbox strategy without a TMailor access token', () => {
  assert.equal(
    shouldUseTmailorApiMailboxOnly({
      mailSource: 'tmailor-mail',
      accessToken: '',
    }),
    false
  );
  assert.equal(
    shouldUseTmailorApiMailboxOnly({
      mailSource: 'qq-mail',
      accessToken: 'token-123',
    }),
    false
  );
});

test('api-only mailbox message explains why the page inbox is not being trusted', () => {
  assert.match(
    getTmailorApiOnlyPollingMessage('mi150lpcea@hetzez.com'),
    /mi150lpcea@hetzez\.com/i
  );
  assert.match(
    getTmailorApiOnlyPollingMessage('mi150lpcea@hetzez.com'),
    /avoid switching to a different inbox/i
  );
});
