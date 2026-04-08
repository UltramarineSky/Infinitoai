(function(root, factory) {
  const exports = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports;
  }

  root.FlowRunner = exports;
})(typeof globalThis !== 'undefined' ? globalThis : self, function() {
  const TOTAL_STEPS = 9;
  const DEFAULT_DELAY_AFTER = 2000;
  const STEP_DELAYS = {
    3: 3000,
    5: 3000,
    6: 3000,
    9: 1000,
  };

  function assertValidStep(step, label = 'step') {
    if (!Number.isInteger(step) || step < 1 || step > TOTAL_STEPS) {
      throw new Error(`Invalid ${label}: ${step}`);
    }
  }

  function buildStepSequence(startStep, endStep = TOTAL_STEPS) {
    assertValidStep(startStep, 'start step');
    assertValidStep(endStep, 'end step');

    if (startStep > endStep) {
      throw new Error(`Start step ${startStep} cannot be after end step ${endStep}`);
    }

    const steps = [];
    for (let step = startStep; step <= endStep; step++) {
      steps.push(step);
    }
    return steps;
  }

  function getStepDelayAfter(step) {
    assertValidStep(step);
    return STEP_DELAYS[step] ?? DEFAULT_DELAY_AFTER;
  }

  async function runStepSequence({
    startStep,
    endStep = TOTAL_STEPS,
    executeStepAndWait,
  }) {
    if (typeof executeStepAndWait !== 'function') {
      throw new Error('executeStepAndWait must be a function');
    }

    const steps = buildStepSequence(startStep, endStep);
    for (const step of steps) {
      await executeStepAndWait(step, getStepDelayAfter(step));
    }
    return steps;
  }

  return {
    TOTAL_STEPS,
    buildStepSequence,
    getStepDelayAfter,
    runStepSequence,
  };
});
