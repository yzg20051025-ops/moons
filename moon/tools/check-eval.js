(function () {
  var out = {};
  ['score', 'verdictLine', 'verdictSub', 'rAText', 'rBText', 'overlapNote'].forEach(function (k) {
    var el = document.querySelector('[data-out="' + k + '"]');
    out[k] = el ? el.textContent.trim() : 'MISSING';
  });
  out.canvases = Array.prototype.map.call(document.querySelectorAll('.moon-canvas'), function (c) {
    return c.width + 'x' + c.height;
  });
  out.overlay = (function () {
    var c = document.getElementById('overlayCanvas');
    return c ? c.width + 'x' + c.height : 'MISSING';
  })();
  out.hintVisible = !!document.querySelector('.pair-hint:not(.is-hidden)');
  out.scrollHeight = document.body.scrollHeight;
  return out;
})()
