const fs = require('fs');

let c = fs.readFileSync('lib/adaptationUtils.ts', 'utf8');

c = c.replace(
  "if (candidate.startsWith('<!DOCTYPE') || candidate.startsWith('<html')) {\n  function initAutoAdvanceGuard() {",
  "if (candidate.startsWith('<!DOCTYPE') || candidate.startsWith('<html')) {\n            html = candidate;\n          }\n        }\n      }\n    }\n  } catch (e) {\n    console.error('Error extracting HTML:', e);\n  }\n  \n  const guardScript = `\n<script>\n(function() {\n  function initAutoAdvanceGuard() {"
);

fs.writeFileSync('lib/adaptationUtils.ts', c);
console.log('Fixed missing guardScript declaration');
