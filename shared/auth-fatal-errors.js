(function(root, factory) {
  const exports = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports;
  }

  root.AuthFatalErrors = exports;
})(typeof globalThis !== 'undefined' ? globalThis : self, function() {
  const FATAL_PATTERNS = [
    /糟糕，出错了/i,
    /验证过程中出错/i,
    /max_check_attempts/i,
    /请重试/i,
    /oops,\s*something\s*went\s*wrong/i,
    /something\s*went\s*wrong\s*during\s*verification/i,
    /try\s*again/i,
  ];

  function normalizeText(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function isAuthFatalErrorText(text) {
    const normalized = normalizeText(text);
    if (!normalized) {
      return false;
    }

    const hasFatalHeadline = /糟糕，出错了|oops,\s*something\s*went\s*wrong/i.test(normalized);
    const hasVerificationFailure = /验证过程中出错|max_check_attempts|something\s*went\s*wrong\s*during\s*verification/i.test(normalized);

    if (hasFatalHeadline && hasVerificationFailure) {
      return true;
    }

    return FATAL_PATTERNS.filter((pattern) => pattern.test(normalized)).length >= 2;
  }

  return {
    isAuthFatalErrorText,
  };
});
