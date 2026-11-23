import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, isGeminiAuthError, generateContentWithFallback } from '@/lib/gemini';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function extractJson(text: string): any {
  let cleaned = (text || '').trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
    }
    throw new Error('Não foi possível interpretar o JSON estruturado da IA.');
  }
}

function normalizeToken(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function generateDynamicLocalAnalysis(
  essayAnswer: string,
  questionStatement: string,
  keywords: string,
  turma: string,
  maxEssayScore: number,
  minChars: number,
  fallbackReason: string
) {
  const text = (essayAnswer || '').trim();
  const normText = normalizeToken(text);
  const charCount = text.length;
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 3);

  // Detecção de respostas vazias, evasivas ou extremamente curtas
  const evasivePattern = /^(nao sei|não sei|sei la|sei lá|nada|nenhum|n\/a|ok|sim|nao|não|teste|asdf|\.+|-+)$/i;
  const isEvasive = evasivePattern.test(text) || wordCount < 5;

  // 1. Análise real de fidelidade ao tema (interseção lexical com o enunciado)
  const stopWords = new Set([
    'para', 'como', 'sobre', 'entre', 'pelo', 'pela', 'pelos', 'pelas', 'com', 'sem', 'uma', 'uns',
    'umas', 'que', 'qual', 'quais', 'onde', 'quando', 'porque', 'por', 'das', 'dos', 'nos', 'nas',
    'este', 'esta', 'esse', 'essa', 'isso', 'isto', 'aqui', 'mais', 'menos', 'muito', 'muita',
    'pode', 'podem', 'fazer', 'partir', 'texto', 'questao', 'dissertativa', 'explique', 'comente',
    'responda', 'escreva', 'sociologia', 'aluno', 'alunos', 'tema', 'forma', 'modo', 'atraves'
  ]);
  const stmtTokens = Array.from(
    new Set(
      normalizeToken(questionStatement)
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !stopWords.has(w))
    )
  );
  const matchedThemeTerms = stmtTokens.filter((t) => normText.includes(t));
  const themeCoverage = stmtTokens.length > 0 ? matchedThemeTerms.length / Math.min(stmtTokens.length, 6) : 0.5;

  let themeScore = 0;
  let themeFidelity = '';
  if (isEvasive) {
    themeScore = 0.05;
    themeFidelity = `A resposta ("${text.slice(0, 60)}") não responde ao comando da questão nem desenvolve argumentos sobre o tema proposto.`;
  } else if (themeCoverage >= 0.5) {
    themeScore = 0.85;
    themeFidelity = `O texto dialoga diretamente com o enunciado, mobilizando termos centrais do tema (${matchedThemeTerms.slice(0, 4).join(', ')}).`;
  } else if (themeCoverage > 0) {
    themeScore = 0.55;
    themeFidelity = `Aderência parcial ao tema: cita ${matchedThemeTerms.slice(0, 3).join(', ')}, mas precisa responder mais diretamente ao comando central da questão.`;
  } else {
    themeScore = 0.25;
    themeFidelity = `Baixa aderência ao enunciado: não foram identificados termos ou conceitos centrais diretamente ligados à pergunta proposta.`;
  }

  // 2. Análise real de palavras-chave
  const kwList = (keywords || '')
    .split(/[,;]+/)
    .map((k) => k.trim())
    .filter(Boolean);

  const kwFoundList: string[] = [];
  const kwMissingList: string[] = [];
  kwList.forEach((kw) => {
    if (normText.includes(normalizeToken(kw))) kwFoundList.push(kw);
    else kwMissingList.push(kw);
  });

  let kwScore = 0.6;
  let keywordsCheck = '';
  if (kwList.length > 0) {
    kwScore = kwFoundList.length / kwList.length;
    if (kwFoundList.length === kwList.length) {
      keywordsCheck = `Excelente: utilizou todas as ${kwList.length} palavras-chave previstas (${kwFoundList.join(', ')}).`;
    } else if (kwFoundList.length > 0) {
      keywordsCheck = `Utilizou ${kwFoundList.length} de ${kwList.length} palavras-chave (${kwFoundList.join(', ')}). Faltou incorporar: ${kwMissingList.join(', ')}.`;
    } else {
      keywordsCheck = `Nenhuma das ${kwList.length} palavras-chave esperadas (${kwList.join(', ')}) foi identificada no texto.`;
    }
  } else {
    kwScore = isEvasive ? 0.05 : Math.min(0.85, 0.35 + themeCoverage * 0.5);
    keywordsCheck = isEvasive
      ? 'Não houve mobilização de vocabulário conceitual de Sociologia.'
      : `Atividade sem lista fixa de palavras-chave cadastrada; observada presença de ${matchedThemeTerms.length} termo(s) ligados ao enunciado.`;
  }

  // 3. Análise real de extensão e estrutura
  const safeMinChars = Math.max(30, Number(minChars || 150));
  const lengthRatio = Math.min(1, charCount / safeMinChars);
  let structScore = 0;
  let structureCheck = '';

  if (charCount < safeMinChars * 0.4) {
    structScore = 0.2;
    structureCheck = `Extensão muito abaixo do mínimo (${charCount}/${safeMinChars} caracteres, ${wordCount} palavras). Texto insuficiente para sustentar argumentação dissertativa.`;
  } else if (charCount < safeMinChars) {
    structScore = 0.55;
    structureCheck = `Abaixo da extensão mínima (${charCount}/${safeMinChars} caracteres, ${paragraphs.length} parágrafo(s)). Faltam ${safeMinChars - charCount} caracteres para completar o desenvolvimento esperado.`;
  } else if (paragraphs.length >= 3) {
    structScore = 0.95;
    structureCheck = `Meta de extensão atingida (${charCount}/${safeMinChars} caracteres) com ${paragraphs.length} parágrafos e boa divisão de ideias (${sentences.length} períodos).`;
  } else if (paragraphs.length === 2) {
    structScore = 0.8;
    structureCheck = `Meta atingida (${charCount}/${safeMinChars} caracteres) em 2 parágrafos. Dividir introdução, desenvolvimento e conclusão deixaria a tese mais clara.`;
  } else {
    structScore = 0.7;
    structureCheck = `Meta atingida (${charCount}/${safeMinChars} caracteres), porém em bloco único (${sentences.length} período(s)). Recomenda-se parágrafos distintos.`;
  }

  // 4. Análise real de gramática, ortografia e pontuação
  const grammarIssues: string[] = [];
  if (text.length > 0 && text[0] === text[0].toLowerCase() && /[a-zà-ÿ]/.test(text[0])) {
    grammarIssues.push('início de texto com letra minúscula');
  }
  if (text.length > 20 && !/[.!?]$/.test(text)) {
    grammarIssues.push('ausência de pontuação final');
  }
  if (text === text.toUpperCase() && charCount > 25) {
    grammarIssues.push('texto escrito integralmente em CAIXA ALTA');
  }
  const commonTypos: Array<[RegExp, string]> = [
    [/\bnao\b/gi, '"nao" → "não"'],
    [/\bsao\b/gi, '"sao" → "são"'],
    [/\bestao\b/gi, '"estao" → "estão"'],
    [/\bvoce\b/gi, '"voce" → "você"'],
    [/\bja\b/gi, '"ja" → "já"'],
    [/\bso\b/gi, '"so" → "só"'],
    [/\btambem\b/gi, '"tambem" → "também"'],
    [/\bporem\b/gi, '"porem" → "porém"'],
    [/\bentao\b/gi, '"entao" → "então"'],
    [/\bporque\s*\?/gi, '"porque?" → "por quê?"'],
    [/\ba\s+gente\s+somos\b/gi, '"a gente somos" → "a gente é"'],
    [/\bmais\s+porem\b/gi, 'redundância "mais porém"'],
    [/\bvc\b|\bpq\b|\btb\b|\btbm\b|\bmto\b/gi, 'uso de abreviações de internet (vc/pq/tb/mto)'],
  ];
  const foundTypos: string[] = [];
  commonTypos.forEach(([regex, label]) => {
    if (regex.test(text)) foundTypos.push(label);
  });
  if (foundTypos.length > 0) {
    grammarIssues.push(`desvios detectados: ${foundTypos.slice(0, 4).join('; ')}`);
  }
  if (wordCount > 30 && sentences.length <= 1) {
    grammarIssues.push('período muito longo sem pausas de ponto final');
  }

  const grammarScore = isEvasive
    ? 0.2
    : Math.max(0.35, 0.95 - grammarIssues.length * 0.15);
  const grammarCheck =
    grammarIssues.length > 0
      ? `Pontos de revisão normativa: ${grammarIssues.join('; ')}.`
      : `Sem desvios evidentes de pontuação básica ou internetês nos ${wordCount} termos analisados.`;

  // 5. Estimativa heurística de IA (baseada em sinais textuais reais)
  const aiMarkers = [
    'em suma', 'portanto, conclui-se', 'nesse sentido, e fundamental', 'vale ressaltar que',
    'diante do exposto', 'sob essa otica', 'em conclusao', 'e imperativo que', 'fomenta', 'corrobora'
  ];
  const aiHits = aiMarkers.filter((m) => normText.includes(m)).length;
  const aiUsagePercentage = isEvasive
    ? 0
    : Math.min(92, Math.max(5, aiHits * 22 + (foundTypos.length === 0 && wordCount > 80 && paragraphs.length >= 3 ? 18 : 6) - foundTypos.length * 4));
  const aiUsageAnalysis =
    aiUsagePercentage >= 55
      ? `Presença de ${aiHits} conectivo(s) altamente padronizado(s) e regularidade estrutural típica de texto gerado por IA.`
      : aiUsagePercentage >= 28
      ? 'Texto apresenta alguns conectivos formais padronizados; recomenda-se conferir oralmente com o estudante.'
      : 'Escrita com marcas naturais de autoria estudantil e vocabulário espontâneo.';

  // Nota final ponderada real (40% tema, 20% palavras-chave, 25% extensão/estrutura, 15% gramática)
  const weightedRatio = isEvasive
    ? 0.05
    : themeScore * 0.4 + kwScore * 0.2 + structScore * 0.25 + grammarScore * 0.15;
  const finalScore = Math.max(
    0,
    Math.min(maxEssayScore, Number((weightedRatio * maxEssayScore).toFixed(1)))
  );

  // Feedback dinâmico personalizado
  const feedbackParts: string[] = [];
  if (isEvasive) {
    feedbackParts.push('Sua resposta está muito curta e não respondeu à questão proposta.');
  } else if (themeScore >= 0.75) {
    feedbackParts.push('Você compreendeu bem o tema central da questão.');
  } else {
    feedbackParts.push('Procure responder mais diretamente ao que foi perguntado no enunciado.');
  }
  if (charCount < safeMinChars) {
    feedbackParts.push(`Amplie o desenvolvimento para atingir o mínimo de ${safeMinChars} caracteres (atual: ${charCount}).`);
  }
  if (foundTypos.length > 0) {
    feedbackParts.push(`Revise ortografia/acentuação (${foundTypos.slice(0, 2).join(', ')}).`);
  }

  return {
    suggestedScore: finalScore,
    feedback: feedbackParts.join(' ').slice(0, 420),
    themeFidelity,
    keywordsCheck,
    structureCheck,
    grammarCheck,
    aiUsagePercentage,
    aiUsageAnalysis,
    analysisSource: 'local_fallback',
    fallbackReason,
  };
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const {
    essayAnswer = '',
    questionStatement = '',
    activityTitle = '',
    activityDescription = '',
    supportMaterial = '',
    keywords = '',
    turma = '',
    maxEssayScore = 5.0,
    minChars = 150,
  } = body;

  if (!essayAnswer || typeof essayAnswer !== 'string' || !essayAnswer.trim()) {
    return NextResponse.json(
      { error: 'A resposta do aluno não foi fornecida.' },
      { status: 400 }
    );
  }

  const numericMaxScore = Math.max(0.5, Number(maxEssayScore) || 5.0);
  const numericMinChars = Math.max(20, Number(minChars) || 150);
  const charCountActual = essayAnswer.trim().length;
  const wordCountActual = essayAnswer.trim().split(/\s+/).filter(Boolean).length;

  const ai = getGeminiClient();
  if (!ai) {
    return NextResponse.json(
      generateDynamicLocalAnalysis(
        essayAnswer,
        questionStatement || activityTitle,
        keywords,
        turma,
        numericMaxScore,
        numericMinChars,
        'Chave GEMINI_API_KEY ausente ou inválida no servidor.'
      )
    );
  }

  let gradeLevelRule = 'Nível Médio (2º Ano): exija clareza, argumentação sociológica e articulação conceitual.';
  const turmaStr = String(turma || '').toLowerCase();
  if (turmaStr.startsWith('1') || turmaStr.includes('primeiro')) {
    gradeLevelRule = 'Nível 1º Ano do Ensino Médio: avalie compreensão conceitual de base, clareza e saída do senso comum.';
  } else if (turmaStr.startsWith('3') || turmaStr.includes('terceiro') || turmaStr.includes('enem')) {
    gradeLevelRule = 'Nível 3º Ano / Padrão ENEM: exija rigor argumentativo, repertório sociológico, coesão e norma culta.';
  }

  const prompt = `Você é o Professor avaliador sênior de Sociologia no Ensino Médio.
Avalie com RIGOR, ESPECIFICIDADE e PERSONALIZAÇÃO a resposta dissertativa abaixo.
PROIBIDO devolver frases genéricas ou notas padronizadas! Cite explicitamente trechos, acertos e erros concretos do texto que o aluno escreveu.

CONTEXTO DA ATIVIDADE:
- Título: "${activityTitle || 'Avaliação de Sociologia'}"
- Turma/Ano: ${turma || 'Ensino Médio'} (${gradeLevelRule})
- Enunciado / Pergunta: "${questionStatement || activityDescription || activityTitle || 'Questão dissertativa de Sociologia'}"
${supportMaterial ? `- Trecho do Material de Apoio: "${String(supportMaterial).slice(0, 600)}"` : ''}
- Palavras-chave esperadas: ${keywords || 'Nenhuma lista fixa — avaliar conceitos sociológicos exigidos pelo enunciado'}
- Extensão mínima exigida: ${numericMinChars} caracteres (O aluno escreveu exatamente ${charCountActual} caracteres e ${wordCountActual} palavras)
- Nota Máxima desta Questão Dissertativa: ${numericMaxScore} pontos

=== RESPOSTA REAL DO ALUNO ===
"""
${essayAnswer.trim()}
"""

INSTRUÇÕES OBRIGATÓRIAS PARA OS 4 CRITÉRIOS + AUTORIA + NOTA:
1. "themeFidelity": Verifique se a resposta realmente responde ao enunciado. Cite pelo menos uma ideia ou trecho concreto escrito pelo aluno. Se o aluno fugiu do tema, respondeu de forma vazia ("não sei", frase solta) ou ficou no senso comum, aponte isso diretamente e reduza a nota proporcionalmente.
2. "keywordsCheck": Se houver palavras-chave esperadas, liste exatamente quais apareceram e quais faltaram. Se não houver lista fixa, indique quais conceitos sociológicos o aluno utilizou corretamente e quais conceitos-chave do enunciado faltaram.
3. "structureCheck": Avalie a extensão real (${charCountActual}/${numericMinChars} caracteres), divisão em parágrafos, coesão e progressão lógica (início, desenvolvimento e conclusão).
4. "grammarCheck": Faça uma revisão normativa REAL do texto do aluno: cite literalmente palavras escritas com erro de ortografia, acentuação, concordância, regência ou pontuação (ex.: "escreveu 'nao' em vez de 'não'") ou elogie de forma específica se não houver erros.
5. "aiUsagePercentage" (número de 0 a 100) e "aiUsageAnalysis": Estime a probabilidade de texto gerado por IA analisando o estilo, vocabulário, conectivos e naturalidade escolar do texto.
6. "suggestedScore" (número entre 0.0 e ${numericMaxScore} com 1 casa decimal): Calcule a nota de forma coerente e diferenciada:
   - Resposta vazia, "não sei" ou totalmente fora do tema: 0.0 a ${(numericMaxScore * 0.2).toFixed(1)}
   - Resposta superficial, incompleta ou muito abaixo dos caracteres: ${(numericMaxScore * 0.25).toFixed(1)} a ${(numericMaxScore * 0.55).toFixed(1)}
   - Resposta boa com lacunas conceituais ou desvios gramaticais: ${(numericMaxScore * 0.6).toFixed(1)} a ${(numericMaxScore * 0.85).toFixed(1)}
   - Resposta completa, bem fundamentada, dentro da extensão e bem escrita: ${(numericMaxScore * 0.86).toFixed(1)} a ${numericMaxScore.toFixed(1)}
7. "feedback": Parecer pedagógico direto ao aluno (máximo 420 caracteres), mencionando o ponto forte concreto da resposta dele e o ajuste exato para evoluir (sem colar o gabarito bruto).

Retorne EXCLUSIVAMENTE um JSON válido com as chaves exatas:
{
  "suggestedScore": 0.0,
  "feedback": "...",
  "themeFidelity": "...",
  "keywordsCheck": "...",
  "structureCheck": "...",
  "grammarCheck": "...",
  "aiUsagePercentage": 0,
  "aiUsageAnalysis": "..."
}`;

  const { text: aiText, modelUsed, lastErrorMsg } = await generateContentWithFallback(ai, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      temperature: 0.25,
    },
    routeTag: 'correct-essay',
    validateText: (txt) => {
      const p = extractJson(txt);
      return Boolean(p && typeof p === 'object');
    },
  });

  if (aiText && modelUsed) {
    const parsed = extractJson(aiText);
    const rawScore = Number(parsed?.suggestedScore);
    const safeScore = Number.isFinite(rawScore)
      ? Math.max(0, Math.min(numericMaxScore, Number(rawScore.toFixed(1))))
      : Number((numericMaxScore * 0.5).toFixed(1));
    const rawAiPct = Number(parsed?.aiUsagePercentage);
    const safeAiPct = Number.isFinite(rawAiPct) ? Math.max(0, Math.min(100, Math.round(rawAiPct))) : 0;

    return NextResponse.json({
      suggestedScore: safeScore,
      feedback: String(parsed?.feedback || '').trim(),
      themeFidelity: String(parsed?.themeFidelity || '').trim(),
      keywordsCheck: String(parsed?.keywordsCheck || '').trim(),
      structureCheck: String(parsed?.structureCheck || '').trim(),
      grammarCheck: String(parsed?.grammarCheck || '').trim(),
      aiUsagePercentage: safeAiPct,
      aiUsageAnalysis: String(parsed?.aiUsageAnalysis || '').trim(),
      analysisSource: 'gemini',
      modelUsed,
    });
  }

  return NextResponse.json(
    generateDynamicLocalAnalysis(
      essayAnswer,
      questionStatement || activityTitle,
      keywords,
      turma,
      numericMaxScore,
      numericMinChars,
      lastErrorMsg || 'Modelos Gemini temporariamente indisponíveis.'
    )
  );
}
