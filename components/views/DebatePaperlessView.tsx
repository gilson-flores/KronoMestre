'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Users,
  FileText,
  Award,
  Clock,
  Scale,
  ShieldCheck,
  Send,
  UserCheck
} from 'lucide-react';
import {
  Activity,
  StudentUser,
  DebateConfig,
  DebateGuidingQuestion,
  DebateChecklistItem,
  DebateParticipant,
  DebateJurorVerdict,
} from '@/lib/types';

interface DebatePaperlessViewProps {
  activity: Activity;
  student: StudentUser;
  allStudents?: StudentUser[];
  debateConfig?: DebateConfig;
  onClose: () => void;
  onFinishGame?: (finalScore: number, groupMembersStr?: string) => void;
}

function createDefaultDebateConfig(activity: Activity): DebateConfig {
  const safeTopic = activity.title.replace(/^\[KronoGame\]\s*/i, '') || 'Tema Sociológico';
  const lines = (activity.supportMaterial || activity.description || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 8);

  const proAxes = [
    'Fundamentos históricos e conquistas sociais',
    'Dados empíricos e impactos positivos na cidadania',
    'Conceitos sociológicos de coesão e direitos',
    'Exemplos práticos na realidade brasileira',
    'Políticas públicas e fortalecimento democrático',
    'Síntese propositiva para a defesa da Bancada Pró',
  ];

  const contraAxes = [
    'Contradições estruturais e limites práticos',
    'Crítica sociológica às desigualdades e assimetrias de poder',
    'Dados empíricos sobre exclusão ou efeitos colaterais',
    'Análise de interesses hegemônicos e ideologia',
    'Impactos críticos no cotidiano da população brasileira',
    'Síntese de refutação para a defesa da Bancada Contra',
  ];

  return {
    maxJurors: 3,
    proQuestions: proAxes.map((axis, idx) => ({
      id: `pro_q_${idx + 1}`,
      number: idx + 1,
      side: 'pro',
      sociologicalConcept: lines[idx] ? lines[idx].slice(0, 55) : axis,
      prompt: `[Questão Norteadora PRÓ #${idx + 1}] Sobre "${safeTopic}" (${lines[idx] || axis}): pesquise e redija argumentos sociológicos e dados que sustentem a posição FAVORÁVEL da sua bancada.`,
      researchHint: 'Cite conceitos sociológicos trabalhados em aula, dados estatísticos ou exemplos históricos brasileiros.',
    })),
    contraQuestions: contraAxes.map((axis, idx) => ({
      id: `contra_q_${idx + 1}`,
      number: idx + 1,
      side: 'contra',
      sociologicalConcept: lines[idx] ? lines[idx].slice(0, 55) : axis,
      prompt: `[Questão Norteadora CONTRA #${idx + 1}] Sobre "${safeTopic}" (${lines[idx] || axis}): pesquise e redija argumentos críticos e evidências que sustentem o CONTRAPONTO da sua bancada.`,
      researchHint: 'Aponte tensões estruturais, limites práticos, relações de poder e dados que problematizem a tese.',
    })),
    jurorQuestions: proAxes.map((axis, idx) => ({
      id: `juror_q_${idx + 1}`,
      number: idx + 1,
      side: 'juror',
      sociologicalConcept: lines[idx] ? lines[idx].slice(0, 55) : axis,
      prompt: `[Questão Preparatória JURADOS #${idx + 1}] Sobre "${safeTopic}" (${lines[idx] || axis}): pesquise os fundamentos sociológicos e critérios de verificação para julgar com imparcialidade tanto a Bancada Pró quanto a Bancada Contra neste eixo.`,
      researchHint: 'Identifique quais dados reais e conceitos sociológicos cada lado precisará comprovar na apresentação.',
    })),
    checklistCriteria: [
      { id: 'chk_1', number: 1, criterion: 'Domínio Conceitual Sociológico', description: 'Utilizou corretamente conceitos e autores da Sociologia pertinentes ao tema?' },
      { id: 'chk_2', number: 2, criterion: 'Uso de Dados e Evidências Reais', description: 'Apresentou fatos históricos, estatísticas ou exemplos concretos da realidade brasileira?' },
      { id: 'chk_3', number: 3, criterion: 'Articulação com o Resumo do Grupo', description: 'Seguiu a linha argumentativa construída nas 6 questões pesquisadas pela bancada?' },
      { id: 'chk_4', number: 4, criterion: 'Consistência na Réplica e Tréplica', description: 'Respondeu diretamente aos argumentos adversários sem recorrer a falácias ou senso comum?' },
      { id: 'chk_5', number: 5, criterion: 'Respeito ao Tempo (Timer KronoMestre)', description: 'Cumpriu rigorosamente o tempo de exposição, réplica, tréplica e considerações finais?' },
      { id: 'chk_6', number: 6, criterion: 'Postura Ética e Democrática', description: 'Manteve o respeito mútuo, a escuta ativa e a organização em equipe?' },
    ],
    jurorInitialGuide: `Vocês 3 compõem o Corpo de Jurados sobre "${safeTopic}". Acompanhem os resumos gerados pela IA e avaliem as Bancadas Pró e Contra usando os 2 Checklists de 6 itens (Cumpriu / Não Cumpriu).`,
    participants: [],
    proAnswers: {},
    contraAnswers: {},
    proResearchCompleted: false,
    contraResearchCompleted: false,
    jurorVerdicts: [],
    gradingMode: 'group',
    groupGrades: {
      proResearchGrade: 5,
      proPresentationGrade: 5,
      contraResearchGrade: 5,
      contraPresentationGrade: 5,
      jurorsGrade: 10,
    },
    individualGrades: {},
  };
}

