const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildToastKey,
  canonicalizeToastMessage,
  getToastDuration,
  TOAST_DURATIONS,
} = require('../shared/toast-feedback.js');

test('canonicalizeToastMessage removes repeated step and run failure prefixes', () => {
  assert.equal(
    canonicalizeToastMessage('[signup-page] Step 7 failed: Could not find verification code input.'),
    'Could not find verification code input.'
  );

  assert.equal(
    canonicalizeToastMessage('Run 1/5 failed: Could not find verification code input.'),
    'Could not find verification code input.'
  );
});

test('canonicalizeToastMessage keeps unrelated messages intact', () => {
  assert.equal(
    canonicalizeToastMessage('验证码错误，请返回邮箱刷新'),
    '验证码错误，请返回邮箱刷新'
  );
});

test('getToastDuration uses type defaults unless overridden', () => {
  assert.equal(getToastDuration('error'), TOAST_DURATIONS.error);
  assert.equal(getToastDuration('warn'), TOAST_DURATIONS.warn);
  assert.equal(getToastDuration('success', 3200), 3200);
});

test('buildToastKey merges repeated step error variants into one key', () => {
  assert.equal(
    buildToastKey('[signup-page] Step 7 failed: Could not find verification code input.', 'error'),
    buildToastKey('Run 1/5 failed: Could not find verification code input.', 'error')
  );
});
