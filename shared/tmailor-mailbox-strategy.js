(function(root, factory) {
  const exports = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports;
  }

  root.TmailorMailboxStrategy = exports;
})(typeof globalThis !== 'undefined' ? globalThis : self, function() {
  function normalizeToken(value) {
    return String(value || '').trim();
  }

  function shouldUseTmailorApiMailboxOnly({ mailSource = '', accessToken = '' } = {}) {
    return String(mailSource || '').trim().toLowerCase() === 'tmailor-mail'
      && normalizeToken(accessToken).length > 0;
  }

  function getTmailorApiOnlyPollingMessage(targetEmail = '') {
    const email = String(targetEmail || '').trim();
    if (email) {
      return `TMailor API mailbox is locked to ${email}. Skipping page-open and DOM fallback to avoid switching to a different inbox.`;
    }
    return 'TMailor API mailbox is locked to the current access token. Skipping page-open and DOM fallback to avoid switching to a different inbox.';
  }

  return {
    getTmailorApiOnlyPollingMessage,
    shouldUseTmailorApiMailboxOnly,
  };
});
