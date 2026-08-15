'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  PlusCircle,
  FileText,
  UploadCloud,
  Eye,
  Download,
  Trash2,
  BookOpen,
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Layers,
  FileSpreadsheet,
  Clock,
  Users,
  ChevronDown,
  Check,
  Send,
  Bot,
  Loader2,
  MessageSquare,
  Link2
} from 'lucide-react';
import { PlanningItem, StudentUser, GuidingDocumentSlot } from '@/lib/types';
import { DEFAULT_TURMAS } from '@/lib/studentUtils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const INITIAL_PLANNINGS: PlanningItem[] = [];

const DEFAULT_GUIDING_DOCS: GuidingDocumentSlot[] = [
  {
    id: 'planejamento_anual',
    categoryName: 'Planejamento Anual (PDF / .gdoc)',
  },
  {
    id: 'calendario_joinville',
    categoryName: 'Calendário Escolar Oficial de Joinville (PDF / .gdoc)',
  },
  {
    id: 'livro_referencia',
    categoryName: 'Livro Didático de Referência (Sociologia em Movimento 2024 - PDF / .gdoc)',
  },
  {
    id: 'modelo_plano_aula',
    categoryName: 'Modelo Oficial SED-SC — Plano de Aula',
  },
  {
    id: 'modelo_sequencia_didatica',
    categoryName: 'Modelo Oficial SED-SC — Sequência Didática',
  },
  {
    id: 'logo_estado',
    categoryName: 'Logotipo Oficial do Estado de Santa Catarina (logo_estado.png)',
  },
];

