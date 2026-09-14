const fs = require('fs');
let content = fs.readFileSync('components/views/MessagesView.tsx', 'utf-8');

const bad = `                </div>
              </div>
            </div>
            </>)}{/* Student Thread Scroll Area */}`;

const good = `                </div>
              </div>
            </>)}
            </div>
            {/* Student Thread Scroll Area */}`;

content = content.replace(bad, good);
fs.writeFileSync('components/views/MessagesView.tsx', content);
