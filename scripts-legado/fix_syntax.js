const fs = require('fs');

let c = fs.readFileSync('lib/adaptationUtils.ts', 'utf8');
c = c.replace('})();\n</script>\n`;', '})();\n</script>\n`;'); // actually there's nothing wrong here, it's the lack of opening backtick somewhere else.

// Let's find the missing opening backtick
if (c.indexOf('const guardScript = `') !== -1) {
    console.log("guardScript opening backtick exists");
} else {
    c = c.replace('const guardScript = ', 'const guardScript = `');
    console.log("fixed guardScript opening backtick");
}
fs.writeFileSync('lib/adaptationUtils.ts', c);

let c2 = fs.readFileSync('app/api/gemini/adapt-playful/route.ts', 'utf8');
c2 = c2.replace('q.statement || `Desafio ${i + 1}: Qual é a resposta correta?`,', 'q.statement || `Desafio ${i + 1}: Qual é a resposta correta?`,'); // nothing wrong here too, same problem?
fs.writeFileSync('app/api/gemini/adapt-playful/route.ts', c2);

