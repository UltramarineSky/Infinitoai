const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getTmailorApiManualTakeoverMessage,
  isTmailorApiCaptchaError,
} = require('../shared/tmailor-errors.js');

test('detects TMailor API captcha failures from explicit errorcaptcha responses', () => {
  assert.equal(isTmailorApiCaptchaError('TMailor newemail failed: errorcaptcha'), true);
  assert.equal(isTmailorApiCaptchaError('tmailor inbox poll failed: ERRORCAPTCHA'), true);
});

test('ignores unrelated TMailor API failures for captcha detection', () => {
  assert.equal(isTmailorApiCaptchaError('TMailor newemail failed: unknown_error'), false);
  assert.equal(isTmailorApiCaptchaError('TMailor API request failed (503).'), false);
});

test('manual takeover message tells the user to complete Cloudflare in the page', () => {
  assert.match(
    getTmailorApiManualTakeoverMessage(),
    /cloudflare captcha/i
  );
  assert.match(
    getTmailorApiManualTakeoverMessage(),
    /complete the checkbox and confirm/i
  );
});