const generateUniqueId = (): string => {
  return `plan-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

interface PlanningViewProps {
  students?: StudentUser[];
}

export const PlanningView: React.FC<PlanningViewProps> = ({ students = [] }) => {
  const [plannings, setPlannings] = useState<PlanningItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sociologia_plannings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.filter((item: PlanningItem) => item.id !== 'plan-1' && item.id !== 'plan-2');
        } catch {
          return INITIAL_PLANNINGS;
        }
      }
    }
    return INITIAL_PLANNINGS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sociologia_plannings', JSON.stringify(plannings));
    }
  }, [plannings]);

  // Modal states
  const [activeModal, setActiveModal] = useState<'create_seq' | 'create_annual' | 'import_doc' | 'view' | 'ai_chat' | 'delete_confirm' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanningItem | null>(null);
  const [planToDelete, setPlanToDelete] = useState<{ id: string; title: string } | null>(null);

  // Gemini AI Chat State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHistory, setAiHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [userChatMessage, setUserChatMessage] = useState('');
  const [currentAiPlanId, setCurrentAiPlanId] = useState<string | null>(null);

  // Success / Error messages
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for Sequência Didática
  const [seqTitle, setSeqTitle] = useState('Nova Sequência Didática');
  const [seqSerie, setSeqSerie] = useState('1ª Série Regular');
  const [seqSubject, setSeqSubject] = useState('Sociologia');
  const [seqTrimestre, setSeqTrimestre] = useState('1º Trimestre');
  const [seqStartDate, setSeqStartDate] = useState('');
  const [seqEndDate, setSeqEndDate] = useState('');
  const [seqDriveUrl, setSeqDriveUrl] = useState('https://drive.google.com/drive/folders/ee-b-prof-jandira-davila-planos-individuais');
  const [selectedTurmasCodes, setSelectedTurmasCodes] = useState<string[]>([]);
  const [isTurmaDropdownOpen, setIsTurmaDropdownOpen] = useState(false);
  const [turmaSchedules, setTurmaSchedules] = useState<Record<string, { days: string[]; format: string }>>({});

  // Form states for Plano Anual / Import
  const [formTitle, setFormTitle] = useState('');
  const [formTurmas, setFormTurmas] = useState('1ª, 2ª e 3ª Séries');
  const [formPeriod, setFormPeriod] = useState('Anual (1º ao 3º Tri)');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formObjectives, setFormObjectives] = useState('');
  const [importFileText, setImportFileText] = useState('');

  // Guiding Documents state
  const [guidingDocs, setGuidingDocs] = useState<GuidingDocumentSlot[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sociologia_guiding_docs');
        if (saved) {
          const parsed: GuidingDocumentSlot[] = JSON.parse(saved);
          return DEFAULT_GUIDING_DOCS.map((def) => {
            const found = parsed.find((p) => p.id === def.id);
            return found ? { ...def, ...found } : def;
          });
        }
      } catch (e) {
        console.error('Erro ao ler documentos norteadores:', e);
      }
    }
    return DEFAULT_GUIDING_DOCS;
  });

  // Sincronização e persistência dos documentos norteadores com o Supabase
  useEffect(() => {
    const syncFromSupabase = async () => {
      if (!isSupabaseConfigured || !supabase) return;
      try {
        const { data } = await supabase
          .from('library_files')
          .select('*')
          .eq('category', 'Documento Norteador');

        if (data && data.length > 0) {
          setGuidingDocs((prev) =>
            prev.map((slot) => {
              const found = data.find((d) => d.id === `guiding_${slot.id}`);
              if (found && found.file_url) {
                return {
                  ...slot,
                  fileName: found.title,
                  fileSize: found.file_size || '1 MB',
                  uploadedAt: found.updated_at || new Date().toLocaleDateString('pt-BR'),
                  fileData: found.file_url,
                };
              }
              return slot;
            })
          );
        }
      } catch (err) {
        console.warn('Erro ao carregar documentos do Supabase:', err);
      }
    };

    syncFromSupabase();
  }, []);

  const saveDocToSupabase = async (slotId: string, fileName: string, fileSize: string, fileData: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const slotObj = DEFAULT_GUIDING_DOCS.find((s) => s.id === slotId);
      await supabase.from('library_files').upsert({
        id: `guiding_${slotId}`,
        title: fileName,
        category: 'Documento Norteador',
        turma: 'Todas',
        file_size: fileSize,
        updated_at: new Date().toLocaleDateString('pt-BR'),
        file_url: fileData,
        drive_url: slotObj?.categoryName || 'Documento Norteador',
      });
    } catch (err) {
      console.warn('Erro ao salvar documento no Supabase:', err);
    }
  };

  const removeDocFromSupabase = async (slotId: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      await supabase.from('library_files').delete().eq('id', `guiding_${slotId}`);
    } catch (err) {
      console.warn('Erro ao remover documento do Supabase:', err);
    }
  };

  const [activeSlotForUpload, setActiveSlotForUpload] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const triggerFileInput = (slotId: string) => {
    setActiveSlotForUpload(slotId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (slotId: string, file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = e.target?.result as string;
      const formattedSize =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
          : `${(file.size / 1024).toFixed(1)} KB`;
      const today = new Date().toLocaleDateString('pt-BR');

      setGuidingDocs((prev) => {
        const updated = prev.map((slot) => {
          if (slot.id === slotId) {
            return {
              ...slot,
              fileName: file.name,
              fileSize: formattedSize,
              uploadedAt: today,
              fileData: fileData,
            };
          }
          return slot;
        });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('sociologia_guiding_docs', JSON.stringify(updated));
          } catch (err) {
            console.warn('Erro ao salvar no localStorage:', err);
          }
        }
        return updated;
      });

      const slotObj = DEFAULT_GUIDING_DOCS.find((s) => s.id === slotId);
      saveDocToSupabase(slotId, file.name, formattedSize, fileData);
      showToast(`Documento "${file.name}" carregado com sucesso para ${slotObj?.categoryName || 'categoria'}.`);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (slotId: string) => {
    removeDocFromSupabase(slotId);
    setGuidingDocs((prev) => {
      const updated = prev.map((slot) => {
        if (slot.id === slotId) {
          return {
            id: slot.id,
            categoryName: slot.categoryName,
          };
        }
        return slot;
      });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sociologia_guiding_docs', JSON.stringify(updated));
        } catch (err) {
          console.warn('Erro ao salvar no localStorage:', err);
        }
      }
      return updated;
    });
    showToast('Documento removido.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const formatDateToBR = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  // Buscar turmas cadastradas na base de alunos / ERP
  const getAvailableTurmas = (): string[] => {
    const turmasSet = new Set<string>();

    if (students && students.length > 0) {
      students.forEach((s) => {
        if (s.turma && s.turma.trim()) {
          turmasSet.add(s.turma.trim());
        }
      });
    }

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sociologia_students');
        if (saved) {
          const parsed: StudentUser[] = JSON.parse(saved);
          parsed.forEach((s) => {
            if (s.turma && s.turma.trim()) {
              turmasSet.add(s.turma.trim());
            }
          });
        }
      } catch {}
    }

    // fallback para lista padrão caso não haja turmas cadastradas ainda
    DEFAULT_TURMAS.forEach((t) => turmasSet.add(t));

    return Array.from(turmasSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  const handleOpenCreateModal = (type: 'Sequência Didática' | 'Plano Anual') => {
    if (type === 'Sequência Didática') {
      setSeqTitle('Nova Sequência Didática');
      setSeqSerie('1ª Série Regular');
      setSeqSubject('Sociologia');
      setSeqTrimestre('1º Trimestre');
      setSeqStartDate('');
      setSeqEndDate('');
      setSeqDriveUrl('https://drive.google.com/drive/folders/ee-b-prof-jandira-davila-planos-individuais');

      const available = getAvailableTurmas();
      const initialTurmas = available.length > 0 ? [available[0]] : ['101'];
      setSelectedTurmasCodes(initialTurmas);

      const initialSchedules: Record<string, { days: string[]; format: string }> = {};
      initialTurmas.forEach((t) => {
        initialSchedules[t] = {
          days: ['Segunda'],
          format: '2 aulas consecutivas (90 min)',
        };
      });
      setTurmaSchedules(initialSchedules);
      setIsTurmaDropdownOpen(false);
      setActiveModal('create_seq');
    } else {
      setFormTitle('Plano Anual de Sociologia 2026');
      setFormTurmas('1ª, 2ª e 3ª Séries');
      setFormPeriod('Anual (1º ao 3º Tri)');
      setFormStartDate('');
      setFormEndDate('');
      setFormDescription('');
      setFormObjectives('');
      setActiveModal('create_annual');
    }
  };

  const toggleTurmaCode = (turmaCode: string) => {
    if (selectedTurmasCodes.includes(turmaCode)) {
      const updated = selectedTurmasCodes.filter((t) => t !== turmaCode);
      setSelectedTurmasCodes(updated);
    } else {
      const updated = [...selectedTurmasCodes, turmaCode];
      setSelectedTurmasCodes(updated);
      if (!turmaSchedules[turmaCode]) {
        setTurmaSchedules((prev) => ({
          ...prev,
          [turmaCode]: {
            days: ['Segunda'],
            format: '2 aulas consecutivas (90 min)',
          },
        }));
      }
    }
  };

  const toggleDayForTurma = (turmaCode: string, day: string) => {
    setTurmaSchedules((prev) => {
      const current = prev[turmaCode] || { days: [], format: '2 aulas consecutivas (90 min)' };
      const days = current.days.includes(day)
        ? current.days.filter((d) => d !== day)
        : [...current.days, day];
      return {
        ...prev,
        [turmaCode]: {
          ...current,
          days,
        },
      };
    });
  };

  const updateFormatForTurma = (turmaCode: string, format: string) => {
    setTurmaSchedules((prev) => {
      const current = prev[turmaCode] || { days: ['Segunda'], format: '2 aulas consecutivas (90 min)' };
      return {
        ...prev,
        [turmaCode]: {
          ...current,
          format,
        },
      };
    });
  };

  const callGeminiPlanningApi = async (
    customMessage?: string,
    currentHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    planIdToUpdate?: string | null,
    targetPhase?: 1 | 2 | 3
  ) => {
    setAiLoading(true);
    try {
      const historyToPass = currentHistory || aiHistory;

      // Cleanly sanitize guidingDocs payload to prevent HTTP 413 / body overflow errors
      const sanitizedGuidingDocs = guidingDocs.map((doc) => {
        if (!doc.fileData) return doc;
        if (typeof doc.fileData === 'string') {
          if (doc.fileData.startsWith('data:')) {
            // If base64 data string is larger than 1.2MB, pass reference info
            if (doc.fileData.length > 1200000) {
              return {
                ...doc,
                fileData: `[DOCUMENTO NORTEADOR: ${doc.categoryName || doc.id} (${doc.fileName || 'anexo'}) - Vinculado à base oficial].`,
              };
            }
          } else if (doc.fileData.length > 100000) {
            return {
              ...doc,
              fileData: doc.fileData.substring(0, 100000) + '\n[...resumido para otimização de envio...]',
            };
          }
        }
        return doc;
      });

      const payload = {
        seqTitle: seqTitle.trim() || 'Nova Sequência Didática',
        seqSubject,
        seqSerie,
        seqTrimestre,
        seqStartDate: seqStartDate ? formatDateToBR(seqStartDate) : '',
        seqEndDate: seqEndDate ? formatDateToBR(seqEndDate) : '',
        selectedTurmasCodes,
        turmaSchedules,
        guidingDocs: sanitizedGuidingDocs,
        driveRepositoryUrl: seqDriveUrl.trim() || 'https://drive.google.com/drive/folders/ee-b-prof-jandira-davila-planos-individuais',
        userMessage: customMessage || '',
        history: historyToPass,
      };

      const response = await fetch('/api/gemini/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let data: Record<string, any> = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`A API do servidor não retornou JSON (Status ${response.status}). ${responseText.substring(0, 120)}`);
      }

      if (!response.ok) {
        throw new Error(data.details || data.error || `Erro de comunicação com o servidor (${response.status})`);
      }

      const generatedText = data.text || 'Informação não localizada nos documentos fornecidos.';

      let updatedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      setAiHistory((prev) => {
        if (customMessage) {
          updatedHistory = [
            ...prev,
            { role: 'user', content: customMessage },
            { role: 'assistant', content: generatedText },
          ];
        } else {
          updatedHistory = [...prev, { role: 'assistant', content: generatedText }];
        }
        return updatedHistory;
      });

      // Update plan persistence and phase
      const targetId = planIdToUpdate || currentAiPlanId;
      if (targetId) {
        setPlannings((prev) =>
          prev.map((p) => {
            if (p.id === targetId) {
              const currentP: 1 | 2 | 3 = targetPhase || (p.currentPhase ? (p.currentPhase < 3 ? ((p.currentPhase + 1) as 1 | 2 | 3) : 3) : 1);
              const f1 = currentP === 1 ? generatedText : (p.fase1Content || generatedText);
              const f2 = currentP === 2 ? generatedText : (p.fase2Content || '');
              const f3 = currentP === 3 ? generatedText : (p.fase3Content || '');

              return {
                ...p,
                serie: p.serie || seqSerie,
                trimestre: p.trimestre || seqTrimestre,
                subject: p.subject || seqSubject,
                fase1Content: f1,
                fase2Content: f2,
                fase3Content: f3,
                currentPhase: currentP,
                description: generatedText.length > 500 ? generatedText.substring(0, 500) + '...' : generatedText,
                objectives: f2 || f1 || generatedText,
                history: updatedHistory,
              };
            }
            return p;
          })
        );
      }

      showToast(`Resposta do GEM (Fase ${targetPhase || 1}) gerada e salva com sucesso!`);
    } catch (err: unknown) {
      console.error('Erro ao chamar Gemini:', err);
      const errMsg = err instanceof Error ? err.message : 'Erro na API Gemini.';
      setAiHistory((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ **Erro de Comunicação:** ${errMsg}` },
      ]);
      showToast('Erro ao obter resposta da IA Gemini.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAdvanceToAI = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTurmasCodes.length === 0) {
      showToast('Por favor, selecione pelo menos uma turma.');
      return;
    }

    const today = new Date().toLocaleDateString('pt-BR');
    const turmasFormatted = selectedTurmasCodes.map((t) => `Turma ${t}`).join(', ');

    const scheduleSummaries = selectedTurmasCodes
      .map((t) => {
        const sched = turmaSchedules[t];
        const daysStr = sched?.days && sched.days.length > 0 ? sched.days.join(', ') : 'Não informado';
        const fmt = sched?.format || '2 aulas consecutivas (90 min)';
        return `Turma ${t}: ${daysStr} (${fmt})`;
      })
      .join(' | ');

    const newPlanId = generateUniqueId();

    const newPlan: PlanningItem = {
      id: newPlanId,
      title: seqTitle.trim() || 'Nova Sequência Didática',
      createdAt: today,
      turmas: `${seqSerie} - ${turmasFormatted}`,
      period: seqTrimestre,
      serie: seqSerie,
      trimestre: seqTrimestre,
      subject: seqSubject,
      startDate: seqStartDate ? formatDateToBR(seqStartDate) : undefined,
      endDate: seqEndDate ? formatDateToBR(seqEndDate) : undefined,
      type: 'Sequência Didática',
      description: `Componente: ${seqSubject} | Bloco: 45 min. Horários: ${scheduleSummaries}`,
      objectives: `Aguardando resumo e estruturação da IA Gemini...`,
      bnccSkills: 'EM13CHS101, EM13CHS102, EM13CHS201',
      currentPhase: 1,
      driveRepositoryUrl: seqDriveUrl.trim() || 'https://drive.google.com/drive/folders/ee-b-prof-jandira-davila-planos-individuais',
    };

    setPlannings((prev) => [newPlan, ...prev]);
    setCurrentAiPlanId(newPlanId);
    setAiHistory([]);
    setActiveModal('ai_chat');

    // Trigger API call to generate Phase 1
    callGeminiPlanningApi(undefined, [], newPlanId, 1);
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userChatMessage.trim() || aiLoading) return;

    const msg = userChatMessage.trim();
    setUserChatMessage('');
    callGeminiPlanningApi(msg);
  };

  const handleApprovePhase2 = () => {
    if (aiLoading) return;
    const msg = 'Sim, os dados e a divisão de conteúdos estão aprovados. Posso gerar o documento da Sequência Didática no Google Docs.';
    callGeminiPlanningApi(msg, undefined, currentAiPlanId, 2);
  };

  const handleApprovePhase3 = () => {
    if (aiLoading) return;
    const msg = 'Sim, deseja que eu crie agora os Planos de Aula Individuais detalhados (passo a passo de 45/90 min) em novos documentos.';
    callGeminiPlanningApi(msg, undefined, currentAiPlanId, 3);
  };

  const handleOpenPlanInAiChat = (plan: PlanningItem) => {
    setCurrentAiPlanId(plan.id);
    setSelectedPlan(plan);
    setAiHistory(plan.history || [
      { role: 'assistant', content: plan.fase1Content || plan.objectives || plan.description || '' }
    ]);
    if (plan.serie) setSeqSerie(plan.serie);
    if (plan.subject) setSeqSubject(plan.subject);
    if (plan.trimestre) setSeqTrimestre(plan.trimestre);
    setActiveModal('ai_chat');
  };

  const handleCreateAnnualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const today = new Date().toLocaleDateString('pt-BR');
    const newPlan: PlanningItem = {
      id: generateUniqueId(),
      title: formTitle.trim(),
      createdAt: today,
      turmas: formTurmas.trim() || 'Ensino Médio',
      period: formPeriod.trim() || 'Anual (1º ao 3º Tri)',
      startDate: formStartDate ? formatDateToBR(formStartDate) : undefined,
      endDate: formEndDate ? formatDateToBR(formEndDate) : undefined,
      type: 'Plano Anual',
      description: formDescription.trim() || 'Planejamento anual pedagógico gerado no sistema.',
      objectives: formObjectives.trim() || 'Desenvolvimento das competências da BNCC.',
      bnccSkills: 'EM13CHS101 ao EM13CHS606',
      driveRepositoryUrl: 'https://drive.google.com/drive/folders/ee-b-prof-jandira-davila-planos-individuais',
    };

    setPlannings((prev) => [newPlan, ...prev]);
    setActiveModal(null);
    showToast(`Plano Anual "${newPlan.title}" criado com sucesso!`);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toLocaleDateString('pt-BR');
    const importedPlan: PlanningItem = {
      id: generateUniqueId(),
      title: 'Planejamento Baseado em Documento Importado',
      createdAt: today,
      turmas: 'Todas as Turmas',
      period: '1º Trimestre',
      type: 'Sequência Didática',
      description: importFileText.trim() || 'Diretrizes curriculares e documentos norteadores importados.',
      objectives: 'Alinhamento com a Matriz de Referência e BNCC.',
      bnccSkills: 'EM13CHS101, EM13CHS201',
      driveRepositoryUrl: 'https://drive.google.com/drive/folders/ee-b-prof-jandira-davila-planos-individuais',
    };

    setPlannings(prev => [importedPlan, ...prev]);
    setActiveModal(null);
    setImportFileText('');
    showToast('Documento norteador importado com sucesso!');
  };

  const handleDelete = (id: string, title: string) => {
    setPlanToDelete({ id, title });
    setActiveModal('delete_confirm');
  };

  const handleConfirmDelete = () => {
    if (planToDelete) {
      setPlannings((prev) => prev.filter((p) => p.id !== planToDelete.id));
      showToast(`Planejamento "${planToDelete.title}" excluído com sucesso.`);
      setPlanToDelete(null);
      setActiveModal(null);
    }
  };

  const handleDownload = (plan: PlanningItem) => {
    const periodLine = plan.type === 'Sequência Didática'
      ? `Trimestre: ${plan.trimestre || plan.period}\nPeríodo de Duração: ${plan.startDate && plan.endDate ? `${plan.startDate} a ${plan.endDate}` : 'Não informado'}`
      : `Trimestre: ${plan.period}`;

    const content = `================================================================================
ESTADO DE SANTA CATARINA
SECRETARIA DE ESTADO DA EDUCAÇÃO
DIRETORIA DE ENSINO
COORDENADORIA REGIONAL DE EDUCAÇÃO DE JOINVILLE
EEB PROF. JANDIRA D'ÁVILA
================================================================================
PLANO DE AULA / SEQUÊNCIA DIDÁTICA: ${plan.title.toUpperCase()}

Professor Responsável: Gilson Rodrigo Flores
Unidade Escolar: EEB Prof. Jandira D'Ávila
Área de Conhecimento: Ciências Humanas e Sociais Aplicadas
Componente Curricular: ${plan.subject || 'Sociologia'}
Ano / Série: ${plan.serie || plan.turmas}
Turma(s): ${plan.turmas}
${periodLine}
Data de Criação: ${plan.createdAt}

================================================================================
FASE 1 — RESUMO E CONFERÊNCIA CURRICULAR
================================================================================
${plan.fase1Content || plan.description || 'Nenhum resumo textual registrado.'}

${plan.fase2Content ? `================================================================================
FASE 2 — SEQUÊNCIA DIDÁTICA (MODELO OFICIAL SED-SC)
================================================================================
${plan.fase2Content}` : ''}

${plan.fase3Content ? `================================================================================
FASE 3 — PLANOS DE AULA INDIVIDUAIS (PASSO A PASSO / MINUTO A MINUTO)
================================================================================
${plan.fase3Content}` : ''}

================================================================================
ANEXO — REPOSITÓRIO GOOGLE DRIVE DE PLANOS DE AULAS INDIVIDUAIS
================================================================================
Acesse os Planos de Aulas Individuais completos e editáveis no repositório oficial do Google Drive:
Link do Repositório: ${plan.driveRepositoryUrl || 'https://drive.google.com/drive/folders/ee-b-prof-jandira-davila-planos-individuais'}
Instruções: Este repositório digital permite o acesso aos documentos individuais em formato Google Docs (.gdoc) e PDF.

================================================================================
Documento Oficial — EEB Prof. Jandira D'Ávila — Coordenadoria Regional de Joinville
================================================================================
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedTitle = plan.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
    link.download = `Planejamento_SED_SC_${sanitizedTitle}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Download de "${plan.title}" realizado com sucesso!`);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-[#4ade80]/20 border border-[#4ade80]/40 text-[#4ade80] rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-3 backdrop-blur-md animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-[#4ade80]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#4ade80] tracking-widest uppercase flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Gestão Pedagógica
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-1">
            Planejamento
          </h1>
          <p className="text-sm text-[#bccabb] mt-1">
            Crie, organize e gerencie suas Sequências Didáticas e Planos Anuais de Sociologia.
          </p>
        </div>

        {/* 1. Barra superior de ações com 3 botões */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Botão de Destaque 1: Criar Nova Sequência Didática */}
          <button
            onClick={() => handleOpenCreateModal('Sequência Didática')}
            className="py-3 px-5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#4ade80]/20 cursor-pointer text-xs sm:text-sm"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Criar Nova Sequência Didática</span>
          </button>

          {/* Botão 2: Criar Plano Anual */}
          <button
            onClick={() => handleOpenCreateModal('Plano Anual')}
            className="py-3 px-4 bg-[#171f33] hover:bg-[#222a3d] text-white font-bold rounded-2xl border border-white/10 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
          >
            <Layers className="w-4 h-4 text-[#4ade80]" />
            <span>Criar Plano Anual</span>
          </button>

          {/* Botão 3: Importar Documentos Norteadores */}
          <button
            onClick={() => setActiveModal('import_doc')}
            className="py-3 px-4 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] hover:text-white font-bold rounded-2xl border border-white/10 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
          >
            <UploadCloud className="w-4 h-4 text-amber-400" />
            <span>Importar Documentos Norteadores</span>
          </button>
        </div>
      </div>

      {/* 2. Dashboard principal contendo uma lista/tabela responsiva de planejamentos gerados */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-xl">
        {plannings.length === 0 ? (
          /* 3. Estado vazio (empty state) elegante */
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/20 flex items-center justify-center text-[#4ade80]">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-xl font-bold text-white">Nenhum planejamento gerado</h3>
              <p className="text-sm text-[#bccabb]">
                Você ainda não possui sequências didáticas ou planos anuais cadastrados. Utilize os botões acima para criar seu primeiro planejamento.
              </p>
            </div>
            <button
              onClick={() => handleOpenCreateModal('Sequência Didática')}
              className="mt-2 py-2.5 px-6 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full transition-all text-xs cursor-pointer shadow-md"
            >
              Criar Primeiro Planejamento
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-[#dae2fd]">
              <thead className="bg-[#171f33]/80 text-[#bccabb] uppercase text-[11px] font-bold tracking-wider border-b border-white/10">
                <tr>
                  <th scope="col" className="py-4 px-6">
                    Título / Descrição
                  </th>
                  <th scope="col" className="py-4 px-6">
                    Data de Criação
                  </th>
                  <th scope="col" className="py-4 px-6">
                    Turma(s) / Série
                  </th>
                  <th scope="col" className="py-4 px-6">
                    Trimestre / Período
                  </th>
                  <th scope="col" className="py-4 px-6">
                    Fase / Status
                  </th>
                  <th scope="col" className="py-4 px-6 text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {plannings.map((plan) => (
                  <tr
                    key={plan.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#171f33] border border-white/10 flex items-center justify-center text-[#4ade80] shrink-0">
                          {plan.type === 'Sequência Didática' ? (
                            <FileSpreadsheet className="w-4 h-4" />
                          ) : (
                            <Layers className="w-4 h-4 text-amber-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm line-clamp-1">
                            {plan.title}
                          </p>
                          {plan.description && (
                            <p className="text-xs text-[#bccabb] line-clamp-1 mt-0.5">
                              {plan.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[#bccabb] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#bccabb]/70" />
                        <span>{plan.createdAt}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-white font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#4ade80]" />
                        <span>{plan.turmas}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[#bccabb] whitespace-nowrap">
                      {plan.type === 'Sequência Didática' ? (
                        <div className="flex flex-col gap-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-[#dae2fd] w-fit">
                            {plan.period}
                          </span>
                          {plan.startDate || plan.endDate ? (
                            <span className="text-[11px] text-[#bccabb] flex items-center gap-1 font-medium">
                              <Calendar className="w-3 h-3 text-[#4ade80]" />
                              {plan.startDate || 'Início'} a {plan.endDate || 'Fim'}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#bccabb]/60 italic">Período não informado</span>
                          )}
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-[#dae2fd]">
                          {plan.period}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {plan.type === 'Sequência Didática' ? (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                            plan.currentPhase === 3 || plan.fase3Content
                              ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                              : plan.currentPhase === 2 || plan.fase2Content
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          {plan.currentPhase === 3 || plan.fase3Content
                            ? 'Fase 3 (Completo)'
                            : plan.currentPhase === 2 || plan.fase2Content
                            ? 'Fase 2 (Sequência)'
                            : 'Fase 1 (Aprovação)'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold border bg-amber-400/10 text-amber-400 border-amber-400/30">
                          Plano Anual
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botão Visualizar */}
                        <button
                          onClick={() => {
                            setSelectedPlan(plan);
                            setActiveModal('view');
                          }}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Visualizar Detalhes"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#4ade80]" />
                          <span>Visualizar</span>
                        </button>

                        {/* Botão Baixar (PDF/Docs) */}
                        <button
                          onClick={() => handleDownload(plan)}
                          className="px-3 py-1.5 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] hover:text-white rounded-xl border border-white/10 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Baixar documento"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>Baixar</span>
                        </button>

                        {/* Botão Excluir */}
                        <button
                          onClick={() => handleDelete(plan.id, plan.title)}
                          className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-500/30"
                          title="Excluir Planejamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Criar Nova Sequência Didática */}
      {activeModal === 'create_seq' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl rounded-3xl border border-white/10 p-6 sm:p-8 space-y-6 relative bg-[#131b2e] shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-[#bccabb] hover:text-white p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#4ade80]/20 border border-[#4ade80]/40 text-[#4ade80] flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Criar Nova Sequência Didática</h2>
                <p className="text-xs text-[#bccabb] mt-0.5">
                  Configure os parâmetros pedagógicos e horários das turmas antes de avançar para a IA.
                </p>
              </div>
            </div>

            <form onSubmit={handleAdvanceToAI} className="space-y-5">
              {/* Título da Sequência */}
              <div>
                <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">
                  Título da Sequência Didática *
                </label>
                <input
                  type="text"
                  required
                  value={seqTitle}
                  onChange={(e) => setSeqTitle(e.target.value)}
                  placeholder="Ex: Teoria Sociológica de Émile Durkheim"
                  className="w-full bg-[#0b1326] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
                />
              </div>

              {/* 1. Turmas: Dropdown com caixas de seleção múltipla da base de dados do ERP */}
              <div>
                <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1 flex items-center justify-between">
                  <span>Turmas no ERP * (Seleção Múltipla)</span>
                  <span className="text-[11px] text-[#4ade80] font-normal">
                    {selectedTurmasCodes.length} turma(s) selecionada(s)
                  </span>
                </label>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTurmaDropdownOpen((prev) => !prev)}
                    className="w-full bg-[#0b1326] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white flex items-center justify-between focus:outline-none focus:border-[#4ade80] cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Users className="w-4 h-4 text-[#4ade80] shrink-0" />
                      {selectedTurmasCodes.length > 0 ? (
                        <span className="font-semibold text-white">
                          {selectedTurmasCodes.map((t) => `Turma ${t}`).join(', ')}
                        </span>
                      ) : (
                        <span className="text-[#869486]">Selecione uma ou mais turmas...</span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-[#bccabb] transition-transform ${isTurmaDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isTurmaDropdownOpen && (
                    <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-[#0b1326] border border-white/20 rounded-2xl p-3 shadow-2xl max-h-48 overflow-y-auto space-y-1 backdrop-blur-md">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-[#bccabb]/70 px-2.5 py-1">
                        Turmas encontradas na base
                      </p>
                      {getAvailableTurmas().map((turmaCode) => {
                        const isChecked = selectedTurmasCodes.includes(turmaCode);
                        return (
                          <div
                            key={turmaCode}
                            onClick={() => toggleTurmaCode(turmaCode)}
                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                              isChecked
                                ? 'bg-[#4ade80]/15 text-white border border-[#4ade80]/30 font-semibold'
                                : 'hover:bg-white/5 text-[#bccabb]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-4 h-4 accent-[#4ade80] rounded cursor-pointer"
                              />
                              <span>Turma {turmaCode}</span>
                            </div>
                            {isChecked && <Check className="w-4 h-4 text-[#4ade80]" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Série e Componente Curricular */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">
                    Série *
                  </label>
                  <select
                    value={seqSerie}
                    onChange={(e) => setSeqSerie(e.target.value)}
                    className="w-full bg-[#0b1326] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80] cursor-pointer"
                  >
                    <option value="1ª Série Regular" className="bg-[#0b1326] text-white">1ª Série Regular</option>
                    <option value="2ª Série Regular" className="bg-[#0b1326] text-white">2ª Série Regular</option>
                    <option value="3ª Série Regular" className="bg-[#0b1326] text-white">3ª Série Regular</option>
                    <option value="Ensino Médio Técnico" className="bg-[#0b1326] text-white">Ensino Médio Técnico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">
                    Componente Curricular *
                  </label>
                  <select
                    value={seqSubject}
                    onChange={(e) => setSeqSubject(e.target.value)}
                    className="w-full bg-[#0b1326] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80] cursor-pointer"
                  >
                    <option value="Sociologia" className="bg-[#0b1326] text-white">Sociologia</option>
                    <option value="Filosofia" className="bg-[#0b1326] text-white">Filosofia</option>
                    <option value="História" className="bg-[#0b1326] text-white">História</option>
                    <option value="Geografia" className="bg-[#0b1326] text-white">Geografia</option>
                  </select>
                </div>
              </div>

              {/* Seletor de Trimestre */}
              <div>
                <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">
                  Trimestre *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['1º Trimestre', '2º Trimestre', '3º Trimestre'].map((tri) => (
                    <button
                      key={tri}
                      type="button"
                      onClick={() => setSeqTrimestre(tri)}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                        seqTrimestre === tri
                          ? 'bg-[#4ade80] text-[#003919] border-[#4ade80] shadow-md'
                          : 'bg-[#0b1326] text-[#bccabb] border-white/10 hover:border-white/20'
                      }`}
                    >
                      {tri}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intervalo de Datas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">
                    Data Inicial *
                  </label>
                  <input
                    type="date"
                    required
                    value={seqStartDate}
                    onChange={(e) => setSeqStartDate(e.target.value)}
                    className="w-full bg-[#0b1326] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">
                    Data Final *
                  </label>
                  <input
                    type="date"
                    required
                    value={seqEndDate}
                    onChange={(e) => setSeqEndDate(e.target.value)}
                    className="w-full bg-[#0b1326] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
                  />
                </div>
              </div>

              {/* Duração do Bloco: Fixo em 45 minutos (com cálculo para múltiplos de 90 min) */}
              <div className="p-4 bg-[#0b1326]/80 border border-white/10 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#4ade80]" /> Duração do Bloco
                  </span>
                  <span className="px-3 py-1 bg-[#4ade80]/20 text-[#4ade80] font-bold text-xs rounded-full border border-[#4ade80]/30">
                    45 minutos (Fixo)
                  </span>
                </div>
                <p className="text-[11px] text-[#bccabb]/80 leading-relaxed">
                  Cálculo automático: 1 bloco = 45 min | 2 blocos = 90 min (aula dupla) | 3 blocos = 135 min.
                </p>
              </div>

              {/* 3. Configuração dinâmica de horários por turma selecionada */}
              {selectedTurmasCodes.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#4ade80]" />
                    Configuração Dinâmica de Horários por Turma
                  </h3>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {selectedTurmasCodes.map((turmaCode) => {
                      const config = turmaSchedules[turmaCode] || {
                        days: ['Segunda'],
                        format: '2 aulas consecutivas (90 min)',
                      };
                      return (
                        <div
                          key={turmaCode}
                          className="p-4 bg-[#0b1326] border border-white/10 rounded-2xl space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <span className="text-xs font-bold text-[#4ade80]">
                              Turma {turmaCode}
                            </span>
                            <span className="text-[11px] text-[#bccabb]">
                              {config.days.length} dia(s) de aula
                            </span>
                          </div>

                          {/* Dia(s) da Semana */}
                          <div>
                            <label className="block text-[11px] font-semibold text-[#bccabb] mb-1.5">
                              Dia(s) da Semana:
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].map((day) => {
                                const isSelected = config.days.includes(day);
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDayForTurma(turmaCode, day)}
                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all border cursor-pointer ${
                                      isSelected
                                        ? 'bg-[#4ade80] text-[#003919] border-[#4ade80]'
                                        : 'bg-white/5 text-[#bccabb] border-white/10 hover:bg-white/10'
                                    }`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Formato das Aulas */}
                          <div>
                            <label className="block text-[11px] font-semibold text-[#bccabb] mb-1.5">
                              Formato das Aulas:
                            </label>
                            <select
                              value={config.format}
                              onChange={(e) => updateFormatForTurma(turmaCode, e.target.value)}
                              className="w-full bg-[#131b2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4ade80] cursor-pointer"
                            >
                              <option value="2 aulas consecutivas (90 min)" className="bg-[#131b2e] text-white">
                                2 aulas consecutivas (90 min)
                              </option>
                              <option value="2 aulas separadas (2x 45 min)" className="bg-[#131b2e] text-white">
                                2 aulas separadas (2x 45 min)
                              </option>
                              <option value="1 aula simples (45 min)" className="bg-[#131b2e] text-white">
                                1 aula simples (45 min)
                              </option>
                              <option value="3 aulas (135 min)" className="bg-[#131b2e] text-white">
                                3 aulas (135 min)
                              </option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Seção de Repositório de Documentos Norteadores para Geração da IA */}
              <div className="p-4 bg-[#0b1326] border border-[#4ade80]/30 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#4ade80]" />
                    <span className="text-xs font-bold text-white">
                      Repositório de Documentos Norteadores (Base para IA)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal('import_doc')}
                    className="px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                    <span>Gerenciar Anexos ({guidingDocs.filter((d) => !!d.fileName).length}/{guidingDocs.length})</span>
                  </button>
                </div>

                <p className="text-[11px] text-[#bccabb] leading-relaxed">
                  Os documentos deste repositório {isSupabaseConfigured ? 'estão salvos no Supabase e ' : 'ficam salvos gratuitamente no sistema e '}serão vinculados à Inteligência Artificial para estruturar o plano/sequência conforme as diretrizes e modelos oficiais.
                </p>

                {/* Slots e Status dos Documentos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {guidingDocs.map((doc) => {
                    const isAttached = !!doc.fileName;
                    return (
                      <div
                        key={doc.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
                          isAttached
                            ? 'bg-[#4ade80]/10 border-[#4ade80]/30 text-white'
                            : 'bg-white/5 border-white/10 text-[#bccabb]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isAttached ? (
                            <Check className="w-4 h-4 text-[#4ade80] shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-[#869486] shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-[11px] truncate">{doc.categoryName}</p>
                            <p className="text-[10px] text-[#bccabb] truncate">
                              {isAttached ? doc.fileName : 'Nenhum documento'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => triggerFileInput(doc.id)}
                          className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white shrink-0 transition-all cursor-pointer"
                        >
                          {isAttached ? 'Trocar' : 'Anexar'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Campo para Link da Pasta no Google Drive (Anexo do Documento) */}
                <div className="pt-3 border-t border-white/10 space-y-1.5">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-amber-400" />
                    <span>Link da Pasta no Google Drive (Anexo do Documento Gerado)</span>
                  </label>
                  <input
                    type="url"
                    value={seqDriveUrl}
                    onChange={(e) => setSeqDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#131b2e] border border-white/10 text-xs text-white focus:outline-none focus:border-[#4ade80] transition-all font-mono"
                  />
                  <p className="text-[10px] text-[#bccabb] leading-relaxed">
                    Este link do Google Drive será anexado oficialmente ao final do documento gerado para acesso direto aos planos de aula.
                  </p>
                </div>
              </div>

              {/* 4. Botões do modal: "Cancelar" e "Avançar para IA" */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-5 py-2.5 rounded-2xl bg-white/10 text-xs font-bold text-[#bccabb] hover:text-white transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Avançar para IA</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Criar Plano Anual */}
      {activeModal === 'create_annual' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/10 p-6 sm:p-8 space-y-6 relative bg-[#131b2e] shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-[#bccabb] hover:text-white p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#4ade80]/20 border border-[#4ade80]/40 text-[#4ade80] flex items-center justify-center shrink-0">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Criar Plano Anual</h2>
                <p className="text-xs text-[#bccabb] mt-0.5">
                  Preencha os dados estruturais do seu Plano Anual de Ensino.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateAnnualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">
                  Título do Plano Anual *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Plano Anual de Sociologia 2026"
                  className="w-full bg-[#0b1326] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">
                    Turma(s) / Série *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTurmas}
                    onChange={(e) => setFormTurmas(e.target.value)}
                    placeholder="Ex: 1ª, 2ª e 3ª Séries"
                    className="w-full bg-[#0b1326] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">
                    Trimestre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPeriod}
                    onChange={(e) => setFormPeriod(e.target.value)}
                    placeholder="Ex: Anual (1º ao 3º Tri)"
                    className="w-full bg-[#0b1326] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">
                  Descrição / Conteúdo Principal
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descreva os temas centrais do ano letivo..."
                  className="w-full bg-[#0b1326] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#bccabb] mb-1.5 ml-1">
                  Objetivos de Aprendizagem (BNCC)
                </label>
                <input
                  type="text"
                  value={formObjectives}
                  onChange={(e) => setFormObjectives(e.target.value)}
                  placeholder="Ex: Desenvolvimento das competências gerais e específicas da BNCC..."
                  className="w-full bg-[#0b1326] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-5 py-2.5 rounded-2xl bg-white/10 text-xs font-bold text-[#bccabb] hover:text-white transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  Salvar Plano Anual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden File Input for Guiding Docs Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && activeSlotForUpload) {
            handleFileUpload(activeSlotForUpload, file);
          }
        }}
        className="hidden"
        accept=".pdf,.gdoc,.doc,.docx,.txt,.png,.jpg,.jpeg"
      />

      {/* Modal: Importar Documentos Norteadores */}
      {activeModal === 'import_doc' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl rounded-3xl border border-white/10 p-6 sm:p-8 space-y-6 relative bg-[#131b2e] shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-[#bccabb] hover:text-white p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Importar Documentos Norteadores</h2>
                <p className="text-xs text-[#bccabb] mt-0.5">
                  Anexe e gerencie os documentos oficiais de referência que orientarão as requisições da Inteligência Artificial.
                </p>
              </div>
            </div>

            {/* Slots organizados para os documentos norteadores */}
            <div className="space-y-3">
              {guidingDocs.map((slot) => {
                const isUploaded = !!slot.fileName;
                return (
                  <div
                    key={slot.id}
                    className="p-4 rounded-2xl bg-[#0b1326] border border-white/10 space-y-2 hover:border-white/20 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                            isUploaded
                              ? 'bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80]'
                              : 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                          }`}
                        >
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white">{slot.categoryName}</h3>
                          {isUploaded ? (
                            <p className="text-[11px] text-[#4ade80] font-semibold flex items-center gap-1.5 mt-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#4ade80]" />
                              <span>Documento Carregado: {slot.fileName}</span>
                            </p>
                          ) : (
                            <p className="text-[11px] text-[#bccabb]/70 flex items-center gap-1.5 mt-0.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#bccabb]/60" />
                              <span>Nenhum documento anexado</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {isUploaded ? (
                          <>
                            <button
                              type="button"
                              onClick={() => triggerFileInput(slot.id)}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Substituir documento"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                              <span>Substituir</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(slot.id)}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Remover documento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remover</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => triggerFileInput(slot.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                          >
                            <UploadCloud className="w-4 h-4" />
                            <span>Anexar Arquivo</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Detalhes extras quando carregado */}
                    {isUploaded && (
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#bccabb]">
                        <span>Tamanho: {slot.fileSize || 'N/A'}</span>
                        <span>Data de Upload: {slot.uploadedAt || 'N/A'}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 text-xs text-[#bccabb]">
              <FileText className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                Documentos salvos localmente e prontos para embasar as sugestões da Inteligência Artificial.
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-6 py-2.5 rounded-2xl bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold text-xs transition-all shadow-md cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Modal: Visualizar Planejamento Formatado Oficial SED-SC */}
      {activeModal === 'view' && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-4xl rounded-3xl border border-white/10 p-6 sm:p-8 space-y-6 relative bg-[#131b2e] shadow-2xl max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => {
                setActiveModal(null);
                setSelectedPlan(null);
              }}
              className="absolute top-5 right-5 text-[#bccabb] hover:text-white p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho Oficial do Estado de Santa Catarina */}
            <div className="bg-[#0b1326] border border-white/10 rounded-2xl p-5 text-center space-y-1">
              <span className="text-[11px] font-bold text-[#4ade80] tracking-widest uppercase block">
                ESTADO DE SANTA CATARINA — SECRETARIA DE ESTADO DA EDUCAÇÃO
              </span>
              <h3 className="text-base font-black text-white">
                Coordenadoria Regional de Educação de Joinville — EEB Prof. Jandira D&apos;Ávila
              </h3>
              <p className="text-xs text-[#bccabb]">
                Professor Responsável: <span className="text-white font-bold">Gilson Rodrigo Flores</span> | Modelo Oficial SED-SC
              </p>
            </div>

            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#4ade80]/20 border border-[#4ade80]/40 text-[#4ade80] flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/30">
                      {selectedPlan.type}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30">
                      {selectedPlan.currentPhase === 3 || selectedPlan.fase3Content
                        ? 'Fase 3: Planos Individuais'
                        : selectedPlan.currentPhase === 2 || selectedPlan.fase2Content
                        ? 'Fase 2: Sequência Didática'
                        : 'Fase 1: Resumo Pedagógico'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1">{selectedPlan.title}</h2>
                </div>
              </div>
            </div>

            {/* Metadados Oficiais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#0b1326] border border-white/10 rounded-2xl text-xs">
              <div>
                <span className="text-[#bccabb] block font-semibold mb-0.5">Data de Criação</span>
                <span className="text-white font-medium">{selectedPlan.createdAt}</span>
              </div>
              <div>
                <span className="text-[#bccabb] block font-semibold mb-0.5">Componente</span>
                <span className="text-white font-medium">{selectedPlan.subject || 'Sociologia'}</span>
              </div>
              <div>
                <span className="text-[#bccabb] block font-semibold mb-0.5">Turma(s) / Série</span>
                <span className="text-white font-medium">{selectedPlan.turmas}</span>
              </div>
              <div>
                <span className="text-[#bccabb] block font-semibold mb-0.5">Trimestre</span>
                <span className="text-[#4ade80] font-medium">{selectedPlan.period}</span>
              </div>
            </div>

            {/* FASE 1: Resumo e Conferência Curricular */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#4ade80] uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Fase 1 — Resumo, Distribuição e Conferência Curricular</span>
                </h4>
              </div>
              <div className="p-4 bg-[#0b1326] border border-white/10 rounded-2xl text-xs text-[#dae2fd] leading-relaxed whitespace-pre-wrap font-sans">
                {selectedPlan.fase1Content || selectedPlan.description || 'Nenhum resumo da Fase 1 registrado.'}
              </div>
            </div>

            {/* FASE 2: Sequência Didática Oficial SED-SC */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Fase 2 — Sequência Didática Oficial (Modelo SED-SC)</span>
              </h4>
              {selectedPlan.fase2Content ? (
                <div className="p-4 bg-[#0b1326] border border-amber-500/20 rounded-2xl text-xs text-[#dae2fd] leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedPlan.fase2Content}
                </div>
              ) : (
                <div className="p-4 bg-white/5 border border-dashed border-white/10 rounded-2xl text-xs text-[#bccabb] flex items-center justify-between">
                  <span>A Sequência Didática Oficial (Fase 2) ainda não foi gerada para este planejamento.</span>
                  <button
                    onClick={() => handleOpenPlanInAiChat(selectedPlan)}
                    className="px-3 py-1.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 rounded-xl font-bold text-xs transition-all cursor-pointer border border-amber-400/30 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gerar Fase 2 na IA</span>
                  </button>
                </div>
              )}
            </div>

            {/* FASE 3: Planos de Aula Individuais Detalhados */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Fase 3 — Planos de Aula Individuais Detalhados (Minuto a Minuto)</span>
              </h4>
              {selectedPlan.fase3Content ? (
                <div className="p-4 bg-[#0b1326] border border-purple-500/20 rounded-2xl text-xs text-[#dae2fd] leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedPlan.fase3Content}
                </div>
              ) : (
                <div className="p-4 bg-white/5 border border-dashed border-white/10 rounded-2xl text-xs text-[#bccabb] flex items-center justify-between">
                  <span>Os Planos de Aula Individuais (Fase 3) ainda não foram gerados.</span>
                  <button
                    onClick={() => handleOpenPlanInAiChat(selectedPlan)}
                    className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl font-bold text-xs transition-all cursor-pointer border border-purple-500/30 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gerar Fase 3 na IA</span>
                  </button>
                </div>
              )}
            </div>

            {/* ANEXO OBRIGATÓRIO: Repositório Google Drive (Planos de Aulas Individuais) */}
            <div className="p-4 bg-[#0b1326] border border-[#4ade80]/30 rounded-2xl space-y-2 shadow-inner">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#4ade80]/15 text-[#4ade80] flex items-center justify-center shrink-0 border border-[#4ade80]/30">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>Anexo — Repositório Google Drive de Planos Individuais</span>
                    </h4>
                    <p className="text-[11px] text-[#bccabb]">
                      Repositório oficial para acesso, leitura e exportação dos planos de aula individuais em Google Docs (.gdoc) e PDF.
                    </p>
                  </div>
                </div>
                <a
                  href={selectedPlan.driveRepositoryUrl || 'https://drive.google.com/drive/folders/ee-b-prof-jandira-davila-planos-individuais'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <span>Acessar Repositório Drive</span>
                  <Eye className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="pt-2 border-t border-white/5 text-[11px] text-[#4ade80] font-mono break-all select-all">
                {selectedPlan.driveRepositoryUrl || 'https://drive.google.com/drive/folders/ee-b-prof-jandira-davila-planos-individuais'}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => handleOpenPlanInAiChat(selectedPlan)}
                className="px-4 py-2.5 rounded-2xl bg-[#171f33] hover:bg-[#222a3d] text-[#4ade80] text-xs font-bold border border-[#4ade80]/30 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4 text-[#4ade80]" />
                <span>Continuar no Assistente IA</span>
              </button>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  onClick={() => handleDownload(selectedPlan)}
                  className="px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Documento Oficial (PDF/Docs)</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModal(null);
                    setSelectedPlan(null);
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Painel de Execução Interativo GEM Gemini 3.1 Pro (IA Chat Fases 1, 2 e 3) */}
      {activeModal === 'ai_chat' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-4xl rounded-3xl border border-white/10 p-6 space-y-4 relative bg-[#131b2e] shadow-2xl max-h-[92vh] flex flex-col">
            {/* Header do Chat com Stepper de Fases */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#4ade80]/20 border border-[#4ade80]/40 text-[#4ade80] flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Assistente de Planejamento Pedagógico GEM
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/30 font-semibold">
                      Gemini 3.1 Pro
                    </span>
                  </h2>
                  <p className="text-xs text-[#bccabb] mt-0.5">
                    {seqSerie} | {seqSubject} | {seqTrimestre} | Turma(s): {selectedTurmasCodes.join(', ')}
                  </p>
                </div>
              </div>

              {/* Botão Fechar */}
              <button
                onClick={() => setActiveModal(null)}
                className="text-[#bccabb] hover:text-white p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Indicador visual de Fases (Stepper) */}
            {(() => {
              const activePlanObj = plannings.find((p) => p.id === currentAiPlanId);
              const phase = activePlanObj?.currentPhase || 1;
              return (
                <div className="grid grid-cols-3 gap-2 p-2 bg-[#0b1326] border border-white/10 rounded-2xl text-[11px] shrink-0">
                  <div
                    className={`p-2 rounded-xl border flex items-center gap-2 ${
                      phase >= 1
                        ? 'bg-[#4ade80]/15 text-[#4ade80] border-[#4ade80]/40 font-bold'
                        : 'bg-white/5 text-[#bccabb] border-white/5'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="truncate">Fase 1: Resumo & Aprovação</span>
                  </div>
                  <div
                    className={`p-2 rounded-xl border flex items-center gap-2 ${
                      phase >= 2 || activePlanObj?.fase2Content
                        ? 'bg-amber-400/15 text-amber-300 border-amber-400/40 font-bold'
                        : 'bg-white/5 text-[#bccabb] border-white/5'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span className="truncate">Fase 2: Sequência Didática</span>
                  </div>
                  <div
                    className={`p-2 rounded-xl border flex items-center gap-2 ${
                      phase === 3 || activePlanObj?.fase3Content
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 font-bold'
                        : 'bg-white/5 text-[#bccabb] border-white/5'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="truncate">Fase 3: Planos Individuais</span>
                  </div>
                </div>
              );
            })()}

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[300px]">
              {aiHistory.length === 0 && aiLoading && (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[#4ade80] animate-spin" />
                  <p className="text-xs font-semibold text-[#dae2fd]">
                    Consultando documentos norteadores, calculando carga horária e elaborando a FASE 1...
                  </p>
                  <p className="text-[11px] text-[#bccabb]">
                    Aguarde alguns segundos enquanto o GEM aplica o protocolo pedagógico oficial.
                  </p>
                </div>
              )}

              {aiHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-[#4ade80]/20 border border-[#4ade80]/30 text-[#4ade80] flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#4ade80] text-[#003919] font-medium shadow-md self-end'
                        : 'bg-[#0b1326] text-[#dae2fd] border border-white/10 space-y-2 font-sans whitespace-pre-wrap'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0 mt-1">
                      <Users className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {aiHistory.length > 0 && aiLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-xl bg-[#4ade80]/20 border border-[#4ade80]/30 text-[#4ade80] flex items-center justify-center shrink-0 mt-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-[#0b1326] text-[#bccabb] border border-white/10 rounded-2xl p-4 text-xs flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#4ade80] animate-pulse" />
                    <span>O GEM está processando as diretrizes pedagógicas e gerando a próxima fase...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Controles de Ação Rápida por Fase & Campo de Entrada */}
            <div className="border-t border-white/10 pt-3 space-y-3 shrink-0">
              {(() => {
                const activePlanObj = plannings.find((p) => p.id === currentAiPlanId);
                const hasFase2 = !!activePlanObj?.fase2Content;
                const hasFase3 = !!activePlanObj?.fase3Content;

                return (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Botão Fase 2 */}
                      {!hasFase2 && (
                        <button
                          type="button"
                          onClick={handleApprovePhase2}
                          disabled={aiLoading}
                          className="py-2 px-4 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-md"
                        >
                          <CheckCircle2 className="w-4 h-4 text-amber-400" />
                          <span>Aprovar e Gerar Sequência Didática (Fase 2)</span>
                        </button>
                      )}

                      {/* Botão Fase 3 */}
                      {hasFase2 && !hasFase3 && (
                        <button
                          type="button"
                          onClick={handleApprovePhase3}
                          disabled={aiLoading}
                          className="py-2 px-4 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-md"
                        >
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <span>Gerar Planos de Aula Individuais (Fase 3)</span>
                        </button>
                      )}

                      {/* Indicador de Conclusão */}
                      {hasFase3 && (
                        <div className="px-3.5 py-2 rounded-xl bg-[#4ade80]/15 border border-[#4ade80]/30 text-[#4ade80] text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
                          <span>Planejamento Concluído (Fases 1, 2 e 3 integradas)</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        showToast('Planejamento salvo com sucesso no painel!');
                      }}
                      className="py-2 px-4 bg-white/5 hover:bg-white/10 text-[#dae2fd] border border-white/10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                      <span>Concluir e Salvar no Painel</span>
                    </button>
                  </div>
                );
              })()}

              {/* Formulário de Envio do Chat */}
              <form onSubmit={handleSendChatMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={userChatMessage}
                  onChange={(e) => setUserChatMessage(e.target.value)}
                  placeholder="Digite suas observações ou comandos adicionais para o GEM..."
                  disabled={aiLoading}
                  className="flex-1 bg-[#0b1326] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={aiLoading || !userChatMessage.trim()}
                  className="py-3 px-5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão de Planejamento */}
      {activeModal === 'delete_confirm' && planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-rose-500/30 p-6 space-y-5 bg-[#131b2e] shadow-2xl relative">
            <button
              onClick={() => {
                setActiveModal(null);
                setPlanToDelete(null);
              }}
              className="absolute top-5 right-5 text-[#bccabb] hover:text-white p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Excluir Planejamento</h2>
                <p className="text-xs text-[#bccabb] mt-0.5">Esta ação é irreversível.</p>
              </div>
            </div>

            <p className="text-xs text-[#dae2fd] bg-[#0b1326] p-4 rounded-2xl border border-white/10 leading-relaxed">
              Tem certeza que deseja excluir o planejamento <strong className="text-white">&quot;{planToDelete.title}&quot;</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setPlanToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#bccabb] hover:text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
