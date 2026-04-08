(function(root, factory) {
  const exports = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports;
  }

  root.QqRefresh = exports;
})(typeof globalThis !== 'undefined' ? globalThis : self, function() {
  function getQqRefreshFolderSequence() {
    return ['重要联系人', '收件箱'];
  }

  return {
    getQqRefreshFolderSequence,
  };
});
