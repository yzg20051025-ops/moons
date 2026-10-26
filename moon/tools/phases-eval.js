(function () {
  function set(id, val) {
    var el = document.querySelector('[data-input="' + id + '"]');
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  set('date-a', '2026-10-10');
  set('date-b', '2026-10-26');
  window.scrollTo(0, 0);
  return 'ok';
})()
