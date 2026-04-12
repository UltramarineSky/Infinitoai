const test = require('node:test');
const assert = require('node:assert/strict');

const {
  mergeLoginVerificationCodeExclusions,
} = require('../shared/login-verification-codes.js');

test('mergeLoginVerificationCodeExclusions combines the used signup code with rejected login codes uniquely', () => {
  assert.deepEqual(
    mergeLoginVerificationCodeExclusions({
      signupCode: '123456',
      rejectedCodes: ['654321', '123456', '999000'],
    }),
    ['123456', '654321', '999000']
  );
});

test('mergeLoginVerificationCodeExclusions ignores malformed values', () => {
  assert.deepEqual(
    mergeLoginVerificationCodeExclusions({
      signupCode: 'not-a-code',
      rejectedCodes: ['654321', 'bad', '', null],
    }),
    ['654321']
  );
});
