const fs = require('fs');
let content = fs.readFileSync('components/views/MessagesView.tsx', 'utf-8');

const regex = /<\/div>\s*<\/div>\s*<\/div>\s*<\/>\)}\s*{\/\* Student Thread Scroll Area \*\//;

content = content.replace(regex, 
`                </div>
              </div>
              </>)}
            </div>
            {/* Student Thread Scroll Area */}`);

fs.writeFileSync('components/views/MessagesView.tsx', content);
