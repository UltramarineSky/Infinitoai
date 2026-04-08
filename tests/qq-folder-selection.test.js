const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElement({ tagName, textContent = '', title = '', className = '', parentElement = null, closest = null }) {
  return {
    tagName,
    textContent,
    className,
    parentElement,
    getAttribute(name) {
      return name === 'title' ? title : '';
    },
    closest(selector) {
      if (typeof closest === 'function') {
        return closest(selector);
      }
      return null;
    },
  };
}

function loadQqMailContext(elements) {
  const scriptPath = path.join(__dirname, '..', 'content', 'qq-mail.js');
  const code = fs.readFileSync(scriptPath, 'utf8');
  const context = {
    MailMatching: {
      getStepMailMatchProfile() {
        return null;
      },
      matchesSubjectPatterns() {
        return true;
      },
    },
    QqRefresh: {
      getQqRefreshFolderSequence() {
        return ['重要联系人', '收件箱'];
      },
    },
    MailFreshness: {
      isMailFresh() {
        return true;
      },
      parseMailTimestampCandidates() {
        return Date.now();
      },
    },
    chrome: {
      runtime: {
        onMessage: { addListener() {} },
      },
    },
    window: {},
    location: { href: 'https://mail.qq.com/' },
    document: {
      querySelectorAll() {
        return elements;
      },
    },
    console: {
      log() {},
      warn() {},
      error() {},
    },
    waitForElement() {
      throw new Error('not implemented in test');
    },
    sleep() {
      return Promise.resolve();
    },
    simulateClick() {},
    reportError() {},
    log() {},
    resetStopState() {},
    isStopError() {
      return false;
    },
    __MULTIPAGE_TEST_HOOKS: {},
  };

  context.window = context;
  context.top = context;

  vm.createContext(context);
  vm.runInContext(code, context, { filename: scriptPath });
  return context;
}

test('findSidebarFolderByLabel prefers the compact inbox row over a large container', () => {
  const largeContainer = createElement({
    tagName: 'DIV',
    textContent: '搜索Jian Lu616637870@qq.com普通用户设置写信收件箱2重要联系人星标邮件群邮件',
    className: 'layout-shell',
  });
  const inboxRow = createElement({
    tagName: 'DIV',
    textContent: '收件箱2',
    className: 'folder-item',
  });
  const inboxLabel = createElement({
    tagName: 'SPAN',
    textContent: '收件箱',
    parentElement: inboxRow,
  });

  const context = loadQqMailContext([largeContainer, inboxLabel, inboxRow]);
  const result = context.__MULTIPAGE_TEST_HOOKS.qqMail.findSidebarFolderByLabel('收件箱');

  assert.equal(result, inboxRow);
});
