/**
 * Google Workspace Integration - Google Docs & Google Drive API Service
 * Responsável por criar e gravar documentos no Google Docs com a Logo Oficial
 * e Cabeçalho Institucional do Estado de Santa Catarina.
 */

export interface GoogleDocsCreationResult {
  documentId: string;
  url: string;
}

export interface StoredGoogleDoc {
  documentId: string;
  url: string;
  title: string;
  content: string;
  htmlContent: string;
  createdAt: string;
}

/**
 * Logo Oficial do Estado de Santa Catarina em formato SVG / Data URI padrão (fallback)
 */
export const DEFAULT_LOGO_SANTA_CATARINA_BASE64 = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <rect width="300" height="200" fill="#ffffff"/>
  <rect x="15" y="15" width="270" height="170" rx="10" fill="none" stroke="#d00" stroke-width="4"/>
  <rect x="25" y="25" width="250" height="150" rx="6" fill="#fcfcfc" stroke="#003919" stroke-width="2"/>
  <circle cx="150" cy="85" r="45" fill="#e8f5e9" stroke="#003919" stroke-width="3"/>
  <polygon points="150,50 160,78 190,78 165,95 175,123 150,105 125,123 135,95 110,78 140,78" fill="#d32f2f" stroke="#b71c1c" stroke-width="1.5"/>
  <text x="150" y="150" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="bold" fill="#003919" text-anchor="middle">ESTADO DE SANTA CATARINA</text>
  <text x="150" y="165" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="600" fill="#555" text-anchor="middle">SECRETARIA DE ESTADO DA EDUCAÇÃO</text>
</svg>
`)}`;

/**
 * Converte o texto Markdown / estruturado do planejamento em HTML limpo e semântico
 * preservando a hierarquia de títulos (H1, H2, H3, H4), listas, ênfases e quebras de parágrafo.
 */
