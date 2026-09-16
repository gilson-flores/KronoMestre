import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'KronoMestre',
  description: 'Plataforma de gestão de atividades, alunos e notas para aulas de Sociologia',
  openGraph: {
    title: 'KronoMestre',
    description: 'Plataforma de gestão de atividades, alunos e notas para aulas de Sociologia',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
