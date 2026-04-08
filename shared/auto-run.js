(function(root, factory) {
  const exports = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports;
  }

  root.AutoRun = exports;
})(typeof globalThis !== 'undefined' ? globalThis : self, function() {
  const STOP_ERROR_MESSAGE = 'Flow stopped by user.';
  const AUTO_RUN_HANDOFF_MESSAGE = 'Auto run handed off to manual continuation.';

  function getErrorMessage(error) {
    return typeof error === 'string' ? error : error?.message || '';
  }

  function shouldContinueAutoRunAfterError(error) {
    const message = getErrorMessage(error);
    return message !== STOP_ERROR_MESSAGE && message !== AUTO_RUN_HANDOFF_MESSAGE;
  }

  function summarizeAutoRunResult({
    totalRuns,
    successfulRuns,
    failedRuns,
    lastAttemptedRun,
    stopRequested,
    handedOffToManual,
  }) {
    if (handedOffToManual) {
      return {
        phase: 'stopped',
        message: '=== Auto run paused and handed off to manual continuation ===',
      };
    }

    if (stopRequested) {
      return {
        phase: 'stopped',
        message: `=== Stopped after ${Math.max(0, lastAttemptedRun - 1)}/${totalRuns} runs ===`,
      };
    }

    return {
      phase: 'complete',
      message: `=== Auto run finished: ${successfulRuns} succeeded, ${failedRuns} failed, ${totalRuns} total ===`,
    };
  }

  return {
    shouldContinueAutoRunAfterError,
    summarizeAutoRunResult,
  };
});
