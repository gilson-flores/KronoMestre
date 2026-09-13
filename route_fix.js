const fs = require('fs');
let code = fs.readFileSync('app/api/gemini/adapt-playful/route.ts', 'utf8');

// The replacement script earlier ate a bunch of lines. Let's fix this IF block properly.
// The broken line: if (candidate.startsWith('<!DOCTYPE') || candidate.startsWith('<html')) {
// Was followed by challenges = ... completely eating the block closing!

// The original lines around 40 were:
// if (candidate.startsWith('<!DOCTYPE') || candidate.startsWith('<html')) {
//    return candidate; 
// }
// }
// }

code = code.replace(
  "if (candidate.startsWith('<!DOCTYPE') || candidate.startsWith('<html')) {\n    challenges = questions.slice(0, 6).map((q: any, i: number) => {",
  "if (candidate.startsWith('<!DOCTYPE') || candidate.startsWith('<html')) {\n      return candidate;\n    }\n  }\n  }\n\n  let challenges: any[] = [];\n  if (Array.isArray(questions) && questions.length > 0) {\n    challenges = questions.slice(0, 6).map((q: any, i: number) => {"
);

fs.writeFileSync('app/api/gemini/adapt-playful/route.ts', code);
console.log('Fixed route.ts missing bracket block');
