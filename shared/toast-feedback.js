(function(root, factory) {
  const exports = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports;
  }

  root.ToastFeedback = exports;
})(typeof globalThis !== 'undefined' ? globalThis : self, function() {
  const TOAST_DURATIONS = {
    error: 4200,
    warn: 3600,
    success: 5000,
    info: 5000,
  };

  function canonicalizeToastMessage(message) {
    let text = String(message || '').trim();
    text = text.replace(/^\[[^\]]+\]\s*/, '');
    text = text.replace(/^Auto fetch failed:\s*/i, '');
    text = text.replace(/^Run \d+\/(?:\d+|∞) failed:\s*/i, '');
    text = text.replace(/^Step \d+ failed:\s*/i, '');
    return text.trim();
  }

  function getToastDuration(type, duration) {
    if (typeof duration === 'number') {
      return duration;
    }
    return TOAST_DURATIONS[type] || TOAST_DURATIONS.info;
  }

  function buildToastKey(message, type = 'info') {
    return `${type}:${canonicalizeToastMessage(message)}`;
  }

  return {
    buildToastKey,
    canonicalizeToastMessage,
    getToastDuration,
    TOAST_DURATIONS,
  };
});
