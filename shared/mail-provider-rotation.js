(function(root, factory) {
  const exports = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports;
  }

  root.MailProviderRotation = exports;
})(typeof globalThis !== 'undefined' ? globalThis : self, function() {
  const ROTATABLE_MAIL_PROVIDERS = Object.freeze(['163', 'qq']);
  const DEFAULT_ROTATABLE_MAIL_PROVIDER = '163';
  const MAIL_PROVIDER_ROTATION_LIMIT = 6;
  const MAIL_PROVIDER_ROTATION_WINDOW_MS = 30 * 60 * 1000;

  function isRotatableMailProvider(provider) {
    return ROTATABLE_MAIL_PROVIDERS.includes(provider);
  }

  function normalizeUsageEntries(entries, now) {
    if (!Array.isArray(entries)) return [];
    return entries
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0 && now - value <= MAIL_PROVIDER_ROTATION_WINDOW_MS)
      .sort((left, right) => left - right);
  }

  function pruneMailProviderUsage(usageState = {}, now = Date.now()) {
    const normalizedState = {};
    for (const provider of ROTATABLE_MAIL_PROVIDERS) {
      normalizedState[provider] = normalizeUsageEntries(usageState?.[provider], now);
    }
    return normalizedState;
  }

  function recordMailProviderUsage(usageState = {}, provider, now = Date.now()) {
    const normalizedState = pruneMailProviderUsage(usageState, now);
    if (!isRotatableMailProvider(provider)) {
      return normalizedState;
    }
    normalizedState[provider] = [...normalizedState[provider], now];
    return normalizedState;
  }

  function getNextMailProviderAvailabilityTimestamp(options = {}) {
    const {
      mailDomainSettings,
      usageState,
      now = Date.now(),
    } = options;

    const configuredProviders = getConfiguredRotatableMailProviders(mailDomainSettings);
    if (configuredProviders.length === 0) {
      return null;
    }

    const normalizedUsageState = pruneMailProviderUsage(usageState, now);
    const availableProviders = configuredProviders.filter(
      (provider) => normalizedUsageState[provider].length < MAIL_PROVIDER_ROTATION_LIMIT
    );

    if (availableProviders.length > 0) {
      return null;
    }

    const earliestReusableAt = configuredProviders
      .map((provider) => normalizedUsageState[provider][0] + MAIL_PROVIDER_ROTATION_WINDOW_MS)
      .filter((value) => Number.isFinite(value))
      .sort((left, right) => left - right)[0];

    return Number.isFinite(earliestReusableAt) ? earliestReusableAt : null;
  }

  function getConfiguredRotatableMailProviders(mailDomainSettings = {}) {
    return ROTATABLE_MAIL_PROVIDERS.filter((provider) => {
      const domain = String(mailDomainSettings?.[provider]?.emailDomain || '').trim();
      return Boolean(domain);
    });
  }

  function chooseMailProviderForAutoRun(options = {}) {
    const {
      autoRotateMailProvider = false,
      currentProvider,
      lastProvider,
      mailDomainSettings,
      usageState,
      now = Date.now(),
    } = options;

    const preferredProvider = isRotatableMailProvider(currentProvider)
      ? currentProvider
      : DEFAULT_ROTATABLE_MAIL_PROVIDER;

    if (!autoRotateMailProvider) {
      return preferredProvider;
    }

    const configuredProviders = getConfiguredRotatableMailProviders(mailDomainSettings);
    if (configuredProviders.length === 0) {
      return preferredProvider;
    }

    const normalizedUsageState = pruneMailProviderUsage(usageState, now);
    const availableProviders = configuredProviders.filter(
      (provider) => normalizedUsageState[provider].length < MAIL_PROVIDER_ROTATION_LIMIT
    );

    if (availableProviders.length === 0) {
      if (configuredProviders.includes(preferredProvider)) {
        return preferredProvider;
      }
      if (isRotatableMailProvider(lastProvider) && configuredProviders.includes(lastProvider)) {
        return lastProvider;
      }
      return configuredProviders[0];
    }

    if (availableProviders.includes(preferredProvider)) {
      return preferredProvider;
    }

    if (isRotatableMailProvider(lastProvider) && availableProviders.includes(lastProvider)) {
      return lastProvider;
    }

    return availableProviders[0];
  }

  return {
    DEFAULT_ROTATABLE_MAIL_PROVIDER,
    MAIL_PROVIDER_ROTATION_LIMIT,
    MAIL_PROVIDER_ROTATION_WINDOW_MS,
    ROTATABLE_MAIL_PROVIDERS,
    chooseMailProviderForAutoRun,
    getNextMailProviderAvailabilityTimestamp,
    getConfiguredRotatableMailProviders,
    isRotatableMailProvider,
    pruneMailProviderUsage,
    recordMailProviderUsage,
  };
});
