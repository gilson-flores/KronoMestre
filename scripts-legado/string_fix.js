const fs = require('fs');

let c1 = fs.readFileSync('lib/adaptationUtils.ts', 'utf8');
c1 = c1.replace('})();\n</script>`', '})();\n</script>\n`;');
fs.writeFileSync('lib/adaptationUtils.ts', c1, 'utf8');

let c2 = fs.readFileSync('app/api/gemini/adapt-playful/route.ts', 'utf8');
c2 = c2.replace('</html>`\n;', '</html>\n`;');
fs.writeFileSync('app/api/gemini/adapt-playful/route.ts', c2, 'utf8');

console.log('Fixed Strings');
