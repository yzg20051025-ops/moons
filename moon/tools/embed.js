const fs = require('fs');
const b = fs.readFileSync('assets/moon-900.jpg');
const b64 = b.toString('base64');
const header = '/* Moon surface photo (Pexels #47367, free licence), cropped and\n   tonal-normalised as an albedo map. Embedded as a data URI so the page\n   works from file:// without tainting the canvas. */\n';
fs.writeFileSync('js/moon-texture.js', header + 'window.MOON_TEXTURE = "data:image/jpeg;base64,' + b64 + '";\n');
console.log('js bytes', fs.statSync('js/moon-texture.js').size);
