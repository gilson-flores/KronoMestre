const fs = require('fs');

// 1. Update app/page.tsx
let pageContent = fs.readFileSync('app/page.tsx', 'utf-8');
pageContent = pageContent.replace(
  "<SecondTeachersView\n              teacher={teacher}",
  "<SecondTeachersView\n              messages={chatMessages}\n              teacher={teacher}"
);
fs.writeFileSync('app/page.tsx', pageContent);

// 2. Update SecondTeachersView.tsx
let stvContent = fs.readFileSync('components/views/SecondTeachersView.tsx', 'utf-8');

// Import ChatMessage
if (!stvContent.includes('ChatMessage')) {
  stvContent = stvContent.replace(
    "import { TeacherUser, StudentUser, Activity } from '@/lib/types';",
    "import { TeacherUser, StudentUser, Activity, ChatMessage } from '@/lib/types';"
  );
}

// Update Props interface
if (!stvContent.includes('messages: ChatMessage[];')) {
  stvContent = stvContent.replace(
    "activities?: Activity[];",
    "activities?: Activity[];\n  messages: ChatMessage[];"
  );
}

// Update component signature
if (!stvContent.includes('messages = [],')) {
  stvContent = stvContent.replace(
    "activities = [],",
    "activities = [],\n  messages = [],"
  );
}

fs.writeFileSync('components/views/SecondTeachersView.tsx', stvContent);