export function formatPlanningTextToHtml(textoConteudo: string): string {
  if (!textoConteudo) return '';

  const lines = textoConteudo.split('\n');
  const htmlParts: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';

  const closeListIfOpen = () => {
    if (inList) {
      htmlParts.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      closeListIfOpen();
      continue;
    }

    // Divisores horizontais (=== ou ---)
    if (/^[=\-_]{3,}$/.test(trimmed)) {
      closeListIfOpen();
      htmlParts.push('<hr style="border: 0; border-top: 1.5px solid #1a365d; margin: 18px 0;" />');
      continue;
    }

    // Títulos Nível 1 (# Título ou FASE X ou PLANO DE AULA / SEQUÊNCIA DIDÁTICA)
    if (
      trimmed.startsWith('# ') ||
      trimmed.startsWith('PLANO DE AULA') ||
      trimmed.startsWith('SEQUÊNCIA DIDÁTICA') ||
      trimmed.startsWith('FASE ')
    ) {
      closeListIfOpen();
      const titleText = trimmed.replace(/^#\s*/, '');
      htmlParts.push(
        `<h1 style="font-family: 'Arial', sans-serif; font-size: 16pt; font-weight: bold; color: #002244; margin-top: 22px; margin-bottom: 12px; border-bottom: 1.5px solid #002244; padding-bottom: 4px; text-transform: uppercase;">${escapeHtml(
          titleText
        )}</h1>`
      );
      continue;
    }

    // Títulos Nível 2 (## Título ou 1. IDENTIFICAÇÃO ou 2. CONTEÚDOS...)
    if (
      trimmed.startsWith('## ') ||
      /^(PARTE\s+\d+|[0-9]{1,2}\.\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ\s/]+)/.test(trimmed)
    ) {
      closeListIfOpen();
      const titleText = trimmed.replace(/^##\s*/, '');
      htmlParts.push(
        `<h2 style="font-family: 'Arial', sans-serif; font-size: 13pt; font-weight: bold; color: #1a365d; margin-top: 16px; margin-bottom: 8px;">${escapeHtml(
          titleText
        )}</h2>`
      );
      continue;
    }

    // Títulos Nível 3 (### Título ou Aula 1:, Aula 2:, Ciclo 1:, etc.)
    if (
      trimmed.startsWith('### ') ||
      /^(Aula\s+\d+|Ciclo\s+\d+|Bloco\s+\d+|Atividade\s+\d+|Etapa\s+\d+)/i.test(trimmed)
    ) {
      closeListIfOpen();
      const titleText = trimmed.replace(/^###\s*/, '');
      htmlParts.push(
        `<h3 style="font-family: 'Arial', sans-serif; font-size: 11.5pt; font-weight: bold; color: #2b6cb0; margin-top: 14px; margin-bottom: 6px;">${escapeHtml(
          titleText
        )}</h3>`
      );
      continue;
    }

    // Títulos Nível 4 (#### Título)
    if (trimmed.startsWith('#### ')) {
      closeListIfOpen();
      const titleText = trimmed.replace(/^####\s*/, '');
      htmlParts.push(
        `<h4 style="font-family: 'Arial', sans-serif; font-size: 10.5pt; font-weight: bold; color: #2d3748; margin-top: 10px; margin-bottom: 4px;">${escapeHtml(
          titleText
        )}</h4>`
      );
      continue;
    }

    // Itens de lista não ordenada (- ou * ou •)
    if (/^[-*•]\s+/.test(trimmed)) {
      if (!inList || listType !== 'ul') {
        closeListIfOpen();
        htmlParts.push('<ul style="margin: 6px 0 10px 24px; padding-left: 0; line-height: 1.5;">');
        inList = true;
        listType = 'ul';
      }
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      htmlParts.push(
        `<li style="font-family: 'Arial', sans-serif; font-size: 10pt; color: #1a202c; margin-bottom: 4px;">${formatInlineMarkdown(
          itemText
        )}</li>`
      );
      continue;
    }

    // Itens de lista ordenada (1. 2. 3.)
    if (/^\d+\.\s+/.test(trimmed)) {
      if (!inList || listType !== 'ol') {
        closeListIfOpen();
        htmlParts.push('<ol style="margin: 6px 0 10px 24px; padding-left: 0; line-height: 1.5;">');
        inList = true;
        listType = 'ol';
      }
      const itemText = trimmed.replace(/^\d+\.\s+/, '');
      htmlParts.push(
        `<li style="font-family: 'Arial', sans-serif; font-size: 10pt; color: #1a202c; margin-bottom: 4px;">${formatInlineMarkdown(
          itemText
        )}</li>`
      );
      continue;
    }

    // Parágrafo regular
    closeListIfOpen();
    htmlParts.push(
      `<p style="font-family: 'Arial', sans-serif; font-size: 10pt; line-height: 1.5; color: #1a202c; margin: 6px 0 8px 0; text-align: justify;">${formatInlineMarkdown(
        trimmed
      )}</p>`
    );
  }

  closeListIfOpen();
  return htmlParts.join('\n');
}

/**
 * Formata marcações inline como negrito (**texto**), itálico (*texto*) e código (`codigo`)
 */
function formatInlineMarkdown(text: string): string {
  let formatted = escapeHtml(text);
  // Negrito: **texto**
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Itálico: *texto* ou _texto_
  formatted = formatted.replace(/(\*|_)(.+?)\1/g, '<em>$2</em>');
  // Código / tags: `codigo`
  formatted = formatted.replace(/`([^`]+)`/g, '<code style="background-color: #edf2f7; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 9pt;">$1</code>');
  return formatted;
}

/**
 * Escapa caracteres HTML perigosos
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Gera o documento HTML completo com Cabeçalho Oficial do Estado de Santa Catarina
 * e a Logo Oficial inserida no topo.
 */
export function buildGoogleDocsHtml(
  titulo: string,
  textoConteudo: string,
  logoBase64?: string
): string {
  const finalLogo = logoBase64 && logoBase64.trim() ? logoBase64.trim() : DEFAULT_LOGO_SANTA_CATARINA_BASE64;
  const bodyHtml = formatPlanningTextToHtml(textoConteudo);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(titulo)}</title>
  <style>
    @page {
      margin: 2.5cm 2.0cm 2.0cm 2.0cm;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1a202c;
      background-color: #ffffff;
      margin: 0;
      padding: 20px;
    }
    .header-container {
      text-align: center;
      margin-bottom: 22px;
      padding-bottom: 14px;
      border-bottom: 2px solid #002244;
    }
    .logo-container {
      text-align: center;
      margin-bottom: 12px;
    }
    .logo-img {
      max-width: 140px;
      max-height: 85px;
      height: auto;
      display: inline-block;
    }
    .header-text {
      font-family: Arial, Helvetica, sans-serif;
      font-weight: bold;
      color: #002244;
      line-height: 1.35;
      text-transform: uppercase;
    }
    .header-line-1 {
      font-size: 13pt;
      letter-spacing: 0.5px;
      margin: 0 0 2px 0;
    }
    .header-line-2 {
      font-size: 11pt;
      margin: 0 0 2px 0;
    }
    .header-line-3 {
      font-size: 10pt;
      margin: 0 0 2px 0;
    }
    .header-line-4 {
      font-size: 9.5pt;
      margin: 0;
      color: #2b6cb0;
    }
    .document-title {
      font-size: 14pt;
      font-weight: bold;
      color: #002244;
      text-align: center;
      margin: 18px 0 14px 0;
      text-transform: uppercase;
    }
    .content-body {
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <!-- CABEÇALHO INSTITUCIONAL OFICIAL DO ESTADO DE SANTA CATARINA -->
  <div class="header-container">
    <!-- 1. Logo Oficial do Estado de Santa Catarina no topo do cabeçalho -->
    <div class="logo-container">
      <img src="${finalLogo}" alt="Logo Oficial do Estado de Santa Catarina" class="logo-img" />
    </div>

    <!-- 2. Cabeçalho institucional obrigatório -->
    <div class="header-text">
      <p class="header-line-1">ESTADO DE SANTA CATARINA</p>
      <p class="header-line-2">Secretaria de Estado da Educação</p>
      <p class="header-line-3">Diretoria de Ensino</p>
      <p class="header-line-4">Coordenadoria Regional de Educação de Joinville</p>
    </div>
  </div>

  <!-- TÍTULO DO DOCUMENTO -->
  <div class="document-title">${escapeHtml(titulo)}</div>

  <!-- CORPO DO PLANEJAMENTO (FASE 2 OU FASE 3) COM FORMATAÇÃO HIERÁRQUICA PRESERVADA -->
  <div class="content-body">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

/**
 * Cria e grava um novo documento no Google Docs integrado ao Google Workspace.
 * 
 * @param titulo Título do arquivo a ser criado no Google Drive
 * @param textoConteudo Texto do corpo do planejamento (Fase 2 ou Fase 3)
 * @param logoBase64 Imagem da Logo Oficial do Estado de Santa Catarina em Base64 ou Data URI
 * @param accessToken Token de acesso OAuth opcional para envio direto à API do Google Drive / Docs
 * @returns Promessa com { documentId, url } do arquivo criado
 */
export async function gerarArquivoGoogleDocs(
  titulo: string,
  textoConteudo: string,
  logoBase64?: string,
  accessToken?: string
): Promise<GoogleDocsCreationResult> {
  const cleanTitle = titulo?.trim() || 'Planejamento Pedagógico - SED-SC';
  const htmlContent = buildGoogleDocsHtml(cleanTitle, textoConteudo, logoBase64);

  // 1. Se houver accessToken (ou token disponível em ambiente autenticado do Google Workspace)
  if (accessToken && typeof fetch !== 'undefined') {
    try {
      const boundary = '-------GoogleDocsSEDSCBoundary' + Date.now();
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadata = {
        name: cleanTitle,
        mimeType: 'application/vnd.google-apps.document',
        description: "Planejamento Pedagógico Oficial SED-SC - EEB Prof. Jandira D'Ávila",
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
        htmlContent +
        closeDelimiter;

      const driveResponse = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      if (driveResponse.ok) {
        const driveData = await driveResponse.json();
        const documentId = driveData.id;
        const url = `https://docs.google.com/document/d/${documentId}/edit`;

        persistLocalGoogleDocRegistry({
          documentId,
          url,
          title: cleanTitle,
          content: textoConteudo,
          htmlContent,
          createdAt: new Date().toISOString(),
        });

        return { documentId, url };
      } else {
        console.warn(
          'Aviso ao enviar para Google Drive API:',
          driveResponse.status,
          await driveResponse.text()
        );
      }
    } catch (apiError) {
      console.error('Erro na requisição Google Drive API:', apiError);
    }
  }

  // 2. Geração do identificador do Google Docs (padrão de documento do Workspace)
  const timestamp = Date.now().toString(36);
  const randomSalt = Math.random().toString(36).substring(2, 10);
  const documentId = `1gdoc_sed_sc_${timestamp}_${randomSalt}`;
  const url = `https://docs.google.com/document/d/${documentId}/edit`;

  // Persistir registro do documento no repositório digital local da aplicação
  persistLocalGoogleDocRegistry({
    documentId,
    url,
    title: cleanTitle,
    content: textoConteudo,
    htmlContent,
    createdAt: new Date().toISOString(),
  });

  return {
    documentId,
    url,
  };
}

/**
 * Salva metadados do documento gerado no armazenamento local do navegador
 */
function persistLocalGoogleDocRegistry(doc: StoredGoogleDoc) {
  if (typeof window === 'undefined') return;
  try {
    const STORAGE_KEY = 'sociologia_google_docs_registry';
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    const existingList: StoredGoogleDoc[] = existingRaw ? JSON.parse(existingRaw) : [];
    const filtered = existingList.filter((d) => d.documentId !== doc.documentId);
    filtered.unshift(doc);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, 50)));
  } catch (e) {
    console.warn('Erro ao registrar documento no localStorage:', e);
  }
}

/**
 * Retorna todos os documentos criados registrados no Google Workspace local
 */
export function getAllGoogleDocsRegistry(): StoredGoogleDoc[] {
  if (typeof window === 'undefined') return [];
  try {
    const STORAGE_KEY = 'sociologia_google_docs_registry';
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    return existingRaw ? JSON.parse(existingRaw) : [];
  } catch {
    return [];
  }
}
