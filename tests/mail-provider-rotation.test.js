const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MAIL_PROVIDER_ROTATION_LIMIT,
  MAIL_PROVIDER_ROTATION_WINDOW_MS,
  chooseMailProviderForAutoRun,
  getNextMailProviderAvailabilityTimestamp,
  getConfiguredRotatableMailProviders,
  isRotatableMailProvider,
  pruneMailProviderUsage,
  recordMailProviderUsage,
} = require('../shared/mail-provider-rotation.js');

test('isRotatableMailProvider only accepts 163 and qq', () => {
  assert.equal(isRotatableMailProvider('163'), true);
  assert.equal(isRotatableMailProvider('qq'), true);
  assert.equal(isRotatableMailProvider('inbucket'), false);
  assert.equal(isRotatableMailProvider('duck'), false);
});

test('getConfiguredRotatableMailProviders returns only 163 and qq groups with domains', () => {
  assert.deepEqual(
    getConfiguredRotatableMailProviders({
      '163': { emailDomain: 'alpha.33mail.com' },
      qq: { emailDomain: 'beta.33mail.com' },
      inbucket: { emailDomain: 'ignored.test' },
    }),
    ['163', 'qq']
  );

  assert.deepEqual(
    getConfiguredRotatableMailProviders({
      '163': { emailDomain: '' },
      qq: { emailDomain: 'beta.33mail.com' },
    }),
    ['qq']
  );
});

test('chooseMailProviderForAutoRun keeps current provider when auto rotate is disabled', () => {
  assert.equal(
    chooseMailProviderForAutoRun({
      autoRotateMailProvider: false,
      currentProvider: 'qq',
      lastProvider: '163',
      mailDomainSettings: {
        '163': { emailDomain: 'alpha.33mail.com' },
        qq: { emailDomain: 'beta.33mail.com' },
      },
    }),
    'qq'
  );
});

test('recordMailProviderUsage appends usage for the provider and prunes expired entries', () => {
  const now = 1_000_000;
  const usage = recordMailProviderUsage(
    {
      '163': [now - MAIL_PROVIDER_ROTATION_WINDOW_MS - 1, now - 1000],
      qq: [],
    },
    '163',
    now
  );

  assert.deepEqual(usage, {
    '163': [now - 1000, now],
    qq: [],
  });
});

test('pruneMailProviderUsage removes entries outside the 30 minute window', () => {
  const now = 2_000_000;
  assert.deepEqual(
    pruneMailProviderUsage(
      {
        '163': [now - MAIL_PROVIDER_ROTATION_WINDOW_MS - 10, now - 5000],
        qq: [now - MAIL_PROVIDER_ROTATION_WINDOW_MS + 1],
      },
      now
    ),
    {
      '163': [now - 5000],
      qq: [now - MAIL_PROVIDER_ROTATION_WINDOW_MS + 1],
    }
  );
});

test('chooseMailProviderForAutoRun keeps using the current provider before it reaches the limit', () => {
  const mailDomainSettings = {
    '163': { emailDomain: 'alpha.33mail.com' },
    qq: { emailDomain: 'beta.33mail.com' },
  };
  const currentUsage = {
    '163': Array.from({ length: MAIL_PROVIDER_ROTATION_LIMIT - 1 }, (_, index) => 1000 + index),
    qq: [],
  };

  assert.equal(
    chooseMailProviderForAutoRun({
      autoRotateMailProvider: true,
      currentProvider: '163',
      lastProvider: null,
      mailDomainSettings,
      usageState: currentUsage,
      now: 10_000,
    }),
    '163'
  );
});

test('chooseMailProviderForAutoRun switches to the other provider after current group reaches the limit', () => {
  const mailDomainSettings = {
    '163': { emailDomain: 'alpha.33mail.com' },
    qq: { emailDomain: 'beta.33mail.com' },
  };
  const exhaustedUsage = {
    '163': Array.from({ length: MAIL_PROVIDER_ROTATION_LIMIT }, (_, index) => 2000 + index),
    qq: [3000],
  };

  assert.equal(
    chooseMailProviderForAutoRun({
      autoRotateMailProvider: true,
      currentProvider: '163',
      lastProvider: '163',
      mailDomainSettings,
      usageState: exhaustedUsage,
      now: 10_000,
    }),
    'qq'
  );
});

test('chooseMailProviderForAutoRun can rotate back after the old usage window expires', () => {
  const now = 3_000_000;
  assert.equal(
    chooseMailProviderForAutoRun({
      autoRotateMailProvider: true,
      currentProvider: 'qq',
      lastProvider: 'qq',
      mailDomainSettings: {
        '163': { emailDomain: 'alpha.33mail.com' },
        qq: { emailDomain: 'beta.33mail.com' },
      },
      usageState: {
        '163': Array.from({ length: MAIL_PROVIDER_ROTATION_LIMIT }, (_, index) => now - MAIL_PROVIDER_ROTATION_WINDOW_MS - 100 - index),
        qq: [now - 1000],
      },
      now,
    }),
    'qq'
  );
});

test('chooseMailProviderForAutoRun falls back to the only configured group', () => {
  assert.equal(
    chooseMailProviderForAutoRun({
      autoRotateMailProvider: true,
      currentProvider: 'qq',
      lastProvider: 'qq',
      mailDomainSettings: {
        '163': { emailDomain: 'alpha.33mail.com' },
        qq: { emailDomain: '' },
      },
    }),
    '163'
  );
});

test('chooseMailProviderForAutoRun falls back to current preferred provider when no group is configured', () => {
  assert.equal(
    chooseMailProviderForAutoRun({
      autoRotateMailProvider: true,
      currentProvider: 'qq',
      lastProvider: '163',
      mailDomainSettings: {
        '163': { emailDomain: '' },
        qq: { emailDomain: '' },
      },
    }),
    'qq'
  );
});

test('getNextMailProviderAvailabilityTimestamp returns the earliest reusable time across configured groups', () => {
  const now = 4_000_000;
  const oldest163 = now - MAIL_PROVIDER_ROTATION_WINDOW_MS + 5_000;
  const oldestQq = now - MAIL_PROVIDER_ROTATION_WINDOW_MS + 12_000;

  assert.equal(
    getNextMailProviderAvailabilityTimestamp({
      mailDomainSettings: {
        '163': { emailDomain: 'alpha.33mail.com' },
        qq: { emailDomain: 'beta.33mail.com' },
      },
      usageState: {
        '163': Array.from({ length: MAIL_PROVIDER_ROTATION_LIMIT }, (_, index) => oldest163 + index),
        qq: Array.from({ length: MAIL_PROVIDER_ROTATION_LIMIT }, (_, index) => oldestQq + index),
      },
      now,
    }),
    oldest163 + MAIL_PROVIDER_ROTATION_WINDOW_MS
  );
});

test('getNextMailProviderAvailabilityTimestamp returns null when at least one configured group is still available', () => {
  const now = 5_000_000;

  assert.equal(
    getNextMailProviderAvailabilityTimestamp({
      mailDomainSettings: {
        '163': { emailDomain: 'alpha.33mail.com' },
        qq: { emailDomain: 'beta.33mail.com' },
      },
      usageState: {
        '163': Array.from({ length: MAIL_PROVIDER_ROTATION_LIMIT }, (_, index) => now - 1000 - index),
        qq: [now - 500],
      },
      now,
    }),
    null
  );
});
