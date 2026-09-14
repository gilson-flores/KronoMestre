const fs = require('fs');
let content = fs.readFileSync('components/Sidebar.tsx', 'utf-8');

const targetBaseNavItems = `  const baseNavItems = role === 'second_teacher'
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'alunos', label: 'Alunos', icon: Users },
        { id: 'atestados_rad', label: 'Atestados e RAD', icon: BookOpen },
        { id: 'arquivos', label: 'Biblioteca de Arquivos', icon: FolderOpen },
      ]`;

const replacementBaseNavItems = `  const baseNavItems = role === 'second_teacher'
    ? [
        { id: 'desempenho', label: 'Acompanhamento PNE', icon: LayoutDashboard },
        { id: 'alunos', label: 'Meus Alunos', icon: Users },
        { id: 'atestados', label: 'Atestados e RAD', icon: BookOpen },
        { id: 'biblioteca', label: 'Biblioteca de Arquivos', icon: FolderOpen },
        { id: 'mensagens', label: 'Mensagens', icon: MessageSquare, badge: unreadMessagesCount },
      ]`;

content = content.replace(targetBaseNavItems, replacementBaseNavItems);
fs.writeFileSync('components/Sidebar.tsx', content);
