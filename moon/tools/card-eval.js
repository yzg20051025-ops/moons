(function () {
  document.querySelector('.share [data-action="save"]').click();
  var c = document.getElementById('cardCanvas');
  document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;background:#000;overflow:hidden';
  c.hidden = false;
  c.style.width = '1080px';
  c.style.height = '1350px';
  c.style.display = 'block';
  document.body.appendChild(c);
  return 'ok';
})()
