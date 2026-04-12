(function(root, factory) {
  const exports = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports;
  }

  root.LoginVerificationCodes = exports;
})(typeof globalThis !== 'undefined' ? globalThis : self, function() {
  function normalizeVerificationCode(value) {
    const normalized = String(value || '').trim();
    return /^\d{6}$/.test(normalized) ? normalized : '';
  }

  function mergeLoginVerificationCodeExclusions({ signupCode = '', rejectedCodes = [] } = {}) {
    const merged = [];
    const seen = new Set();

    const pushCode = (value) => {
      const code = normalizeVerificationCode(value);
      if (!code || seen.has(code)) {
        return;
      }
      seen.add(code);
      merged.push(code);
    };

    pushCode(signupCode);
    for (const code of rejectedCodes) {
      pushCode(code);
    }

    return merged;
  }

  return {
    mergeLoginVerificationCodeExclusions,
    normalizeVerificationCode,
  };
});