export const DebatePaperlessView: React.FC<DebatePaperlessViewProps> = ({
  activity,
  student,
  allStudents = [],
  debateConfig: propDebateConfig,
  onClose,
  onFinishGame,
}) => {
  const storageKey = `krono_debate_state_${activity.id}`;

  // Inicializa o estado combinando propDebateConfig + fallback + localStorage para persistência entre aulas
  const [debateState, setDebateState] = useState<DebateConfig>(() => {
    const base = createDefaultDebateConfig(activity);
    const merged: DebateConfig = {
      ...base,
      ...(propDebateConfig || {}),
      proQuestions:
        propDebateConfig?.proQuestions && propDebateConfig.proQuestions.length === 6
          ? propDebateConfig.proQuestions
          : base.proQuestions,
      contraQuestions:
        propDebateConfig?.contraQuestions && propDebateConfig.contraQuestions.length === 6
          ? propDebateConfig.contraQuestions
          : base.contraQuestions,
      checklistCriteria:
        propDebateConfig?.checklistCriteria && propDebateConfig.checklistCriteria.length === 6
          ? propDebateConfig.checklistCriteria
          : base.checklistCriteria,
    };

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            ...merged,
            ...parsed,
            proQuestions: merged.proQuestions,
            contraQuestions: merged.contraQuestions,
            checklistCriteria: merged.checklistCriteria,
          };
        }
      } catch {
        // ignore storage errors
      }
    }
    return merged;
  });

  // Salva automaticamente em localStorage e sincroniza com activity.gameData.debateConfig
  const updateDebateState = (updater: (prev: DebateConfig) => DebateConfig) => {
    setDebateState((prev) => {
      const next = updater(prev);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      if (activity.gameData) {
        activity.gameData.debateConfig = next;
      }
      return next;
    });
  };

  // Verifica se o aluno já estava cadastrado em algum papel
  const existingEnrollment = useMemo(() => {
    return (debateState.participants || []).find((p) => p.studentId === student.id || p.studentName === student.name);
  }, [debateState.participants, student.id, student.name]);

  const [debateRole, setDebateRole] = useState<'pro' | 'contra' | 'juror' | null>(
    existingEnrollment ? existingEnrollment.role : null
  );

  // Abas principais:
  // 'research' (Fase 2: 6 questões norteadoras Pró/Contra)
  // 'summaries' (Fase 3, 5, 6, 7: 3 Resumos IA compartilhados por grupo)
  // 'timer_arena' (Fase 8: Painel do Professor com Timer de Exposição, Réplica, Tréplica e Conclusão)
  // 'juror_checklists' (Fase 9 e 10: 2 Checklists Cumpriu/Não Cumpriu + Parecer dos Jurados)
  // 'teacher_grading' (Fase 4, 10 e 11: Lançamento de Notas Individual ou em Grupo pelo Professor)
  const [activeTab, setActiveTab] = useState<'research' | 'summaries' | 'timer_arena' | 'juror_checklists' | 'teacher_grading'>('research');

  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Estados locais para os 2 Checklists do Jurado atual
  const existingVerdict = useMemo(() => {
    return (debateState.jurorVerdicts || []).find((v) => v.jurorId === student.id || v.jurorName === student.name);
  }, [debateState.jurorVerdicts, student.id, student.name]);

  const [jurorProChecklist, setJurorProChecklist] = useState<Record<string, boolean>>(existingVerdict?.proChecklist || {});
  const [jurorContraChecklist, setJurorContraChecklist] = useState<Record<string, boolean>>(existingVerdict?.contraChecklist || {});
  const [jurorOpinion, setJurorOpinion] = useState<string>(existingVerdict?.writtenOpinion || '');
  const [winnerVote, setWinnerVote] = useState<'pro' | 'contra' | 'empate'>(existingVerdict?.winnerVote || 'empate');

  // Timer de Sala (Passo 8)
  const [timerSeconds, setTimerSeconds] = useState(180);
  const [timerActive, setTimerActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('Exposição Inicial das Bancadas');

  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => {
      setTimerSeconds((s) => {
        if (s <= 1) {
          setTimerActive(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Contadores de integrantes por papel
  const proMembers = useMemo(
    () => (debateState.participants || []).filter((p) => p.role === 'pro'),
    [debateState.participants]
  );
  const contraMembers = useMemo(
    () => (debateState.participants || []).filter((p) => p.role === 'contra'),
    [debateState.participants]
  );
  const jurorMembers = useMemo(
    () => (debateState.participants || []).filter((p) => p.role === 'juror'),
    [debateState.participants]
  );

  // Passo 1: Cadastrar aluno no papel escolhido (Pró, Contra ou Jurado máx. 3)
  const handleSelectRole = (role: 'pro' | 'contra' | 'juror') => {
    const isAlreadyJuror = jurorMembers.some((j) => j.studentId === student.id || j.studentName === student.name);
    if (role === 'juror' && jurorMembers.length >= 3 && !isAlreadyJuror) {
      alert('As 3 vagas do Corpo de Jurados já foram preenchidas! Escolha a Bancada Pró ou a Bancada Contra.');
      return;
    }

    updateDebateState((prev) => {
      const filtered = (prev.participants || []).filter(
        (p) => p.studentId !== student.id && p.studentName !== student.name
      );
      const nextParticipants: DebateParticipant[] = [
        ...filtered,
        {
          studentId: student.id,
          studentName: student.name || "Estudante",
          role,
          joinedAt: new Date().toISOString(),
        },
      ];
      return { ...prev, participants: nextParticipants };
    });

    setDebateRole(role);
    if (role === 'juror') {
      setActiveTab('summaries');
    } else {
      setActiveTab('research');
    }
  };

  // Atualizar resposta de uma das 6 questões norteadoras (sincronizado com o grupo)
  const handleAnswerChange = (side: 'pro' | 'contra', questionId: string, value: string) => {
    updateDebateState((prev) => {
      if (side === 'pro') {
        return { ...prev, proAnswers: { ...(prev.proAnswers || {}), [questionId]: value } };
      } else {
        return { ...prev, contraAnswers: { ...(prev.contraAnswers || {}), [questionId]: value } };
      }
    });
  };

  // Passo 3: Finalizar pesquisa e gerar os 3 resumos com a IA (Pró, Contra e Guia dos Jurados)
  const handleGenerateSummaries = async () => {
    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/gemini/debate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activity.title,
          topic: activity.description || activity.title,
          subject: activity.subject || 'Sociologia',
          supportMaterial: activity.supportMaterial || '',
          proQuestions: debateState.proQuestions,
          contraQuestions: debateState.contraQuestions,
          proAnswers: debateState.proAnswers || {},
          contraAnswers: debateState.contraAnswers || {},
        }),
      });

      if (!res.ok) throw new Error('Falha ao gerar resumos');
      const data = await res.json();

      updateDebateState((prev) => ({
        ...prev,
        proSummary: data.proSummary || prev.proSummary,
        contraSummary: data.contraSummary || prev.contraSummary,
        jurorGuideSummary: data.jurorGuideSummary || prev.jurorGuideSummary,
        proResearchCompleted: debateRole === 'pro' ? true : prev.proResearchCompleted,
        contraResearchCompleted: debateRole === 'contra' ? true : prev.contraResearchCompleted,
      }));

      setStatusMessage('✅ Pesquisa concluída! Os 3 resumos (Pró, Contra e Guia dos Jurados) foram gerados pela IA e já estão visíveis para todo o grupo.');
      setActiveTab('summaries');
    } catch (err) {
      console.error(err);
      alert('Houve um erro ao gerar os resumos. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Passo 9 e 10: Enviar os 2 Checklists e o Parecer dos Jurados
  const handleSubmitJurorVerdict = () => {
    const newVerdict: DebateJurorVerdict = {
      jurorId: student.id,
      jurorName: student.name || "Jurado",
      proChecklist: jurorProChecklist,
      contraChecklist: jurorContraChecklist,
      writtenOpinion: jurorOpinion,
      winnerVote,
      submittedAt: new Date().toISOString(),
    };

    updateDebateState((prev) => {
      const others = (prev.jurorVerdicts || []).filter(
        (v) => v.jurorId !== student.id && v.jurorName !== student.name
      );
      return {
        ...prev,
        jurorVerdicts: [...others, newVerdict],
      };
    });

    setStatusMessage('⚖️ Parecer e os 2 Checklists (Pró e Contra) enviados com sucesso ao Painel do Professor!');
    setActiveTab('teacher_grading');
  };

  // Passo 4, 10 e 11: Lançar nota final (Em Grupo ou Individual)
  const handleApplyFinalGrade = () => {
    const gGrades = debateState.groupGrades || {
      proResearchGrade: 5,
      proPresentationGrade: 5,
      contraResearchGrade: 5,
      contraPresentationGrade: 5,
      jurorsGrade: 10,
    };

    let calculatedScore = 10;
    let groupNames = student.name;

    if (debateState.gradingMode === 'individual' && debateState.individualGrades?.[student.id]) {
      calculatedScore = debateState.individualGrades[student.id].finalGrade;
    } else if (debateRole === 'pro') {
      calculatedScore = Number(((gGrades.proResearchGrade || 5) + (gGrades.proPresentationGrade || 5)).toFixed(1));
      if (proMembers.length > 0) {
        groupNames = proMembers.map((m) => m.studentName).join(', ');
      }
    } else if (debateRole === 'contra') {
      calculatedScore = Number(((gGrades.contraResearchGrade || 5) + (gGrades.contraPresentationGrade || 5)).toFixed(1));
      if (contraMembers.length > 0) {
        groupNames = contraMembers.map((m) => m.studentName).join(', ');
      }
    } else if (debateRole === 'juror') {
      calculatedScore = Number((gGrades.jurorsGrade || 10).toFixed(1));
      if (jurorMembers.length > 0) {
        groupNames = jurorMembers.map((m) => m.studentName).join(', ');
      }
    }

    if (onFinishGame) {
      onFinishGame(Math.min(10, Math.max(0, calculatedScore)), groupNames);
    }
    setStatusMessage(`🏆 Nota consolidada (${calculatedScore.toFixed(1)} / 10) registrada para ${groupNames}!`);
  };

  // Contabiliza acertos nos checklists para exibir resumo ao professor
  const countChecklistPositive = (chkMap: Record<string, boolean>) =>
    Object.values(chkMap).filter((v) => v === true).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-[#09101f] border border-cyan-500/40 rounded-3xl max-w-5xl w-full p-5 sm:p-7 space-y-6 shadow-2xl text-slate-100 my-6 max-h-[94vh] overflow-y-auto">
        
        {/* Cabeçalho Oficial do Debate */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                🎙️ Debate Sociológico Sem Papel
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Turma {activity.turma}
              </span>
              <span className="text-[11px] text-slate-400">
                Participante: <strong className="text-white">{student.name}</strong>
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white mt-1.5">{activity.title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer self-end sm:self-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de Status */}
        {statusMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn">
            <span>{statusMessage}</span>
            <button type="button" onClick={() => setStatusMessage(null)} className="text-emerald-300 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* =====================================================================
            PASSO 1: LOBBY DE INSCRIÇÃO DE PAPÉIS (PRÓ, CONTRA E 3 JURADOS)
        ===================================================================== */}
        {debateRole === null ? (
          <div className="space-y-6 py-2 animate-fadeIn">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <h3 className="text-base sm:text-lg font-black text-white">
                Passo 1: Cadastre-se no seu Grupo do Debate (Pró, Contra ou Jurados)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                1) As bancadas <strong>Pró</strong> e <strong>Contra</strong> respondem a 6 questões dissertativas norteadoras (Peso 5) e recebem um resumo estratégico exclusivo da IA para o grupo.<br />
                2) Os <strong>3 Jurados</strong> recebem o guia de julgamento da IA e avaliam o debate com 2 Checklists (Cumpriu / Não Cumpriu).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Card Bancada Pró */}
              <button
                type="button"
                onClick={() => handleSelectRole('pro')}
                className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 hover:bg-emerald-900/40 hover:border-emerald-400 transition-all text-left space-y-3 cursor-pointer group shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-black text-xs">
                      🏛️ BANCADA PRÓ
                    </span>
                    <span className="text-[11px] text-emerald-300 font-bold">
                      {proMembers.length} inscrito(s)
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-white">Grupo Favorável (Pró)</h4>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Pesquisa as <strong>6 questões dissertativas norteadoras Pró</strong>. Todos do grupo enxergam o mesmo resumo gerado pela IA.
                  </p>
                  {proMembers.length > 0 && (
                    <p className="text-[10px] text-emerald-300/80 truncate">
                      Integrantes: {proMembers.map((m) => m.studentName).join(', ')}
                    </p>
                  )}
                </div>
                <span className="text-xs font-black text-emerald-400 block pt-2 group-hover:translate-x-1 transition-transform">
                  Cadastrar na Bancada Pró →
                </span>
              </button>

              {/* Card Bancada Contra */}
              <button
                type="button"
                onClick={() => handleSelectRole('contra')}
                className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/40 hover:bg-rose-900/40 hover:border-rose-400 transition-all text-left space-y-3 cursor-pointer group shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-xl bg-rose-500/20 border border-rose-400 text-rose-300 font-black text-xs">
                      🏛️ BANCADA CONTRA
                    </span>
                    <span className="text-[11px] text-rose-300 font-bold">
                      {contraMembers.length} inscrito(s)
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-white">Grupo Oposição (Contra)</h4>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Pesquisa as <strong>6 questões dissertativas norteadoras Contra</strong>. Todos do grupo enxergam o mesmo resumo gerado pela IA.
                  </p>
                  {contraMembers.length > 0 && (
                    <p className="text-[10px] text-rose-300/80 truncate">
                      Integrantes: {contraMembers.map((m) => m.studentName).join(', ')}
                    </p>
                  )}
                </div>
                <span className="text-xs font-black text-rose-400 block pt-2 group-hover:translate-x-1 transition-transform">
                  Cadastrar na Bancada Contra →
                </span>
              </button>

              {/* Card 3 Jurados */}
              <button
                type="button"
                onClick={() => handleSelectRole('juror')}
                className={`p-5 rounded-2xl border text-left space-y-3 transition-all shadow-lg flex flex-col justify-between ${
                  jurorMembers.length >= 3
                    ? 'bg-slate-900/60 border-slate-800 opacity-60 cursor-not-allowed'
                    : 'bg-amber-950/30 border-amber-500/40 hover:bg-amber-900/40 hover:border-amber-400 cursor-pointer group'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-black text-xs">
                      ⚖️ JURADOS
                    </span>
                    <span className="text-[11px] text-amber-300 font-bold">
                      {jurorMembers.length} / 3 vagas
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-white">Corpo de Jurados (Máx. 3)</h4>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Recebe o <strong>Resumo Guia dos Jurados</strong> e julga os dois lados usando <strong>2 Checklists</strong> (Cumpriu / Não Cumpriu).
                  </p>
                  {jurorMembers.length > 0 && (
                    <p className="text-[10px] text-amber-300/80 truncate">
                      Jurados: {jurorMembers.map((m) => m.studentName).join(', ')}
                    </p>
                  )}
                </div>
                <span className="text-xs font-black text-amber-400 block pt-2">
                  {jurorMembers.length >= 3 ? 'Vagas de Jurados Preenchidas (3/3)' : 'Cadastrar como Jurado →'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* =====================================================================
              FLUXO COMPLETO DO DEBATE (ETAPAS 2 A 11)
          ===================================================================== */
          <div className="space-y-5">
            {/* Barra de Navegação entre as Fases do Debate */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  debateRole === 'pro'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : debateRole === 'contra'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {debateRole === 'pro' ? '🏛️ Bancada Pró' : debateRole === 'contra' ? '🏛️ Bancada Contra' : '⚖️ Jurado (a)'}
                </span>
                <button
                  type="button"
                  onClick={() => setDebateRole(null)}
                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Trocar Papel
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('research')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'research'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  📝 1. Pesquisa (6 Questões)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('summaries')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'summaries'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  📖 2. Resumos do Grupo (IA)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('timer_arena')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'timer_arena'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  ⏱️ 3. Painel Timer (Debate)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('juror_checklists')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'juror_checklists'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  ⚖️ 4. Checklists Jurados (2)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('teacher_grading')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'teacher_grading'
                      ? 'bg-purple-500 text-slate-950 font-black shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  🎓 5. Avaliação & Notas
                </button>
              </div>
            </div>

            {/* =====================================================================
                ABA 1 (PASSOS 2 e 3): 6 QUESTÕES DISSERTATIVAS NORTEADORAS (PRÓ E CONTRA)
            ===================================================================== */}
            {activeTab === 'research' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                      {debateRole === 'contra'
                        ? '📕 Questões Norteadoras Exclusivas • TIME CONTRA (Sigilo Total)'
                        : debateRole === 'juror'
                        ? '⚖️ Questões Preparatórias Exclusivas • CORPO DE JURADOS (Sigilo Total)'
                        : '📘 Questões Norteadoras Exclusivas • TIME PRÓ (Sigilo Total)'}
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Preencha as 6 questões da sua bancada. Assim que concluir, clique no botão no final para a IA gerar os <strong>3 textos-resumo (Pró, Contra e Jurados)</strong> e avançar para a próxima etapa!
                    </p>
                  </div>
                  {debateRole === 'juror' && (
                    <span className="text-[11px] px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-bold shrink-0">
                      Visão de Consulta do Jurado
                    </span>
                  )}
                </div>

                {/* Seletor rápido caso o professor ou jurado queira ver tanto as 6 questões Pró quanto as 6 Contra */}
                <div className="space-y-4 max-h-[430px] overflow-y-auto pr-1">
                  {(debateRole === 'contra'
                    ? debateState.contraQuestions
                    : debateRole === 'juror'
                    ? debateState.jurorQuestions || debateState.proQuestions
                    : debateState.proQuestions
                  ).map(
                    (q: DebateGuidingQuestion, idx: number) => {
                      const sideKey = debateRole === 'contra' ? 'contra' : 'pro';
                      const currentVal =
                        sideKey === 'pro'
                          ? debateState.proAnswers?.[q.id] || ''
                          : debateState.contraAnswers?.[q.id] || '';

                      return (
                        <div key={q.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-black ${sideKey === 'pro' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              Questão Norteadora {idx + 1} de 6 ({sideKey.toUpperCase()}) • {q.sociologicalConcept}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold">
                              Pesquisa em Grupo
                            </span>
                          </div>
                          <p className="text-xs text-white font-medium leading-relaxed">{q.prompt}</p>
                          <p className="text-[11px] text-cyan-300/80 italic">💡 O que pesquisar: {q.researchHint}</p>
                          <textarea
                            value={currentVal}
                            onChange={(e) => handleAnswerChange(sideKey, q.id, e.target.value)}
                            rows={3}
                            placeholder={`Digite aqui a pesquisa do grupo ${sideKey.toUpperCase()} para a questão ${idx + 1}...`}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      );
                    }
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleGenerateSummaries}
                    disabled={isGenerating}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm rounded-2xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-5 h-5 fill-current" />
                    <span>
                      {isGenerating
                        ? 'Gerando os 3 Resumos com a IA (Pró, Contra e Jurados)...'
                        : 'Concluir Pesquisa & Gerar Textos-Resumo com IA (Avançar para Fase 3) ✨'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* =====================================================================
                ABA 2 (PASSOS 3, 5, 6 e 7): UM RESUMO PARA CADA GRUPO (VISÃO COMPARTILHADA)
            ===================================================================== */}
            {activeTab === 'summaries' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                      📖 Passos 5, 6 e 7: Resumos Gerados pela IA (1 Resumo Exclusivo para Cada Grupo)
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Na aula do debate, todos os integrantes da mesma bancada enxergam o mesmo resumo e suas respostas para defender a tese. Os jurados enxergam seu guia do que julgar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateSummaries}
                    disabled={isGenerating}
                    className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-bold shrink-0 cursor-pointer"
                  >
                    {isGenerating ? 'Atualizando...' : '🔄 Regerar Resumos com IA'}
                  </button>
                </div>

                {/* ISOLAMENTO ESTRITO POR GRUPO: Cada time enxerga EXCLUSIVAMENTE o seu próprio resumo! */}
                <div className="p-5 rounded-2xl bg-slate-900 border-2 border-cyan-500/40 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-black text-cyan-300 uppercase">
                      {debateRole === 'pro'
                        ? '📘 Resumo Confidencial Exclusivo • TIME PRÓ (Visível apenas para integrantes Pró)'
                        : debateRole === 'contra'
                        ? '📕 Resumo Confidencial Exclusivo • TIME CONTRA (Visível apenas para integrantes Contra)'
                        : '⚖️ Guia de Julgamento Confidencial • CORPO DE JURADOS (Visível apenas para os 3 Jurados)'}
                    </h5>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-black uppercase">
                      🔒 Isolado dos outros grupos
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-100 whitespace-pre-wrap leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-[340px] overflow-y-auto">
                    {debateRole === 'pro'
                      ? debateState.proSummary || 'Conclua as 6 questões norteadoras na Aba 1 e clique em Gerar Resumos com IA para ver o dossiê exclusivo do Time Pró.'
                      : debateRole === 'contra'
                      ? debateState.contraSummary || 'Conclua as 6 questões norteadoras na Aba 1 e clique em Gerar Resumos com IA para ver o dossiê exclusivo do Time Contra.'
                      : debateState.jurorGuideSummary || debateState.jurorInitialGuide}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('timer_arena')}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    Ir para Aula do Debate & Timer (Passo 8) →
                  </button>
                </div>
              </div>
            )}

            {/* =====================================================================
                ABA 3 (PASSO 8): PAINEL DO PROFESSOR COM TIMER (RÉPLICA, TRÉPLICA, CONSIDERAÇÕES FINAIS)
            ===================================================================== */}
            {activeTab === 'timer_arena' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="p-6 rounded-3xl bg-slate-900 border-2 border-cyan-500/50 space-y-6 shadow-2xl text-center">
                  <div className="space-y-1">
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 uppercase">
                      ⏱️ Passo 8: Painel KronoMestre do Professor (Timer de Sala)
                    </span>
                    <h3 className="text-xl font-black text-white mt-2">{currentPhase}</h3>
                    <p className="text-xs text-slate-400">
                      Projete este cronômetro na TV/quadro enquanto os debatedores consultam seus resumos e os jurados preenchem os 2 checklists.
                    </p>
                  </div>

                  <div className="text-6xl sm:text-7xl font-black font-mono text-cyan-400 tracking-widest py-3">
                    {formatTimer(timerSeconds)}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setTimerActive(!timerActive)}
                      className={`px-6 py-3 rounded-xl font-black text-sm cursor-pointer ${
                        timerActive ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-950'
                      }`}
                    >
                      {timerActive ? '⏸ Pausar Timer' : '▶ Iniciar Timer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTimerActive(false);
                        setTimerSeconds(180);
                      }}
                      className="p-3 bg-slate-800 text-slate-300 hover:text-white rounded-xl cursor-pointer"
                      title="Reiniciar Timer"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Botões das 4 Fases Oficiais do Debate (Passo 8) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-slate-800">
                    {[
                      { title: '1. Exposição Inicial (Pró/Contra)', secs: 240 },
                      { title: '2. Réplica', secs: 180 },
                      { title: '3. Tréplica', secs: 180 },
                      { title: '4. Considerações Finais', secs: 120 },
                    ].map((phase) => (
                      <button
                        key={phase.title}
                        type="button"
                        onClick={() => {
                          setCurrentPhase(phase.title);
                          setTimerSeconds(phase.secs);
                          setTimerActive(false);
                        }}
                        className={`p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          currentPhase === phase.title
                            ? 'bg-cyan-500/20 border-cyan-400 text-white'
                            : 'bg-slate-950 hover:bg-slate-800 text-cyan-300 border-slate-800'
                        }`}
                      >
                        {phase.title} ({phase.secs / 60} min)
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab('juror_checklists')}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    Abrir os 2 Checklists dos Jurados (Passos 9 e 10) →
                  </button>
                </div>
              </div>
            )}

            {/* =====================================================================
                ABA 4 (PASSOS 9 e 10): 2 CHECKLISTS DOS JURADOS (LADO PRÓ E LADO CONTRA) + PARECER
            ===================================================================== */}
            {activeTab === 'juror_checklists' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 space-y-1">
                  <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                    ⚖️ Passos 9 e 10: Os 2 Checklists dos Jurados (Cumpriu / Não Cumpriu) & Envio de Parecer
                  </h4>
                  <p className="text-xs text-slate-300">
                    Os jurados avaliam separadamente a Bancada Pró (Checklist 1) e a Bancada Contra (Checklist 2) e enviam o parecer para o professor definir a nota.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* CHECKLIST 1: BANCADA PRÓ */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-black text-emerald-400 uppercase">
                        📘 Checklist 1: Julgamento da Bancada PRÓ
                      </h5>
                      <span className="text-[11px] font-bold text-emerald-300">
                        Cumpriu: {countChecklistPositive(jurorProChecklist)} / 6
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {debateState.checklistCriteria.map((chk: DebateChecklistItem) => (
                        <div key={`pro_${chk.id}`} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                          <span className="text-xs font-bold text-white block">
                            {chk.number}. {chk.criterion}
                          </span>
                          <p className="text-[11px] text-slate-400">{chk.description}</p>
                          <div className="flex items-center gap-4 pt-1">
                            <label className="flex items-center gap-1.5 text-xs text-emerald-300 cursor-pointer font-bold">
                              <input
                                type="radio"
                                name={`pro_chk_${chk.id}`}
                                checked={jurorProChecklist[chk.id] === true}
                                onChange={() => setJurorProChecklist({ ...jurorProChecklist, [chk.id]: true })}
                                className="accent-emerald-400"
                              />
                              <span>✓ Cumpriu</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-rose-300 cursor-pointer font-bold">
                              <input
                                type="radio"
                                name={`pro_chk_${chk.id}`}
                                checked={jurorProChecklist[chk.id] === false}
                                onChange={() => setJurorProChecklist({ ...jurorProChecklist, [chk.id]: false })}
                                className="accent-rose-400"
                              />
                              <span>✕ Não Cumpriu</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CHECKLIST 2: BANCADA CONTRA */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-rose-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-black text-rose-400 uppercase">
                        📕 Checklist 2: Julgamento da Bancada CONTRA
                      </h5>
                      <span className="text-[11px] font-bold text-rose-300">
                        Cumpriu: {countChecklistPositive(jurorContraChecklist)} / 6
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {debateState.checklistCriteria.map((chk: DebateChecklistItem) => (
                        <div key={`contra_${chk.id}`} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                          <span className="text-xs font-bold text-white block">
                            {chk.number}. {chk.criterion}
                          </span>
                          <p className="text-[11px] text-slate-400">{chk.description}</p>
                          <div className="flex items-center gap-4 pt-1">
                            <label className="flex items-center gap-1.5 text-xs text-emerald-300 cursor-pointer font-bold">
                              <input
                                type="radio"
                                name={`contra_chk_${chk.id}`}
                                checked={jurorContraChecklist[chk.id] === true}
                                onChange={() => setJurorContraChecklist({ ...jurorContraChecklist, [chk.id]: true })}
                                className="accent-emerald-400"
                              />
                              <span>✓ Cumpriu</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-rose-300 cursor-pointer font-bold">
                              <input
                                type="radio"
                                name={`contra_chk_${chk.id}`}
                                checked={jurorContraChecklist[chk.id] === false}
                                onChange={() => setJurorContraChecklist({ ...jurorContraChecklist, [chk.id]: false })}
                                className="accent-rose-400"
                              />
                              <span>✕ Não Cumpriu</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Parecer Escrito do Jurado */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-black text-amber-300 uppercase">
                      Parecer do Jurado sobre o Debate (Enviado para o Professor):
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Destaque argumentativo:</span>
                      {(['pro', 'contra', 'empate'] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setWinnerVote(opt)}
                          className={`px-2.5 py-1 rounded-lg font-bold uppercase cursor-pointer ${
                            winnerVote === opt ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {opt === 'pro' ? 'Bancada Pró' : opt === 'contra' ? 'Bancada Contra' : 'Equilíbrio'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={jurorOpinion}
                    onChange={(e) => setJurorOpinion(e.target.value)}
                    rows={3}
                    placeholder="Escreva o parecer analítico explicando como cada grupo utilizou os conceitos sociológicos e os dados pesquisados..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400"
                  />

                  <button
                    type="button"
                    onClick={handleSubmitJurorVerdict}
                    className="py-3 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Enviar 2 Checklists & Parecer ao Professor 🚀
                  </button>
                </div>
              </div>
            )}

            {/* =====================================================================
                ABA 5 (PASSOS 4, 10 e 11): PAINEL DE NOTAS DO PROFESSOR (INDIVIDUAL OU EM GRUPO)
            ===================================================================== */}
            {activeTab === 'teacher_grading' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black text-purple-300 uppercase tracking-wider">
                      🎓 Passos 4, 10 e 11: Decisão de Nota pelo Professor (Diante dos Resumos e Pareceres dos Jurados)
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Escolha se o lançamento de notas será <strong>Em Grupo</strong> (por Bancada Pró, Contra e Jurados) ou <strong>Individual</strong>.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateDebateState((p) => ({ ...p, gradingMode: 'group' }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                        debateState.gradingMode !== 'individual'
                          ? 'bg-purple-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      👥 Nota em Grupo
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDebateState((p) => ({ ...p, gradingMode: 'individual' }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                        debateState.gradingMode === 'individual'
                          ? 'bg-purple-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      👤 Nota Individual
                    </button>
                  </div>
                </div>

                {/* Pareceres Recebidos dos Jurados */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <h5 className="text-xs font-black text-amber-400 uppercase">
                    ⚖️ Pareceres e Checklists Recebidos dos Jurados ({(debateState.jurorVerdicts || []).length} / 3)
                  </h5>
                  {(debateState.jurorVerdicts || []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Nenhum jurado enviou parecer ainda. Assim que enviarem na Aba 4, os resultados aparecerão aqui.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(debateState.jurorVerdicts || []).map((v, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between font-bold text-amber-300">
                            <span>Jurado: {v.jurorName}</span>
                            <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-amber-500/20">
                              Voto: {v.winnerVote || 'Equilíbrio'}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-400">
                            • Checklist Pró: {countChecklistPositive(v.proChecklist || {})} / 6 critérios cumpridos
                          </p>
                          <p className="text-[11px] text-rose-400">
                            • Checklist Contra: {countChecklistPositive(v.contraChecklist || {})} / 6 critérios cumpridos
                          </p>
                          <p className="text-[11px] text-slate-300 pt-1 border-t border-slate-800">
                            &ldquo;{v.writtenOpinion || 'Sem observações adicionais.'}&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modo 1: Lançamento de Notas em Grupo */}
                {debateState.gradingMode !== 'individual' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Nota Bancada Pró */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-3">
                      <h5 className="text-xs font-black text-emerald-400 uppercase">🏛️ Nota Grupo PRÓ</h5>
                      <div className="space-y-2 text-xs">
                        <label className="block text-slate-300">
                          Nota Pesquisa & Resumo (0 a 5):
                          <input
                            type="number"
                            min={0}
                            max={5}
                            step={0.5}
                            value={debateState.groupGrades?.proResearchGrade ?? 5}
                            onChange={(e) =>
                              updateDebateState((p) => ({
                                ...p,
                                groupGrades: { ...(p.groupGrades || {}), proResearchGrade: Number(e.target.value) },
                              }))
                            }
                            className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </label>
                        <label className="block text-slate-300">
                          Nota Apresentação no Debate (0 a 5):
                          <input
                            type="number"
                            min={0}
                            max={5}
                            step={0.5}
                            value={debateState.groupGrades?.proPresentationGrade ?? 5}
                            onChange={(e) =>
                              updateDebateState((p) => ({
                                ...p,
                                groupGrades: { ...(p.groupGrades || {}), proPresentationGrade: Number(e.target.value) },
                              }))
                            }
                            className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </label>
                        <p className="text-xs font-black text-emerald-300 pt-1">
                          Média Final Grupo Pró:{' '}
                          {(
                            (debateState.groupGrades?.proResearchGrade ?? 5) +
                            (debateState.groupGrades?.proPresentationGrade ?? 5)
                          ).toFixed(1)}{' '}
                          / 10
                        </p>
                      </div>
                    </div>

                    {/* Nota Bancada Contra */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-rose-500/30 space-y-3">
                      <h5 className="text-xs font-black text-rose-400 uppercase">🏛️ Nota Grupo CONTRA</h5>
                      <div className="space-y-2 text-xs">
                        <label className="block text-slate-300">
                          Nota Pesquisa & Resumo (0 a 5):
                          <input
                            type="number"
                            min={0}
                            max={5}
                            step={0.5}
                            value={debateState.groupGrades?.contraResearchGrade ?? 5}
                            onChange={(e) =>
                              updateDebateState((p) => ({
                                ...p,
                                groupGrades: { ...(p.groupGrades || {}), contraResearchGrade: Number(e.target.value) },
                              }))
                            }
                            className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </label>
                        <label className="block text-slate-300">
                          Nota Apresentação no Debate (0 a 5):
                          <input
                            type="number"
                            min={0}
                            max={5}
                            step={0.5}
                            value={debateState.groupGrades?.contraPresentationGrade ?? 5}
                            onChange={(e) =>
                              updateDebateState((p) => ({
                                ...p,
                                groupGrades: { ...(p.groupGrades || {}), contraPresentationGrade: Number(e.target.value) },
                              }))
                            }
                            className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </label>
                        <p className="text-xs font-black text-rose-300 pt-1">
                          Média Final Grupo Contra:{' '}
                          {(
                            (debateState.groupGrades?.contraResearchGrade ?? 5) +
                            (debateState.groupGrades?.contraPresentationGrade ?? 5)
                          ).toFixed(1)}{' '}
                          / 10
                        </p>
                      </div>
                    </div>

                    {/* Nota Corpo de Jurados */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-3">
                      <h5 className="text-xs font-black text-amber-400 uppercase">⚖️ Nota Corpo de Jurados</h5>
                      <div className="space-y-2 text-xs">
                        <label className="block text-slate-300">
                          Nota pelos 2 Checklists & Parecer (0 a 10):
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.5}
                            value={debateState.groupGrades?.jurorsGrade ?? 10}
                            onChange={(e) =>
                              updateDebateState((p) => ({
                                ...p,
                                groupGrades: { ...(p.groupGrades || {}), jurorsGrade: Number(e.target.value) },
                              }))
                            }
                            className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </label>
                        <p className="text-xs font-black text-amber-300 pt-1">
                          Nota Final Jurados: {(debateState.groupGrades?.jurorsGrade ?? 10).toFixed(1)} / 10
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Modo 2: Lançamento de Notas Individuais */
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <h5 className="text-xs font-black text-purple-300 uppercase">
                      👤 Atribuição de Notas Individuais por Aluno Participante
                    </h5>
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {(debateState.participants || []).map((part) => {
                        const indiv = debateState.individualGrades?.[part.studentId] || {
                          researchGrade: 5,
                          presentationGrade: 5,
                          finalGrade: 10,
                        };
                        return (
                          <div
                            key={part.studentId}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <strong className="text-white">{part.studentName}</strong>{' '}
                              <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-slate-800 text-cyan-300 ml-1">
                                {part.role === 'pro' ? 'Pró' : part.role === 'contra' ? 'Contra' : 'Jurado'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] text-slate-400">
                                Pesquisa (0-5):
                                <input
                                  type="number"
                                  min={0}
                                  max={5}
                                  step={0.5}
                                  value={indiv.researchGrade}
                                  onChange={(e) => {
                                    const r = Number(e.target.value);
                                    const f = Number((r + indiv.presentationGrade).toFixed(1));
                                    updateDebateState((p) => ({
                                      ...p,
                                      individualGrades: {
                                        ...(p.individualGrades || {}),
                                        [part.studentId]: { ...indiv, researchGrade: r, finalGrade: f },
                                      },
                                    }));
                                  }}
                                  className="w-16 ml-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                                />
                              </label>
                              <label className="text-[11px] text-slate-400">
                                Debate (0-5):
                                <input
                                  type="number"
                                  min={0}
                                  max={5}
                                  step={0.5}
                                  value={indiv.presentationGrade}
                                  onChange={(e) => {
                                    const pr = Number(e.target.value);
                                    const f = Number((indiv.researchGrade + pr).toFixed(1));
                                    updateDebateState((p) => ({
                                      ...p,
                                      individualGrades: {
                                        ...(p.individualGrades || {}),
                                        [part.studentId]: { ...indiv, presentationGrade: pr, finalGrade: f },
                                      },
                                    }));
                                  }}
                                  className="w-16 ml-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                                />
                              </label>
                              <span className="font-black text-emerald-400 ml-2">
                                Total: {indiv.finalGrade.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleApplyFinalGrade}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg cursor-pointer"
                  >
                    Consolidar e Salvar Notas do Debate no Diário 🏆
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
