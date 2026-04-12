(function(root, factory) {
  const exports = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports;
  }

  root.TmailorVerificationProfiles = exports;
})(typeof globalThis !== 'undefined' ? globalThis : self, function() {
  function getDeps() {
    const holder = typeof globalThis !== 'undefined' ? globalThis : self;
    return {
      LoginVerificationCodes: holder.LoginVerificationCodes || null,
    };
  }

  function loadNodeDeps() {
    if (typeof require !== 'function') {
      return {};
    }

    try {
      return {
        LoginVerificationCodes: require('./login-verification-codes.js'),
      };
    } catch {
      return {};
    }
  }

  const deps = { ...loadNodeDeps(), ...getDeps() };
  const LoginVerificationCodes = deps.LoginVerificationCodes;

  const mergeLoginVerificationCodeExclusions = LoginVerificationCodes?.mergeLoginVerificationCodeExclusions || function({ signupCode = '' } = {}) {
    return /^\d{6}$/.test(String(signupCode || '').trim()) ? [String(signupCode).trim()] : [];
  };

  const TMAILOR_VERIFICATION_PROFILES = {
    4: {
      senderFilters: ['openai', 'noreply', 'verify', 'auth', 'duckduckgo', 'forward'],
      subjectFilters: ['verify', 'verification', 'code', '验证', 'confirm'],
    },
    7: {
      senderFilters: ['openai', 'noreply', 'verify', 'auth', 'chatgpt', 'duckduckgo', 'forward'],
      subjectFilters: ['verify', 'verification', 'code', '验证', 'confirm', 'login'],
    },
  };

  function inferTmailorManualFetchStep(currentStep) {
    const step = Number.parseInt(String(currentStep ?? 0), 10) || 0;
    return step >= 6 ? 7 : 4;
  }

  function normalizeVerificationProfileStep(step) {
    const numericStep = Number.parseInt(String(step ?? 0), 10) || 0;
    return numericStep >= 7 ? 7 : 4;
  }

  function getTmailorVerificationProfile(step) {
    const normalizedStep = normalizeVerificationProfileStep(step);
    const profile = TMAILOR_VERIFICATION_PROFILES[normalizedStep];
    return {
      senderFilters: [...(profile?.senderFilters || [])],
      subjectFilters: [...(profile?.subjectFilters || [])],
    };
  }

  function buildManualTmailorCodeFetchConfig({ currentStep = 0, targetEmail = '', signupCode = '' } = {}) {
    const step = inferTmailorManualFetchStep(currentStep);
    const profile = getTmailorVerificationProfile(step);
    return {
      step,
      ...profile,
      targetEmail: String(targetEmail || '').trim(),
      filterAfterTimestamp: 0,
      excludeCodes: step === 7
        ? mergeLoginVerificationCodeExclusions({
          signupCode,
          rejectedCodes: [],
        })
        : [],
      maxAttempts: 6,
      intervalMs: 2500,
    };
  }

  return {
    buildManualTmailorCodeFetchConfig,
    getTmailorVerificationProfile,
    inferTmailorManualFetchStep,
  };
});
