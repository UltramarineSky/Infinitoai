(function(root, factory) {
  const exports = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports;
  }

  root.MailMatching = exports;
})(typeof globalThis !== 'undefined' ? globalThis : self, function() {
  const REGISTRATION_CN_SUBJECT = /你的\s*chatgpt\s*代码为/i;
  const VERIFICATION_EN_SUBJECT = /your\s*chatgpt\s*code\s*is/i;

  const STEP_MAIL_MATCH_PROFILES = {
    4: {
      include: [REGISTRATION_CN_SUBJECT],
      exclude: [VERIFICATION_EN_SUBJECT],
    },
    7: {
      include: [VERIFICATION_EN_SUBJECT],
      exclude: [REGISTRATION_CN_SUBJECT],
    },
    9: {
      include: [VERIFICATION_EN_SUBJECT],
      exclude: [REGISTRATION_CN_SUBJECT],
    },
  };

  function normalizeText(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function getStepMailMatchProfile(step) {
    return STEP_MAIL_MATCH_PROFILES[step] || null;
  }

  function matchesSubjectPatterns(subject, profile) {
    if (!profile) {
      return true;
    }

    const text = normalizeText(subject);
    if (!text) {
      return false;
    }

    const includeMatched = (profile.include || []).length === 0
      || profile.include.some((pattern) => pattern.test(text));
    if (!includeMatched) {
      return false;
    }

    const excluded = (profile.exclude || []).some((pattern) => pattern.test(text));
    return !excluded;
  }

  return {
    getStepMailMatchProfile,
    matchesSubjectPatterns,
    normalizeText,
  };
});
