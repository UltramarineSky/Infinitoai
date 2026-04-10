const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createContext() {
  const listeners = [];
  const state = {
    logs: [],
    waitForElementByTextCalls: 0,
    waitForElementCalls: 0,
    clicked: 0,
    completed: [],
    reloadCalls: 0,
  };

  const header = {
    querySelector(selector) {
      if (/button/.test(selector)) {
        return {
          disabled: false,
          getBoundingClientRect() {
            return { width: 100, height: 30 };
          },
        };
      }
      return null;
    },
  };

  const authUrlEl = {
    textContent: 'https://auth.openai.com/example',
  };

  const context = {
    console: {
      log() {},
      warn() {},
      error() {},
    },
    location: {
      href: 'https://example.com/management.html#/',
      reload() {
        state.reloadCalls += 1;
      },
    },
    chrome: {
      runtime: {
        onMessage: {
          addListener(listener) {
            listeners.push(listener);
          },
        },
        sendMessage() {
          return Promise.resolve({ ok: true });
        },
      },
    },
    document: {
      querySelector() {
        return null;
      },
    },
    resetStopState() {},
    isStopError() {
      return false;
    },
    reportError() {},
    throwIfStopped() {},
    log(message, level = 'info') {
      state.logs.push({ message, level });
    },
    reportComplete(step, payload) {
      state.completed.push({ step, payload });
    },
    sleep() {
      return Promise.resolve();
    },
    humanPause() {
      return Promise.resolve();
    },
    simulateClick() {
      state.clicked += 1;
    },
    fillInput() {},
    waitForElementByText(selector, pattern) {
      state.waitForElementByTextCalls += 1;
      if (selector === '.card-header' && pattern && pattern.test('Codex')) {
        if (state.waitForElementByTextCalls === 1) {
          return Promise.reject(new Error('not ready'));
        }
        return Promise.resolve(header);
      }
      return Promise.reject(new Error('unexpected selector'));
    },
    waitForElement(selector) {
      state.waitForElementCalls += 1;
      if (selector === '[class*="authUrlValue"]') {
        return Promise.resolve(authUrlEl);
      }
      return Promise.reject(new Error('unexpected selector'));
    },
    setTimeout,
    clearTimeout,
  };

  context.window = context;
  context.top = context;
  context.__state = state;
  context.__listeners = listeners;
  return context;
}

function loadVpsPanel(context) {
  const scriptPath = path.join(__dirname, '..', 'content', 'vps-panel.js');
  const code = fs.readFileSync(scriptPath, 'utf8');
  vm.createContext(context);
  vm.runInContext(code, context, { filename: scriptPath });
}

test('step 1 refreshes and retries when the Codex OAuth card does not appear on the first wait', async () => {
  const context = createContext();
  loadVpsPanel(context);

  const listener = context.__listeners[0];
  assert.ok(listener, 'expected vps-panel to register a runtime listener');

  const response = await new Promise((resolve, reject) => {
    const keepAlive = listener({ type: 'EXECUTE_STEP', step: 1, payload: {} }, {}, (result) => {
      resolve(result);
    });
    assert.equal(keepAlive, true);
    setTimeout(() => reject(new Error('timeout waiting for response')), 2000);
  });

  assert.equal(response?.ok, true);
  assert.equal(context.__state.reloadCalls, 1);
  assert.equal(context.__state.clicked, 1);
  assert.equal(context.__state.completed.length, 1);
  assert.equal(context.__state.completed[0].step, 1);
  assert.match(
    context.__state.logs.map((entry) => entry.message).join('\n'),
    /Refreshing the VPS page and retrying/i
  );
});
