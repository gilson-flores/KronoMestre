const fs = require('fs');
let content = fs.readFileSync('components/views/MessagesView.tsx', 'utf-8');

content = content.replace(
  '            </div>\n            </>)}\n{/* Student Thread Scroll Area */}',
  '            </>)}\n            </div>\n{/* Student Thread Scroll Area */}'
);

fs.writeFileSync('components/views/MessagesView.tsx', content);
