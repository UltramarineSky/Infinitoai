(function(root, factory) {
  const exports = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports;
  }

  root.TmailorErrors = exports;
})(typeof globalThis !== 'undefined' ? globalThis : self, function() {
  function getErrorMessage(error) {
    return typeof error === 'string' ? error : error?.message || '';
  }

  function isTmailorApiCaptchaError(error) {
    const message = getErrorMessage(error);
    return /errorcaptcha/i.test(message);
  }

  function getTmailorApiManualTakeoverMessage() {
    return 'TMailor API triggered a Cloudflare captcha. Please open the TMailor page, complete the checkbox and Confirm manually, then continue.';
  }

  return {
    getTmailorApiManualTakeoverMessage,
    isTmailorApiCaptchaError,
  };
});
