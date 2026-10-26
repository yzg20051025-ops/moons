(function () {
  function fire(el, val) {
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  fire(document.querySelector('[data-input="date-a"]'), '2026-10-10');
  fire(document.querySelector('[data-input="name-a"]'), '小明');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

  var c = document.querySelector('.moon-canvas');
  var ctx = c.getContext('2d');
  var p = ctx.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data;

  return {
    score: document.querySelector('[data-out="score"]').textContent,
    thA: document.querySelector('[data-out="thA"]').textContent,
    sub: document.querySelector('[data-out="verdictSub"]').textContent,
    verdict: document.querySelector('[data-out="verdictLine"]').textContent,
    hintClass: document.querySelector('.pair-hint').className,
    centerPixel: [p[0], p[1], p[2], p[3]],
    dateA: document.querySelector('[data-input="date-a"]').value
  };
})()
