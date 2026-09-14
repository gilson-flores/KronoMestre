const fs = require('fs');
let content = fs.readFileSync('components/views/MessagesView.tsx', 'utf-8');

content = content.replace(/<\/div>\s*<\/div>\s*<\/>\)}\s*{\/\* Student Thread Scroll Area \*\//, 
`              </div>
            </>)}
            </div>
            {/* Student Thread Scroll Area */}`);

fs.writeFileSync('components/views/MessagesView.tsx', content);
