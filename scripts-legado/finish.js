const fs = require('fs');
let content = fs.readFileSync('components/views/MessagesView.tsx', 'utf-8');

content = content.replace(/{!isSecondTeacher && \(\n<>\n/, '{!isSecondTeacher && (<>\n');

// Then I will put back the `</>)}` right before ` {/* Student Thread Scroll Area */}`

content = content.replace(
`            </div>
{/* Student Thread Scroll Area */}`,
`            </div>
            </>)}
            {/* Student Thread Scroll Area */}`
);

fs.writeFileSync('components/views/MessagesView.tsx', content);
