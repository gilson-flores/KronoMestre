import { Activity, ActivityQuestion } from './types';

/**
 * Cria o objeto da Atividade Adaptada para Deficiências Leves e Moderadas
 * gerado através do modelo de IA Gemini.
 */
export function createAdaptedMildModerateActivity(
  activity: Activity,
  adaptedData: {
    adaptedTitle?: string;
    adaptedDescription?: string;
    questions: ActivityQuestion[];
  }
): Activity {
  const titlePrefix = activity.title.startsWith('[PNE Leve/Mod]') || activity.title.startsWith('[Adaptada PNE]')
    ? ''
    : '[PNE Leve/Mod] ';

  return {
    ...activity,
    id: `act-pne-mild-${Date.now()}`,
    title: adaptedData.adaptedTitle || `${titlePrefix}${activity.title}`,
    description: adaptedData.adaptedDescription || activity.description || 'Atividade adaptada pedagogicamente por IA para Deficiências Leves e Moderadas (AEE).',
    isAdapted: true,
    adaptationType: 'mild_moderate',
    adaptedFromId: activity.id,
    questions: adaptedData.questions,
    submissions: [],
    totalSubmissions: 0,
    pendingCorrection: 0,
  };
}

/**
 * Cria o objeto da Atividade Adaptada para Síndromes Severas (Jogo Lúdico Interativo)
 * gerado através do modelo de IA Gemini.
 */
export function createAdaptedSeverePlayfulActivity(
  activity: Activity,
  playfulHtml: string,
  playfulTitle?: string
): Activity {
  const titlePrefix = activity.title.startsWith('[PNE Lúdica]') || activity.title.startsWith('[Adaptada PNE]')
    ? ''
    : '[PNE Lúdica] ';

  return {
    ...activity,
    id: `act-pne-severe-${Date.now()}`,
    title: playfulTitle || `${titlePrefix}${activity.title}`,
    description: activity.description
      ? `${activity.description}\n\n[Adaptação Lúdica PNE Severa: Jogo interativo gamificado com perguntas visuais, sons e contagem de pontuação gerado por IA Gemini]`
      : 'Jogo interativo lúdico adaptado para alunos com necessidades severas, com feedback audiovisual e contagem de estrelas/pontos gerado pelo Gemini.',
    isAdapted: true,
    adaptationType: 'severe_playful',
    playfulGameHtml: playfulHtml,
    playfulGameScoreMax: activity.maxGrade || 10,
    adaptedFromId: activity.id,
    questions: [], // O jogo interativo em HTML conduz a avaliação
    submissions: [],
    totalSubmissions: 0,
    pendingCorrection: 0,
  };
}
