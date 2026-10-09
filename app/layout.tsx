import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0b0f19',
};

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
    <html lang="pt-BR" className="dark" style={{ backgroundColor: '#0b0f19', colorScheme: 'dark' }}>
      <body
        suppressHydrationWarning
        className="bg-[#0b0f19] text-[#f8fafc] min-h-screen antialiased selection:bg-blue-600 selection:text-white"
        style={{ backgroundColor: '#0b0f19', color: '#f8fafc' }}
      >
        {children}
      </body>
    </html>
  );
}
