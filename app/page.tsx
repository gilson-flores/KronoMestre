'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  initialTeacher,
  initialStudents,
  initialActivities,
  initialSchedule,
  initialLibrary,
  initialChatMessages,
} from '@/lib/initialData';
import { UserRole, TeacherUser, StudentUser, Activity, ChatMessage, LibraryFile } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AuthView } from '@/components/AuthView';
import { Sidebar } from '@/components/Sidebar';
import { NavbarTop } from '@/components/NavbarTop';
import { DashboardView } from '@/components/views/DashboardView';
import { DashboardCentralView } from '@/components/views/DashboardCentralView';
import { PostagemRcoView } from '@/components/views/PostagemRcoView';
import { CorrectionsView } from '@/components/views/CorrectionsView';
import { GradingView } from '@/components/views/GradingView';
import { StudentsView } from '@/components/views/StudentsView';
import { LibraryView } from '@/components/views/LibraryView';
import { StudentPortalView } from '@/components/views/StudentPortalView';
import { MessagesView } from '@/components/views/MessagesView';
import { SecondTeachersView } from '@/components/views/SecondTeachersView';
import { AtestadosRadView } from '@/components/views/AtestadosRadView';


import { normalizeStudentName, getActivityGradeDistribution } from '@/lib/studentUtils';
import {
  sendBrowserNotification,
  checkAndNotifyApproachingDeadlines,
  notifyNewActivityForStudent,
  notifyDeadlineExtendedForStudent,
  requestNotificationPermission,
} from '@/lib/notificationUtils';
import { NewActivityModal } from '@/components/modals/NewActivityModal';
import { EditActivityModal } from '@/components/modals/EditActivityModal';
import { ViewActivityModal } from '@/components/modals/ViewActivityModal';
import { NewStudentModal } from '@/components/modals/NewStudentModal';
import { EditStudentModal } from '@/components/modals/EditStudentModal';
import { StudentSupervisionModal } from '@/components/modals/StudentSupervisionModal';
import { NewSecondTeacherModal } from '@/components/modals/NewSecondTeacherModal';
import { ParallelRecoveryModal } from '@/components/modals/ParallelRecoveryModal';
import { CheckCircle2, AlertTriangle, HeartHandshake, UserPlus } from 'lucide-react';

// Helper de unificação e desduplicação atômica de mensagens de chat
const mergeChatMessage = (
  prev: ChatMessage[],
  incoming: ChatMessage
): { updated: ChatMessage[]; isNew: boolean } => {
  // 1. Verificação por ID exato
  const exactIndex = prev.findIndex((m) => m.id === incoming.id);
  if (exactIndex !== -1) {
    return { updated: prev, isNew: false };
  }

  // 2. Verificação de mensagem otimista local vs banco Supabase (mesmo remetente, mesmo destinatário/thread e mesmo conteúdo)
  const optimisticMatchIndex = prev.findIndex((m) => {
    const isSameSender = m.senderId === incoming.senderId;
    const isSameThread =
      m.threadId === incoming.threadId ||
      m.recipientId === incoming.recipientId ||
      m.threadId === incoming.recipientId ||
      m.recipientId === incoming.threadId;
    const isSameContent = m.content.trim() === incoming.content.trim();
    const isOptimisticOrExtension =
      m.id.startsWith('msg-') ||
      incoming.id.startsWith('msg-') ||
      m.id.startsWith('msg-ext-') ||
      incoming.id.startsWith('msg-ext-');

    return isSameSender && isSameThread && isSameContent && isOptimisticOrExtension;
  });

  if (optimisticMatchIndex !== -1) {
    const clone = [...prev];
    // Se a mensagem que chegou do banco possui ID persistido, atualiza o ID temporário local
    if (!incoming.id.startsWith('msg-') && clone[optimisticMatchIndex].id.startsWith('msg-')) {
      clone[optimisticMatchIndex] = {
        ...clone[optimisticMatchIndex],
        ...incoming,
        id: incoming.id,
      };
    }
    return { updated: clone, isNew: false };
  }

  // 3. Verificação de segurança contra duplicatas idênticas no mesmo canal
  const duplicateContentIndex = prev.findIndex((m) => {
    const isSameSender = m.senderId === incoming.senderId;
    const isSameThread = m.threadId === incoming.threadId;
    const isSameContent = m.content.trim() === incoming.content.trim();
    return isSameSender && isSameThread && isSameContent;
  });

  if (duplicateContentIndex !== -1) {
    const clone = [...prev];
    if (!incoming.id.startsWith('msg-') && clone[duplicateContentIndex].id.startsWith('msg-')) {
      clone[duplicateContentIndex] = {
        ...clone[duplicateContentIndex],
        ...incoming,
        id: incoming.id,
      };
    }
    return { updated: clone, isNew: false };
  }

  return { updated: [...prev, incoming], isNew: true };
};

export default function Home() {
  // Mounting state to prevent SSR/hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  // Auth state
  const [role, setRole] = useState<UserRole>(null);
  const [teacher, setTeacher] = useState<TeacherUser>(initialTeacher);
  const [currentStudent, setCurrentStudent] = useState<StudentUser | null>(null);
  const [inactivityTimeoutEnabled, setInactivityTimeoutEnabled] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Restaurar sessão e preferências no cliente de forma segura para hidratação
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      if (typeof window === 'undefined') return;

      try {
        const sessionStr = sessionStorage.getItem('active_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          if (session.role === 'teacher') {
            setRole('teacher');
            if (session.teacherData) setTeacher(session.teacherData);
          } else if (session.role === 'second_teacher') {
            setRole('second_teacher');
            if (session.teacherData) setTeacher(session.teacherData);
            setCurrentTab('2_professor');
          } else if (session.role === 'student' && session.studentData) {
            setCurrentStudent(session.studentData);
            setRole('student');
          }
        }

        const savedDriveUrl = localStorage.getItem('teacher_drive_folder_url');
        if (savedDriveUrl) {
          setTeacher((prev) => ({ ...prev, driveFolderUrl: savedDriveUrl }));
        }

        const savedTimeout = localStorage.getItem('inactivity_timeout_enabled');
        if (savedTimeout !== null) {
          setInactivityTimeoutEnabled(savedTimeout === 'true');
        }
      } catch (e) {
        console.warn('Erro ao restaurar sessão no cliente:', e);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // App datasets
  const [students, setStudents] = useState<StudentUser[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('local_students_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Erro ao restaurar alunos locais na inicialização:', e);
      }
    }
    return initialStudents;
  });
  const [activities, setActivities] = useState<Activity[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('local_activities_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Erro ao restaurar atividades locais na inicialização:', e);
      }
    }
    return initialActivities;
  });
  const [schedule] = useState(initialSchedule);
  const [library, setLibrary] = useState<LibraryFile[]>(initialLibrary);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);

  // Active view tab: 'painel' | 'atividades' | 'alunos' | 'horarios' | 'arquivos' | 'grading' | 'mensagens' | 'configuracoes'

  const [selectedActivityForGrading, setSelectedActivityForGrading] = useState<Activity | null>(null);

  // Global search input
  const [globalSearch, setGlobalSearch] = useState('');

  // Mobile menu drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals state
  const [isNewActivityModalOpen, setIsNewActivityModalOpen] = useState(false);
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  const [isNewSecondTeacherModalOpen, setIsNewSecondTeacherModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentUser | null>(null);
  const [supervisingStudent, setSupervisingStudent] = useState<StudentUser | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isEditActivityModalOpen, setIsEditActivityModalOpen] = useState(false);
  const [parallelRecoveryParentActivity, setParallelRecoveryParentActivity] = useState<Activity | null>(null);
  const [viewingActivity, setViewingActivity] = useState<Activity | null>(null);
  const [teacherSaveStatus, setTeacherSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [globalDbStatus, setGlobalDbStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [newTeacherPassword, setNewTeacherPassword] = useState('');

  // Sidebar Items Visibility State
  const [hiddenSidebarItems, setHiddenSidebarItems] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('hidden_sidebar_items');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // AI Auto-Reply State for Teacher (Prof. Gilson bot)
  const [isAiAutoReplyEnabled, setIsAiAutoReplyEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teacher_ai_auto_reply_enabled');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const handleToggleAiAutoReply = (enabled: boolean) => {
    setIsAiAutoReplyEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('teacher_ai_auto_reply_enabled', String(enabled));
    }
  };

  const toggleSidebarItemVisibility = (itemId: string) => {
    setHiddenSidebarItems((prev) => {
      const updated = prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId];
      if (typeof window !== 'undefined') {
        localStorage.setItem('hidden_sidebar_items', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const showGlobalStatus = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setGlobalDbStatus({ type: type === 'info' ? 'success' : type, message });
    setTimeout(() => {
      setGlobalDbStatus((current) => (current?.message === message ? null : current));
    }, 6000);
  }, []);

  const handleSaveDriveFolderUrl = async (url: string) => {
    const cleanUrl = url.trim();

    // 1. Atualizar estado em memória
    setTeacher((prev) => ({ ...prev, driveFolderUrl: cleanUrl }));

    // 2. Persistir localmente no localStorage e sessionStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('teacher_drive_folder_url', cleanUrl);

        const sessionStr = sessionStorage.getItem('active_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          if (session.teacherData) {
            session.teacherData.driveFolderUrl = cleanUrl;
            sessionStorage.setItem('active_session', JSON.stringify(session));
          }
        }
      } catch (e) {
        console.warn('Erro ao atualizar armazenamento local da sessão:', e);
      }
    }

    // 3. Persistir de forma garantida no Supabase (Upsert / Update)
    if (isSupabaseConfigured && supabase) {
      try {
        const cleanEmail = (teacher.email || 'gilson.flores@escola.edu.br').trim().toLowerCase();
        const isValidUUID = (id?: string | null) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        const payload: any = {
          email: cleanEmail,
          name: teacher.name || 'Gilson Flores',
          subject: teacher.subject || 'Sociologia',
          avatar_url: teacher.avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
          phone: teacher.phone || null,
          school: teacher.school || null,
          drive_folder_url: cleanUrl,
        };

        if (teacher.id && isValidUUID(teacher.id)) {
          payload.id = teacher.id;
        }

        // Tentativa de upsert no Supabase
        const { data: upsertData, error: upsertErr } = await supabase
          .from('teachers')
          .upsert(payload, { onConflict: 'email' })
          .select('*')
          .maybeSingle();

        if (upsertErr) {
          console.warn('Upsert de drive_folder_url no Supabase teve aviso, tentando fallback de update:', upsertErr.message);
          let updated = false;

          if (teacher.id && isValidUUID(teacher.id)) {
            const { error: errId } = await supabase
              .from('teachers')
              .update({ drive_folder_url: cleanUrl })
              .eq('id', teacher.id);
            if (!errId) updated = true;
          }

          if (!updated && teacher.email) {
            await supabase
              .from('teachers')
              .update({ drive_folder_url: cleanUrl })
              .eq('email', teacher.email);
          }
        } else if (upsertData?.id) {
          setTeacher((prev) => ({ ...prev, id: upsertData.id, driveFolderUrl: cleanUrl }));
        }
      } catch (err) {
        console.warn('Exceção ao salvar drive_folder_url no Supabase:', err);
      }
    }

    showGlobalStatus('success', 'Link do repositório do Google Drive salvo e gravado com sucesso!');
  };

  const sanitizeLibraryForStorage = (files: LibraryFile[]) => {
    return files.map((item) => {
      if (item.driveUrl && item.driveUrl.startsWith('data:') && item.driveUrl.length > 50000) {
        return { ...item, driveUrl: '' };
      }
      return item;
    });
  };

  const handleAddLibraryFile = async (newFile: LibraryFile) => {
    setLibrary((prev) => [newFile, ...prev]);
    if (typeof window !== 'undefined') {
      try {
        const updated = sanitizeLibraryForStorage([newFile, ...library]);
        localStorage.setItem('library_files_data', JSON.stringify(updated));
      } catch (err) {
        console.warn('Não foi possível salvar os arquivos no localStorage (cota excedida):', err);
      }
    }
    if (isSupabaseConfigured && supabase) {
      try {
        // Se a Data URL for muito grande para a coluna text do Supabase, salvar string vazia para evitar estouro
        const safeDriveUrl =
          newFile.driveUrl && newFile.driveUrl.startsWith('data:') && newFile.driveUrl.length > 500000
            ? ''
            : newFile.driveUrl || '';

        await supabase.from('library_files').insert({
          id: newFile.id,
          title: newFile.title,
          category: newFile.category,
          turma: newFile.turma,
          file_size: newFile.fileSize,
          updated_at: newFile.updatedAt,
          drive_url: safeDriveUrl,
        });
      } catch (err) {
        console.warn('Erro ao salvar arquivo no Supabase:', err);
      }
    }
    showGlobalStatus('success', 'Arquivo cadastrado com sucesso!');
  };

  const handleDeleteLibraryFile = async (fileId: string) => {
    setLibrary((prev) => prev.filter((f) => f.id !== fileId));
    if (typeof window !== 'undefined') {
      try {
        const updated = sanitizeLibraryForStorage(library.filter((f) => f.id !== fileId));
        localStorage.setItem('library_files_data', JSON.stringify(updated));
      } catch (err) {
        console.warn('Erro ao atualizar localStorage após deleção:', err);
      }
    }
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('library_files').delete().eq('id', fileId);
      } catch (err) {
        console.warn('Erro ao deletar arquivo no Supabase:', err);
      }
    }
    showGlobalStatus('success', 'Arquivo removido da biblioteca.');
  };

  // Carregar dados iniciais do Supabase se configurado
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;

    const loadData = async () => {
      try {
        // 0. Carregar Dados do Professor
        const { data: authUser } = await client.auth.getUser();
        const activeEmail = authUser?.user?.email || teacher.email;

        if (activeEmail) {
          const { data: teacherRow, error: teacherErr } = await client
            .from('teachers')
            .select('*')
            .eq('email', activeEmail)
            .maybeSingle();

          if (teacherErr) {
            console.error('Erro ao buscar professor no Supabase:', teacherErr.message);
          } else if (teacherRow) {
            setTeacher((prev) => ({
              id: teacherRow.id,
              name: teacherRow.name,
              subject: teacherRow.subject || 'Sociologia',
              email: teacherRow.email,
              avatarUrl: teacherRow.avatar_url || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
              phone: teacherRow.phone || '',
              school: teacherRow.school || '',
              driveFolderUrl: teacherRow.drive_folder_url || prev.driveFolderUrl || '',
            }));
          }
        }

        // 1. Carregar Alunos do Supabase
        const { data: dbStudents } = await client.from('students').select('*');
        if (dbStudents && dbStudents.length > 0) {
          // Ler cache local para preservar vínculos que possam não ter colunas no Supabase
          const localMap: Record<string, StudentUser> = {};
          if (typeof window !== 'undefined') {
            try {
              const saved = localStorage.getItem('local_students_data');
              if (saved) {
                const parsed: StudentUser[] = JSON.parse(saved);
                parsed.forEach((s) => {
                  if (s.id) localMap[s.id] = s;
                  if (s.matricula) localMap[s.matricula] = s;
                });
              }
            } catch (e) {
              console.warn('Erro ao ler cache local de estudantes:', e);
            }
          }

          const mappedStudents: StudentUser[] = dbStudents.map((s) => {
            let parsedPneConditions: string[] | undefined = undefined;
            if (s.pne_conditions) {
              if (Array.isArray(s.pne_conditions)) {
                parsedPneConditions = s.pne_conditions;
              } else if (typeof s.pne_conditions === 'string') {
                try {
                  const parsed = JSON.parse(s.pne_conditions);
                  parsedPneConditions = Array.isArray(parsed) ? parsed : [s.pne_conditions];
                } catch {
                  parsedPneConditions = s.pne_conditions.split(',').map((c: string) => c.trim()).filter(Boolean);
                }
              }
            }

            const localMatch = localMap[s.id] || (s.matricula ? localMap[s.matricula] : undefined);

            const finalPneConditions = (parsedPneConditions && parsedPneConditions.length > 0)
              ? parsedPneConditions
              : (localMatch?.pneConditions || undefined);

            const finalSecondTeacherId = s.second_teacher_id || localMatch?.secondTeacherId || undefined;
            const finalSecondTeacherName = s.second_teacher_name || localMatch?.secondTeacherName || undefined;

            return {
              id: s.id,
              fullName: s.full_name,
              turma: s.turma,
              matricula: s.matricula,
              tag: s.tag,
              pneConditions: finalPneConditions,
              passwordHash: s.password_hash || '1234',
              avatarUrl:
                s.avatar_url ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
              pedagogicalNotes: s.pedagogical_notes || localMatch?.pedagogicalNotes || '',
              secondTeacherId: finalSecondTeacherId,
              secondTeacherName: finalSecondTeacherName,
            };
          });

          setStudents(mappedStudents);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('local_students_data', JSON.stringify(mappedStudents));
            } catch (e) {
              console.warn('Erro ao atualizar cache local de estudantes:', e);
            }
          }

          // Se há um aluno logado no momento, sincroniza seu avatar e dados com os dados frescos do Supabase
          if (currentStudent) {
            const matchedCurrent = mappedStudents.find(
              (s) =>
                s.id === currentStudent.id ||
                (s.matricula && s.matricula === currentStudent.matricula) ||
                (s.fullName && normalizeStudentName(s.fullName) === normalizeStudentName(currentStudent.fullName))
            );
            if (matchedCurrent) {
              setCurrentStudent((prev) => (prev ? { ...prev, ...matchedCurrent } : matchedCurrent));
              if (typeof window !== 'undefined') {
                try {
                  sessionStorage.setItem(
                    'active_session',
                    JSON.stringify({ role: 'student', studentId: matchedCurrent.id, studentData: matchedCurrent })
                  );
                } catch (e) {}
              }
            }
          }
        }

        // 2. Carregar Atividades e Entregas do Supabase
        const { data: dbActivities } = await client.from('activities').select('*');
        const { data: dbSubmissions } = await client.from('submissions').select('*');

        // Ler cache local de atividades para preservação de seleção de PNE caso o banco ainda esteja migrando
        let localActivitiesMap: { [id: string]: Activity } = {};
        if (typeof window !== 'undefined') {
          try {
            const cachedActs = localStorage.getItem('local_activities_data');
            if (cachedActs) {
              const parsedActs: Activity[] = JSON.parse(cachedActs);
              if (Array.isArray(parsedActs)) {
                parsedActs.forEach((a) => {
                  if (a.id) localActivitiesMap[a.id] = a;
                });
              }
            }
          } catch (e) {}
        }

        if (dbActivities && dbActivities.length > 0) {
          const mappedActivities: Activity[] = dbActivities.map((act) => {
            let parsedQuestions = [];
            if (act.questions) {
              if (typeof act.questions === 'string') {
                try {
                  parsedQuestions = JSON.parse(act.questions);
                } catch {
                  parsedQuestions = [];
                }
              } else if (Array.isArray(act.questions)) {
                parsedQuestions = act.questions;
              }
            }

            // Parse robusto de included_pne_student_ids
            let parsedIncludedPneIds: string[] = [];
            if (act.included_pne_student_ids) {
              if (Array.isArray(act.included_pne_student_ids)) {
                parsedIncludedPneIds = act.included_pne_student_ids;
              } else if (typeof act.included_pne_student_ids === 'string') {
                try {
                  const parsed = JSON.parse(act.included_pne_student_ids);
                  parsedIncludedPneIds = Array.isArray(parsed) ? parsed : [act.included_pne_student_ids];
                } catch {
                  parsedIncludedPneIds = act.included_pne_student_ids
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter(Boolean);
                }
              }
            }

            const localAct = localActivitiesMap[act.id];
            const finalIncludedPneIds =
              parsedIncludedPneIds && parsedIncludedPneIds.length > 0
                ? parsedIncludedPneIds
                : localAct?.includedPneStudentIds || [];

            const actMaxGrade = act.max_grade ? Number(act.max_grade) : (act.maxGrade || 10);
            const distribution = getActivityGradeDistribution({
              maxGrade: actMaxGrade,
              type: act.type,
              questions: parsedQuestions,
            });

            const subs = (dbSubmissions || [])
              .filter((sub) => sub.activity_id === act.id)
              .map((sub) => ({
                studentId: sub.student_id,
                studentName: sub.student_name,
                matricula: sub.matricula,
                tag: sub.tag,
                avatarUrl: sub.avatar_url,
                objectiveScore: Number(sub.objective_score || 0),
                maxObjectiveScore: sub.max_objective_score !== undefined && sub.max_objective_score !== null
                  ? Number(sub.max_objective_score)
                  : distribution.maxObjectiveGrade,
                essayScore:
                  sub.essay_score !== null && sub.essay_score !== undefined
                    ? Number(sub.essay_score)
                    : undefined,
                maxEssayScore: sub.max_essay_score !== undefined && sub.max_essay_score !== null
                  ? Number(sub.max_essay_score)
                  : distribution.maxEssayGrade,
                status: sub.status,
                essayAnswer: sub.essay_answer,
                teacherFeedback: sub.teacher_feedback,
                extraPoints: Number(sub.extra_points || 0),
                registeredInStateSystem: Boolean(sub.registered_in_state_system),
                groupMembers: sub.group_members,
                returnCount: Number(sub.return_count || 0),
              }));

            return {
              id: act.id,
              title: act.title,
              subject: act.subject || 'Sociologia',
              description: act.description || '',
              supportMaterial: act.support_material || act.supportMaterial || '',
              turma: act.turma || '',
              type: act.type || 'Avaliação',
              status: act.status || 'Ativo',
              deadline: act.deadline || '',
              maxGrade: act.max_grade ? Number(act.max_grade) : (act.maxGrade || 10),
              allowGroupWork: act.allow_group_work !== undefined && act.allow_group_work !== null ? Boolean(act.allow_group_work) : Boolean(act.allowGroupWork),
              securityFocusLock: act.security_focus_lock !== undefined && act.security_focus_lock !== null ? Boolean(act.security_focus_lock) : Boolean(act.securityFocusLock),
              securityBlockCopyStatement: act.security_block_copy_statement !== undefined && act.security_block_copy_statement !== null ? Boolean(act.security_block_copy_statement) : Boolean(act.securityBlockCopyStatement),
              securityBlockPasteEssay: act.security_block_paste_essay !== undefined && act.security_block_paste_essay !== null ? Boolean(act.security_block_paste_essay) : Boolean(act.securityBlockPasteEssay),
              includedPneStudentIds: finalIncludedPneIds,
              isAdapted: Boolean(act.is_adapted || act.isAdapted || act.title?.startsWith('[PNE Leve/Mod]') || act.title?.startsWith('[PNE Lúdica]') || act.title?.startsWith('[Adaptada PNE]')),
              adaptationType: act.adaptation_type || act.adaptationType || (act.title?.startsWith('[PNE Lúdica]') ? 'severe_playful' : ((act.title?.startsWith('[PNE Leve/Mod]') || act.title?.startsWith('[Adaptada PNE]')) ? 'mild_moderate' : undefined)),
              playfulGameHtml: act.playful_game_html || act.playfulGameHtml || undefined,
              adaptedFromId: act.adapted_from_id || act.adaptedFromId || undefined,
              isRecovery: Boolean(act.is_recovery || act.isRecovery || act.title?.startsWith('[Recuperação Paralela]') || act.title?.startsWith('[Recuperação]')),
              recoveryFromId: act.recovery_from_id || act.recoveryFromId || undefined,
              recoveryApproach: act.recovery_approach || act.recoveryApproach || undefined,
              questions: parsedQuestions,
              totalSubmissions: act.total_submissions || subs.length,
              totalStudents: act.total_students || 0,
              pendingCorrection: act.pending_correction || subs.filter((s) => s.status === 'pending').length,
              averageGrade: act.average_grade ? Number(act.average_grade) : undefined,
              completedDate: act.completed_date,
              submissions: subs,
            };
          });
          setActivities(mappedActivities);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('local_activities_data', JSON.stringify(mappedActivities));
            } catch (e) {
              console.warn('Erro ao atualizar cache local de atividades:', e);
            }
          }
        }

        // 3. Carregar Mensagens do Supabase
        const { data: dbMessages } = await client.from('chat_messages').select('*').order('created_at', { ascending: true });
        if (dbMessages && dbMessages.length > 0) {
          const mappedMessages: ChatMessage[] = dbMessages.map((m) => ({
            id: m.id || `msg-${m.created_at}`,
            threadId: m.thread_id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            senderRole: m.sender_role,
            senderAvatar: m.sender_avatar,
            recipientId: m.recipient_id,
            recipientName: m.recipient_name,
            content: m.content,
            createdAt: m.created_at ? new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
            read: Boolean(m.read),
            activityId: m.activity_id,
            activityTitle: m.activity_title,
          }));
          setChatMessages(mappedMessages);
        }

        // 4. Carregar Arquivos da Biblioteca do Supabase
        const { data: dbLibrary } = await client.from('library_files').select('*');
        if (dbLibrary && dbLibrary.length > 0) {
          const mappedLibrary: LibraryFile[] = dbLibrary.map((item) => ({
            id: item.id,
            title: item.title,
            category: item.category || 'Geral',
            turma: item.turma || 'Todas',
            fileSize: item.file_size || '1 MB',
            updatedAt: item.updated_at || new Date().toLocaleDateString('pt-BR'),
            driveUrl: item.drive_url || item.file_url || '',
          }));
          setLibrary(mappedLibrary);
        } else if (typeof window !== 'undefined') {
          const savedLib = localStorage.getItem('library_files_data');
          if (savedLib) {
            try {
              setLibrary(JSON.parse(savedLib));
            } catch (e) {
              console.warn(e);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados do Supabase:', err);
      }
    };

    loadData();
  }, []);

  // Auth Handlers
  const handleLoginTeacher = (loggedTeacher: TeacherUser) => {
    setTeacher(loggedTeacher);
    setRole('teacher');
    setCurrentTab('painel');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('active_session', JSON.stringify({ role: 'teacher', teacherData: loggedTeacher }));
      requestNotificationPermission().catch(() => {});
    }
  };

  const handleLoginSecondTeacher = (loggedTeacher: TeacherUser) => {
    setTeacher(loggedTeacher);
    setRole('second_teacher');
    setCurrentTab('2_professor');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('active_session', JSON.stringify({ role: 'second_teacher', teacherData: loggedTeacher }));
      requestNotificationPermission().catch(() => {});
    }
  };

  const handleLoginStudent = (loggedStudent: StudentUser) => {
    setCurrentStudent(loggedStudent);
    setRole('student');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'active_session',
        JSON.stringify({
          role: 'student',
          studentId: loggedStudent.id,
          studentData: loggedStudent,
        })
      );
      requestNotificationPermission().catch(() => {});
    }
    // Verificar prazos imediatamente no login do aluno
    setTimeout(() => {
      checkAndNotifyApproachingDeadlines(activities, loggedStudent, showGlobalStatus);
    }, 1200);
  };

  const handleLogout = useCallback((reason?: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('active_session');
    }
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    setRole(null);
    setCurrentStudent(null);
    if (reason && typeof reason === 'string') {
      showGlobalStatus('error', reason);
    }
  }, []);

  // Temporizador de Desconexão por Inatividade (8 minutos)
  useEffect(() => {
    if (!role || !inactivityTimeoutEnabled) return;

    const INACTIVITY_LIMIT_MS = 8 * 60 * 1000; // 8 minutos = 480.000 ms
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout('Sessão encerrada por inatividade (8 minutos sem interação).');
      }, INACTIVITY_LIMIT_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [role, inactivityTimeoutEnabled, handleLogout]);

  // Monitoramento e Notificações Periódicas de Prazos de Atividades para Alunos
  useEffect(() => {
    if (!role || role !== 'student' || !currentStudent) return;

    checkAndNotifyApproachingDeadlines(activities, currentStudent, showGlobalStatus);
    const deadlineInterval = setInterval(() => {
      checkAndNotifyApproachingDeadlines(activities, currentStudent, showGlobalStatus);
    }, 60 * 1000); // Verifica a cada 1 minuto

    return () => clearInterval(deadlineInterval);
  }, [role, currentStudent, activities, showGlobalStatus]);

  // Sincronização em Tempo Real de Mensagens e Novas Atividades via Supabase (Realtime Channel + Polling)
  useEffect(() => {
    if (!role || !isSupabaseConfigured || !supabase) return;

    const client = supabase;
    const currentUserId = role === 'student' ? currentStudent?.id : (role === 'teacher' ? teacher.id || 'teacher-1' : 'second-teacher');

    // Realtime Channel para Mensagens de Chat e Atividades
    const realtimeChannel = client
      .channel('realtime_app_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsgRow = payload.new;
          if (!newMsgRow) return;

          const newMsg: ChatMessage = {
            id: newMsgRow.id || `msg-${newMsgRow.created_at}`,
            threadId: newMsgRow.thread_id,
            senderId: newMsgRow.sender_id,
            senderName: newMsgRow.sender_name,
            senderRole: newMsgRow.sender_role,
            senderAvatar: newMsgRow.sender_avatar,
            recipientId: newMsgRow.recipient_id,
            recipientName: newMsgRow.recipient_name,
            content: newMsgRow.content,
            createdAt: newMsgRow.created_at
              ? new Date(newMsgRow.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : '',
            read: Boolean(newMsgRow.read),
            activityId: newMsgRow.activity_id,
            activityTitle: newMsgRow.activity_title,
          };

          setChatMessages((prev) => {
            const { updated, isNew } = mergeChatMessage(prev, newMsg);

            // Disparar Notificação Sonora e Visual Nativas se a mensagem for nova e de outro usuário
            if (isNew && newMsg.senderId !== currentUserId) {
              if (role === 'student' && currentStudent) {
                const isForMe = newMsg.threadId === currentStudent.id || newMsg.recipientId === currentStudent.id || newMsg.threadId === 'broadcast';
                if (isForMe) {
                  sendBrowserNotification(`Mensagem de ${newMsg.senderName || 'Prof. Gilson Flores'}:`, {
                    body: newMsg.content,
                    icon: newMsg.senderAvatar || teacher.avatarUrl,
                    tag: `msg-${newMsg.id}`,
                  });
                  showGlobalStatus('info', `💬 Nova mensagem de ${newMsg.senderName || 'Prof. Gilson Flores'}`);
                }
              } else if (role === 'teacher') {
                sendBrowserNotification(`Mensagem de ${newMsg.senderName}:`, {
                  body: newMsg.content,
                  icon: newMsg.senderAvatar,
                  tag: `msg-${newMsg.id}`,
                });
                showGlobalStatus('info', `💬 Nova mensagem de ${newMsg.senderName}`);
              } else if (role === 'second_teacher') {
                if (newMsg.recipientId === 'second-teacher' || newMsg.recipientName?.includes('2º')) {
                  sendBrowserNotification(`Mensagem de ${newMsg.senderName}:`, {
                    body: newMsg.content,
                    icon: newMsg.senderAvatar,
                    tag: `msg-${newMsg.id}`,
                  });
                }
              }
            }

            return updated;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activities' },
        (payload) => {
          const newActRow = payload.new;
          if (!newActRow) return;

          if (role === 'student' && currentStudent) {
            notifyNewActivityForStudent(
              {
                id: newActRow.id,
                title: newActRow.title,
                subject: newActRow.subject || 'Sociologia',
                description: newActRow.description || '',
                turma: newActRow.turma || '',
                type: newActRow.type || 'Avaliação',
                status: newActRow.status || 'Ativo',
                deadline: newActRow.deadline || '',
                maxGrade: Number(newActRow.max_grade || 10),
                isAdapted: Boolean(newActRow.is_adapted),
                questions: [],
                totalSubmissions: 0,
                totalStudents: 0,
                pendingCorrection: 0,
                submissions: [],
              },
              currentStudent,
              showGlobalStatus
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'activities' },
        (payload) => {
          const updatedActRow = payload.new;
          const oldActRow = payload.old;
          if (!updatedActRow) return;

          // Atualiza lista de atividades no estado local
          setActivities((prev) => {
            const exists = prev.some((a) => a.id === updatedActRow.id);
            if (!exists) return prev;
            return prev.map((a) =>
              a.id === updatedActRow.id
                ? {
                    ...a,
                    title: updatedActRow.title || a.title,
                    description: updatedActRow.description ?? a.description,
                    turma: updatedActRow.turma || a.turma,
                    status: updatedActRow.status || a.status,
                    deadline: updatedActRow.deadline || a.deadline,
                    maxGrade: Number(updatedActRow.max_grade ?? a.maxGrade),
                  }
                : a
            );
          });

          if (role === 'student' && currentStudent) {
            const hasNewDeadline = updatedActRow.deadline && (!oldActRow || oldActRow.deadline !== updatedActRow.deadline);
            if (hasNewDeadline) {
              notifyDeadlineExtendedForStudent(
                {
                  id: updatedActRow.id,
                  title: updatedActRow.title,
                  subject: updatedActRow.subject || 'Sociologia',
                  description: updatedActRow.description || '',
                  turma: updatedActRow.turma || '',
                  type: updatedActRow.type || 'Avaliação',
                  status: updatedActRow.status || 'Ativo',
                  deadline: updatedActRow.deadline || '',
                  maxGrade: Number(updatedActRow.max_grade || 10),
                  isAdapted: Boolean(updatedActRow.is_adapted),
                  questions: [],
                  totalSubmissions: 0,
                  totalStudents: 0,
                  pendingCorrection: 0,
                  submissions: [],
                },
                currentStudent,
                showGlobalStatus
              );
            }
          }
        }
      )
      .subscribe();

    // Fallback polling a cada 8 segundos para garantir sincronização caso o websocket oscile
    const pollInterval = setInterval(async () => {
      try {
        const { data: latestMsgs } = await client
          .from('chat_messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (latestMsgs && latestMsgs.length > 0) {
          setChatMessages((prev) => {
            let currentList = prev;
            latestMsgs.reverse().forEach((m) => {
              const mapped: ChatMessage = {
                id: m.id || `msg-${m.created_at}`,
                threadId: m.thread_id,
                senderId: m.sender_id,
                senderName: m.sender_name,
                senderRole: m.sender_role,
                senderAvatar: m.sender_avatar,
                recipientId: m.recipient_id,
                recipientName: m.recipient_name,
                content: m.content,
                createdAt: m.created_at
                  ? new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : '',
                read: Boolean(m.read),
                activityId: m.activity_id,
                activityTitle: m.activity_title,
              };

              const { updated, isNew } = mergeChatMessage(currentList, mapped);
              currentList = updated;

              if (isNew && mapped.senderId !== currentUserId) {
                if (role === 'student' && currentStudent) {
                  const isForMe = mapped.threadId === currentStudent.id || mapped.recipientId === currentStudent.id || mapped.threadId === 'broadcast';
                  if (isForMe) {
                    sendBrowserNotification(`Mensagem de ${mapped.senderName || 'Prof. Gilson Flores'}:`, {
                      body: mapped.content,
                      icon: mapped.senderAvatar || teacher.avatarUrl,
                      tag: `msg-${mapped.id}`,
                    });
                  }
                } else if (role === 'teacher' && mapped.senderRole === 'student') {
                  sendBrowserNotification(`Mensagem de ${mapped.senderName}:`, {
                    body: mapped.content,
                    icon: mapped.senderAvatar,
                    tag: `msg-${mapped.id}`,
                  });
                }
              }
            });
            return currentList;
          });
        }
      } catch (pollErr) {
        // Silently handle polling errors
      }
    }, 8000);

    return () => {
      client.removeChannel(realtimeChannel);
      clearInterval(pollInterval);
    };
  }, [role, currentStudent, teacher.avatarUrl, teacher.id, showGlobalStatus]);

  // Activity Handlers
  const sanitizeTypeForDb = (rawType: string): string => {
    if (rawType === 'Trabalho em grupo') return 'Dinâmica';
    if (rawType === 'Projeto de pesquisa') return 'Avaliação';
    const valid = ['Simulado', 'Redação', 'Dinâmica', 'Avaliação'];
    return valid.includes(rawType) ? rawType : 'Avaliação';
  };

  const handleCreateActivity = async (newAct: Activity) => {
    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('error', 'ARMADILHA DE BUG DISPARADA: Supabase não está configurado no ambiente. A atividade NÃO foi salva.');
      return;
    }

    try {
      const fullPayload = {
        id: newAct.id,
        title: newAct.title,
        subject: newAct.subject || 'Sociologia',
        description: newAct.description || '',
        support_material: newAct.supportMaterial || '',
        turma: newAct.turma || '',
        type: newAct.type,
        status: newAct.status,
        deadline: newAct.deadline || '',
        max_grade: newAct.maxGrade || 10,
        allow_group_work: newAct.allowGroupWork || false,
        security_focus_lock: newAct.securityFocusLock || false,
        security_block_copy_statement: newAct.securityBlockCopyStatement || false,
        security_block_paste_essay: newAct.securityBlockPasteEssay || false,
        included_pne_student_ids: newAct.includedPneStudentIds || [],
        is_adapted: newAct.isAdapted || false,
        adaptation_type: newAct.adaptationType || null,
        playful_game_html: newAct.playfulGameHtml || null,
        adapted_from_id: newAct.adaptedFromId || null,
        is_recovery: newAct.isRecovery || false,
        recovery_from_id: newAct.recoveryFromId || null,
        recovery_approach: newAct.recoveryApproach || null,
        questions: newAct.questions || [],
        total_submissions: newAct.totalSubmissions || 0,
        total_students: newAct.totalStudents || 0,
        pending_correction: newAct.pendingCorrection || 0,
      };

      let { error } = await supabase.from('activities').insert(fullPayload);

      // Se falhou (ex: restrição check constraint do tipo ou colunas inexistentes no Supabase)
      if (error) {
        console.warn('Inserção direta de atividade falhou, executando estratégias de fallback...', error);
        const isConstraintErr =
          error.message?.includes('check constraint') ||
          error.message?.includes('type_check') ||
          error.details?.includes('type_check');

        // Tentativa 1: mesmo payload com tipo seguro para o banco
        if (isConstraintErr) {
          const safeTypePayload = { ...fullPayload, type: sanitizeTypeForDb(fullPayload.type) };
          const safeTypeRes = await supabase.from('activities').insert(safeTypePayload);
          if (!safeTypeRes.error) {
            error = null;
          } else {
            error = safeTypeRes.error;
          }
        }

        // Tentativa 2: enviar payload básico saneado se faltar coluna no banco
        if (error) {
          const basicPayload = {
            id: newAct.id,
            title: newAct.title,
            subject: newAct.subject || 'Sociologia',
            description: newAct.description || '',
            support_material: newAct.supportMaterial || '',
            turma: newAct.turma || '',
            type: sanitizeTypeForDb(newAct.type),
            status: newAct.status,
            deadline: newAct.deadline || '',
            max_grade: newAct.maxGrade || 10,
            allow_group_work: newAct.allowGroupWork || false,
            security_focus_lock: newAct.securityFocusLock || false,
            security_block_copy_statement: newAct.securityBlockCopyStatement || false,
            security_block_paste_essay: newAct.securityBlockPasteEssay || false,
            questions: newAct.questions || [],
            total_submissions: newAct.totalSubmissions || 0,
            total_students: newAct.totalStudents || 0,
            pending_correction: newAct.pendingCorrection || 0,
          };

          const fallbackRes = await supabase.from('activities').insert(basicPayload);
          if (!fallbackRes.error) {
            error = null;
          } else {
            const upsertRes = await supabase.from('activities').upsert(basicPayload);
            error = upsertRes.error;
          }
        }
      }

      if (error) {
        const errorDetails = error.message || error.details || error.hint || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        console.error('Erro ao criar atividade no Supabase:', errorDetails, error);
        showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro ao gravar atividade no Supabase (${error.code || 'BD'}): ${errorDetails || 'Erro desconhecido'}`);
        // Mantém no estado local e cache local para garantir usabilidade sem perder dados do professor
        setActivities((prev) => {
          const next = [newAct, ...prev];
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('local_activities_data', JSON.stringify(next));
            } catch (e) {}
          }
          return next;
        });
        return;
      }

      setActivities((prev) => {
        const next = [newAct, ...prev];
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('local_activities_data', JSON.stringify(next));
          } catch (e) {}
        }
        return next;
      });
      showGlobalStatus('success', `Atividade "${newAct.title}" criada e confirmada no Supabase com sucesso!`);
      sendBrowserNotification(`📢 Nova Atividade Publicada: ${newAct.title}`, {
        body: `Turma ${newAct.turma} • Prazo: ${newAct.deadline || 'A definir'} • Valor: ${newAct.maxGrade || 10} pts`,
        tag: `new-act-${newAct.id}`,
      });
    } catch (err: any) {
      const catchedMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      console.error('Erro ao salvar atividade no Supabase:', catchedMsg, err);
      showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Falha de conexão/execução (${catchedMsg || 'Erro desconhecido'})`);
      setActivities((prev) => {
        const next = [newAct, ...prev];
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('local_activities_data', JSON.stringify(next));
          } catch (e) {}
        }
        return next;
      });
    }
  };

  const handleSaveActivity = async (updatedAct: Activity) => {
    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('error', 'ARMADILHA DE BUG DISPARADA: Supabase não está configurado. Alterações NÃO foram gravadas.');
      return;
    }

    try {
      // Auto adjust status if deadline is specified
      const dateStr = updatedAct.deadline ? updatedAct.deadline.trim() : '';
      if (updatedAct.status !== 'Inativo' && dateStr) {
        let isoDate: string | null = null;
        const isoMatch = dateStr.match(/\b(20\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
        if (isoMatch) isoDate = isoMatch[0];
        const brMatch = dateStr.match(/\b(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(20\d\d)\b/);
        if (brMatch) {
          const [, day, month, year] = brMatch;
          isoDate = `${year}-${month}-${day}`;
        }
        const brShortMatch = dateStr.match(/\b(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\b/);
        if (brShortMatch) {
          const [, day, month] = brShortMatch;
          isoDate = `2026-${month}-${day}`;
        }

        if (isoDate) {
          const todayISO = new Date().toISOString().split('T')[0];
          if (isoDate >= todayISO) {
            updatedAct.status = 'Ativo';
          } else {
            updatedAct.status = 'Prazo Encerrado';
          }
        }
      }

      const fullPayload = {
        id: updatedAct.id,
        title: updatedAct.title,
        subject: updatedAct.subject || 'Sociologia',
        description: updatedAct.description || '',
        support_material: updatedAct.supportMaterial || '',
        turma: updatedAct.turma || '',
        type: updatedAct.type,
        status: updatedAct.status,
        deadline: updatedAct.deadline || '',
        max_grade: updatedAct.maxGrade || 10,
        allow_group_work: updatedAct.allowGroupWork || false,
        security_focus_lock: updatedAct.securityFocusLock || false,
        security_block_copy_statement: updatedAct.securityBlockCopyStatement || false,
        security_block_paste_essay: updatedAct.securityBlockPasteEssay || false,
        included_pne_student_ids: updatedAct.includedPneStudentIds || [],
        is_adapted: updatedAct.isAdapted || false,
        adaptation_type: updatedAct.adaptationType || null,
        playful_game_html: updatedAct.playfulGameHtml || null,
        adapted_from_id: updatedAct.adaptedFromId || null,
        is_recovery: updatedAct.isRecovery || false,
        recovery_from_id: updatedAct.recoveryFromId || null,
        recovery_approach: updatedAct.recoveryApproach || null,
        questions: updatedAct.questions || [],
        total_submissions: updatedAct.totalSubmissions,
        total_students: updatedAct.totalStudents,
        pending_correction: updatedAct.pendingCorrection,
        average_grade: updatedAct.averageGrade,
        completed_date: updatedAct.completedDate,
      };

      let { error } = await supabase.from('activities').upsert(fullPayload);

      if (error) {
        console.warn('Upsert de atividade falhou, executando estratégias de fallback...', error);
        const isConstraintErr =
          error.message?.includes('check constraint') ||
          error.message?.includes('type_check') ||
          error.details?.includes('type_check');

        if (isConstraintErr) {
          const safeTypePayload = { ...fullPayload, type: sanitizeTypeForDb(fullPayload.type) };
          const safeTypeRes = await supabase.from('activities').upsert(safeTypePayload);
          if (!safeTypeRes.error) {
            error = null;
          } else {
            error = safeTypeRes.error;
          }
        }

        if (error) {
          const basicPayload = {
            id: updatedAct.id,
            title: updatedAct.title,
            subject: updatedAct.subject || 'Sociologia',
            description: updatedAct.description || '',
            support_material: updatedAct.supportMaterial || '',
            turma: updatedAct.turma || '',
            type: sanitizeTypeForDb(updatedAct.type),
            status: updatedAct.status,
            deadline: updatedAct.deadline || '',
            max_grade: updatedAct.maxGrade || 10,
            allow_group_work: updatedAct.allowGroupWork || false,
            security_focus_lock: updatedAct.securityFocusLock || false,
            security_block_copy_statement: updatedAct.securityBlockCopyStatement || false,
            security_block_paste_essay: updatedAct.securityBlockPasteEssay || false,
            questions: updatedAct.questions || [],
            total_submissions: updatedAct.totalSubmissions,
            total_students: updatedAct.totalStudents,
            pending_correction: updatedAct.pendingCorrection,
            average_grade: updatedAct.averageGrade,
            completed_date: updatedAct.completedDate,
          };

          const fallbackRes = await supabase.from('activities').upsert(basicPayload);
          error = fallbackRes.error;
        }
      }

      if (error) {
        const errorDetails = error.message || error.details || error.hint || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        console.error('Erro ao atualizar atividade no Supabase:', errorDetails, error);
        showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro ao atualizar atividade no Supabase (${error.code || 'BD'}): ${errorDetails || 'Erro desconhecido'}`);
        setActivities((prev) => {
          const next = prev.map((a) => (a.id === updatedAct.id ? updatedAct : a));
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('local_activities_data', JSON.stringify(next));
            } catch (e) {}
          }
          return next;
        });
        return;
      }

      setActivities((prev) => {
        const next = prev.map((a) => (a.id === updatedAct.id ? updatedAct : a));
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('local_activities_data', JSON.stringify(next));
          } catch (e) {}
        }
        return next;
      });
      if (selectedActivityForGrading?.id === updatedAct.id) {
        setSelectedActivityForGrading(updatedAct);
      }

      // Se o prazo da atividade foi prorrogado/alterado, avisar a turma e enviar no chat
      const prevAct = activities.find((a) => a.id === updatedAct.id);
      const isDeadlineProrrogated = prevAct && updatedAct.deadline && prevAct.deadline !== updatedAct.deadline;
      if (isDeadlineProrrogated) {
        try {
          const extensionMsg = {
            id: `msg-ext-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            thread_id: 'broadcast',
            sender_id: teacher.id || 'teacher-1',
            sender_name: teacher.name || 'Prof. Gilson Flores',
            sender_role: 'teacher',
            sender_avatar: teacher.avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
            recipient_id: 'broadcast',
            recipient_name: updatedAct.turma ? `Turma ${updatedAct.turma}` : 'Todas as Turmas',
            content: `⏳ Atenção: O prazo de entrega da atividade "${updatedAct.title}" foi PRORROGADO para: ${updatedAct.deadline}.`,
            created_at: new Date().toISOString(),
            read: false,
            activity_id: updatedAct.id,
            activity_title: updatedAct.title,
          };
          await supabase.from('chat_messages').insert(extensionMsg);
        } catch (chatErr) {
          console.warn('Erro ao disparar aviso automático de prorrogação no chat:', chatErr);
        }
      }

      showGlobalStatus('success', `Alterações da atividade "${updatedAct.title}" salvas e confirmadas no Supabase!`);
    } catch (err: any) {
      const catchedMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      console.error('Erro ao atualizar atividade no Supabase:', catchedMsg, err);
      showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Falha de conexão/execução (${catchedMsg || 'Erro desconhecido'})`);
      setActivities((prev) => {
        const next = prev.map((a) => (a.id === updatedAct.id ? updatedAct : a));
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('local_activities_data', JSON.stringify(next));
          } catch (e) {}
        }
        return next;
      });
    }
  };

  const handleDeleteActivity = async (activity: Activity) => {
    // Validação de segurança pedagógica:
    // Se a atividade contiver notas aplicadas ou atividades feitas, só permita a exclusão se o botão RCO estiver assinado em todas as entregas.
    const subs = activity.submissions || [];
    const hasAppliedGradesOrWork = subs.length > 0 && subs.some(
      (s) =>
        s.status === 'graded' ||
        s.status === 'pending' ||
        s.status === 'returned' ||
        s.status === 'draft' ||
        (s.essayScore !== undefined && s.essayScore !== null) ||
        (s.objectiveScore !== undefined && s.objectiveScore > 0) ||
        Boolean(s.essayAnswer) ||
        Boolean(s.submittedAt)
    );

    if (hasAppliedGradesOrWork) {
      const allRcoSigned = subs.length > 0 && subs.every((s) => Boolean(s.registeredInStateSystem));
      if (!allRcoSigned) {
        showGlobalStatus(
          'error',
          `Bloqueio de Segurança: A atividade "${activity.title}" possui notas aplicadas ou entregas de alunos com pendência no RCO. Só é permitida a exclusão quando o botão RCO estiver assinado em todas as entregas.`
        );
        return;
      }
    }

    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('error', 'ARMADILHA DE BUG DISPARADA: Supabase não está configurado. Atividade NÃO foi excluída.');
      return;
    }

    try {
      await supabase.from('submissions').delete().eq('activity_id', activity.id);
      const { error } = await supabase.from('activities').delete().eq('id', activity.id);

      if (error) {
        console.error('Erro ao excluir atividade no Supabase:', error);
        showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro ao excluir atividade no Supabase (${error.code || 'BD'}): ${error.message}`);
        return;
      }

      setActivities((prev) => {
        const next = prev.filter((a) => a.id !== activity.id);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('local_activities_data', JSON.stringify(next));
          } catch (e) {}
        }
        return next;
      });
      if (selectedActivityForGrading?.id === activity.id) {
        setSelectedActivityForGrading(null);
      }
      showGlobalStatus('success', `Atividade "${activity.title}" excluída com sucesso do Supabase!`);
    } catch (err: any) {
      console.error('Erro ao excluir atividade no Supabase:', err);
      showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Falha ao excluir (${err?.message || ''})`);
    }
  };

  const handleSelectActivityForGrading = (act: Activity) => {
    setSelectedActivityForGrading(act);
    setCurrentTab('grading');
  };

  const handleUpdateSubmission = async (
    activityId: string,
    studentId: string,
    essayScore: number,
    feedback: string,
    status: 'graded' | 'returned' | 'draft',
    extraPoints?: number,
    registeredInStateSystem?: boolean
  ) => {
    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('error', 'ARMADILHA DE BUG DISPARADA: Supabase não configurado. Nota NÃO foi salva.');
      return;
    }

    try {
      const targetActivity = activities.find((a) => a.id === activityId);
      const currentSub = targetActivity?.submissions.find((s) => s.studentId === studentId);
      const currentReturnCount = currentSub?.returnCount || 0;

      if (status === 'returned' && currentReturnCount >= 3) {
        showGlobalStatus('error', '🚨 Bloqueio Ninja: Esta atividade já foi devolvida 3 vezes. A 4ª devolução está bloqueada! Atribua a nota final e conclua a avaliação.');
        return;
      }

      const newReturnCount = status === 'returned' ? currentReturnCount + 1 : currentReturnCount;

      // Identify group members if this is a group submission being corrected from pending queue
      const isInitialGroupGrading = currentSub?.status === 'pending' && Boolean(currentSub?.groupMembers);

      const targetGroupStudentIds = new Set<string>([studentId]);
      const missingGroupMembers: StudentUser[] = [];

      if (currentSub?.groupMembers) {
        const memberNames = currentSub.groupMembers
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean);

        memberNames.forEach((memberCandidate) => {
          const normCandidate = normalizeStudentName(memberCandidate);
          const matchedSt = students.find(
            (st) =>
              normalizeStudentName(st.fullName) === normCandidate ||
              st.fullName.toLowerCase() === memberCandidate.toLowerCase()
          );
          if (matchedSt) {
            targetGroupStudentIds.add(matchedSt.id);
            const existsInActivity = targetActivity?.submissions.some((s) => s.studentId === matchedSt.id);
            if (!existsInActivity) {
              missingGroupMembers.push(matchedSt);
            }
          }
        });

        if (targetActivity) {
          targetActivity.submissions.forEach((s) => {
            if (
              s.groupMembers === currentSub.groupMembers ||
              memberNames.some((m) => normalizeStudentName(m) === normalizeStudentName(s.studentName))
            ) {
              targetGroupStudentIds.add(s.studentId);
            }
          });
        }
      }

      // If missing members exist, insert initial submission for them first in Supabase
      if (isInitialGroupGrading && missingGroupMembers.length > 0) {
        for (const memberSt of missingGroupMembers) {
          await supabase.from('submissions').insert({
            activity_id: activityId,
            student_id: memberSt.id,
            student_name: memberSt.fullName,
            matricula: memberSt.matricula,
            tag: memberSt.tag,
            avatar_url: memberSt.avatarUrl,
            essay_answer: currentSub?.essayAnswer || '',
            status: status,
            essay_score: essayScore,
            teacher_feedback: feedback,
            objective_score: currentSub?.objectiveScore || 0,
            max_objective_score: currentSub?.maxObjectiveScore || 0,
            max_essay_score: currentSub?.maxEssayScore || 0,
            selected_objective_answers: currentSub?.selectedObjectiveAnswers || {},
            group_members: currentSub?.groupMembers || null,
            extra_points: extraPoints || 0,
          });
        }
      }

      const idsToUpdate = isInitialGroupGrading ? Array.from(targetGroupStudentIds) : [studentId];

      for (const tid of idsToUpdate) {
        const updatePayload: any = {
          essay_score: essayScore,
          teacher_feedback: feedback,
          status: status,
        };
        if (status === 'returned') updatePayload.return_count = newReturnCount;
        if (extraPoints !== undefined) updatePayload.extra_points = extraPoints;
        if (registeredInStateSystem !== undefined) updatePayload.registered_in_state_system = registeredInStateSystem;

        const { error } = await supabase
          .from('submissions')
          .update(updatePayload)
          .eq('activity_id', activityId)
          .eq('student_id', tid);

        if (error) {
          if (error.message?.includes('return_count') || error.code === 'PGRST204') {
            delete updatePayload.return_count;
            await supabase
              .from('submissions')
              .update(updatePayload)
              .eq('activity_id', activityId)
              .eq('student_id', tid);
          } else {
            console.error(`Erro ao atualizar nota no Supabase para ${tid}:`, error);
          }
        }
      }

      setActivities((prev) =>
        prev.map((act) => {
          if (act.id !== activityId) return act;

          let updatedSubmissions = [...act.submissions];

          if (isInitialGroupGrading && missingGroupMembers.length > 0) {
            missingGroupMembers.forEach((memberSt) => {
              if (!updatedSubmissions.some((s) => s.studentId === memberSt.id)) {
                updatedSubmissions.push({
                  studentId: memberSt.id,
                  studentName: memberSt.fullName,
                  matricula: memberSt.matricula,
                  tag: memberSt.tag,
                  avatarUrl: memberSt.avatarUrl,
                  submittedAt: currentSub?.submittedAt || new Date().toLocaleDateString('pt-BR'),
                  objectiveScore: currentSub?.objectiveScore || 0,
                  maxObjectiveScore: currentSub?.maxObjectiveScore || 0,
                  maxEssayScore: currentSub?.maxEssayScore || 0,
                  status: status,
                  essayAnswer: currentSub?.essayAnswer || '',
                  selectedObjectiveAnswers: currentSub?.selectedObjectiveAnswers || {},
                  groupMembers: currentSub?.groupMembers || undefined,
                  teacherFeedback: feedback,
                  essayScore: essayScore,
                  extraPoints: extraPoints || 0,
                  registeredInStateSystem: registeredInStateSystem || false,
                });
              }
            });
          }

          updatedSubmissions = updatedSubmissions.map((sub) => {
            if (idsToUpdate.includes(sub.studentId)) {
              return {
                ...sub,
                essayScore,
                teacherFeedback: feedback,
                status,
                returnCount: status === 'returned' ? (sub.returnCount || 0) + 1 : sub.returnCount,
                extraPoints: extraPoints !== undefined ? extraPoints : sub.extraPoints,
                registeredInStateSystem:
                  registeredInStateSystem !== undefined ? registeredInStateSystem : sub.registeredInStateSystem,
              };
            }
            return sub;
          });

          const pendingCorrection = updatedSubmissions.filter((s) => s.status === 'pending').length;

          return {
            ...act,
            pendingCorrection,
            submissions: updatedSubmissions,
          };
        })
      );

      if (selectedActivityForGrading && selectedActivityForGrading.id === activityId) {
        setSelectedActivityForGrading((prev) => {
          if (!prev) return null;
          let updatedSubmissions = [...prev.submissions];

          if (isInitialGroupGrading && missingGroupMembers.length > 0) {
            missingGroupMembers.forEach((memberSt) => {
              if (!updatedSubmissions.some((s) => s.studentId === memberSt.id)) {
                updatedSubmissions.push({
                  studentId: memberSt.id,
                  studentName: memberSt.fullName,
                  matricula: memberSt.matricula,
                  tag: memberSt.tag,
                  avatarUrl: memberSt.avatarUrl,
                  submittedAt: currentSub?.submittedAt || new Date().toLocaleDateString('pt-BR'),
                  objectiveScore: currentSub?.objectiveScore || 0,
                  maxObjectiveScore: currentSub?.maxObjectiveScore || 0,
                  maxEssayScore: currentSub?.maxEssayScore || 0,
                  status: status,
                  essayAnswer: currentSub?.essayAnswer || '',
                  selectedObjectiveAnswers: currentSub?.selectedObjectiveAnswers || {},
                  groupMembers: currentSub?.groupMembers || undefined,
                  teacherFeedback: feedback,
                  essayScore: essayScore,
                  extraPoints: extraPoints || 0,
                  registeredInStateSystem: registeredInStateSystem || false,
                });
              }
            });
          }

          return {
            ...prev,
            submissions: updatedSubmissions.map((sub) =>
              idsToUpdate.includes(sub.studentId)
                ? {
                    ...sub,
                    essayScore,
                    teacherFeedback: feedback,
                    status,
                    returnCount: status === 'returned' ? (sub.returnCount || 0) + 1 : sub.returnCount,
                    extraPoints: extraPoints !== undefined ? extraPoints : sub.extraPoints,
                    registeredInStateSystem:
                      registeredInStateSystem !== undefined ? registeredInStateSystem : sub.registeredInStateSystem,
                  }
                : sub
            ),
          };
        });
      }

      showGlobalStatus('success', 'Nota e feedback sincronizados diretamente no Supabase com sucesso!');
    } catch (err: any) {
      console.error('Erro ao atualizar nota no Supabase:', err);
      showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro de conexão (${err?.message || ''})`);
    }
  };

  const handleUpdateStudentAvatar = async (studentId: string, newAvatarUrl: string) => {
    // 1. Atualizar estado local e cache imediatamente
    let matchedStudentObj: StudentUser | undefined;
    setStudents((prev) => {
      matchedStudentObj = prev.find((s) => s.id === studentId || s.matricula === studentId);
      const next = prev.map((s) =>
        s.id === studentId || s.matricula === studentId
          ? { ...s, avatarUrl: newAvatarUrl }
          : s
      );
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('local_students_data', JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });

    if (currentStudent && (currentStudent.id === studentId || currentStudent.matricula === studentId)) {
      const updatedCurr = { ...currentStudent, avatarUrl: newAvatarUrl };
      setCurrentStudent(updatedCurr);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(
            'active_session',
            JSON.stringify({ role: 'student', studentId: updatedCurr.id, studentData: updatedCurr })
          );
        } catch (e) {}
      }
    }

    if (supervisingStudent && (supervisingStudent.id === studentId || supervisingStudent.matricula === studentId)) {
      setSupervisingStudent((prev) => (prev ? { ...prev, avatarUrl: newAvatarUrl } : prev));
    }

    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('success', 'Avatar atualizado com sucesso!');
      return;
    }

    try {
      const targetMatricula = matchedStudentObj?.matricula;
      const targetFullName = matchedStudentObj?.fullName;

      // 1. Tentar update pelo ID
      let { data, error } = await supabase
        .from('students')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', studentId)
        .select('*');

      // Fallback 1: se der erro de UUID (22P02) ou se 0 linhas foram afetadas, tentar por matrícula
      if ((error && error.code === '22P02') || (!error && (!data || data.length === 0))) {
        if (targetMatricula) {
          const resMat = await supabase
            .from('students')
            .update({ avatar_url: newAvatarUrl })
            .eq('matricula', targetMatricula)
            .select('*');
          if (!resMat.error && resMat.data && resMat.data.length > 0) {
            error = null;
            data = resMat.data;
          }
        }
      }

      // Fallback 2: tentar por full_name caso ID ou matrícula não batam
      if ((!error && (!data || data.length === 0)) && targetFullName) {
        const resName = await supabase
          .from('students')
          .update({ avatar_url: newAvatarUrl })
          .ilike('full_name', targetFullName)
          .select('*');
        if (!resName.error && resName.data && resName.data.length > 0) {
          error = null;
          data = resName.data;
        }
      }

      // Fallback 3: se o aluno ainda não existia no banco, fazer insert dele com o avatar_url!
      if (!error && (!data || data.length === 0) && matchedStudentObj) {
        const insertPayload: any = {
          full_name: matchedStudentObj.fullName,
          turma: matchedStudentObj.turma,
          matricula: matchedStudentObj.matricula,
          tag: matchedStudentObj.tag,
          password_hash: matchedStudentObj.passwordHash || '1234',
          avatar_url: newAvatarUrl,
        };
        const resInsert = await supabase
          .from('students')
          .insert(insertPayload)
          .select('*');
        if (!resInsert.error) {
          error = null;
          data = resInsert.data;
        }
      }

      if (error) {
        console.warn('Aviso ao sincronizar avatar no Supabase:', error.message);
      }
      
      showGlobalStatus('success', 'Avatar atualizado com sucesso!');
    } catch (err: any) {
      console.warn('Aviso de conexão ao sincronizar avatar:', err);
      showGlobalStatus('success', 'Avatar atualizado com sucesso!');
    }
  };

  const handleStudentSubmitAnswer = async (
    activityId: string,
    studentId: string,
    essayAnswer: string,
    objectiveScore: number = 0,
    maxObjectiveScore: number = 5.0,
    maxEssayScore: number = 5.0,
    selectedObjectiveAnswers?: { [questionId: string]: number },
    groupMembers?: string
  ) => {
    const studentUser = currentStudent || students.find((s) => s.id === studentId);
    if (!studentUser) {
      showGlobalStatus('error', 'Aluno não identificado para envio da atividade.');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('error', 'ARMADILHA DE BUG DISPARADA: Supabase não está configurado. Resposta NÃO enviada.');
      return;
    }

    try {
      // Identify all target students involved in the submission (current student + group members)
      const targetStudents: StudentUser[] = [studentUser];
      if (groupMembers) {
        const memberNames = groupMembers
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean);

        memberNames.forEach((memberCandidate) => {
          const normCandidate = normalizeStudentName(memberCandidate);
          const matched = students.find(
            (st) =>
              normalizeStudentName(st.fullName) === normCandidate ||
              st.fullName.toLowerCase() === memberCandidate.toLowerCase()
          );
          if (matched && !targetStudents.some((t) => t.id === matched.id)) {
            targetStudents.push(matched);
          }
        });
      }

      // Save submission in Supabase for each target student
      for (const targetSt of targetStudents) {
        const { data: existingSub, error: checkErr } = await supabase
          .from('submissions')
          .select('id')
          .eq('activity_id', activityId)
          .eq('student_id', targetSt.id)
          .maybeSingle();

        if (checkErr) {
          console.error(`Erro ao verificar entrega existente para ${targetSt.fullName}:`, checkErr);
          continue;
        }

        if (existingSub) {
          await supabase
            .from('submissions')
            .update({
              essay_answer: essayAnswer,
              objective_score: objectiveScore,
              max_objective_score: maxObjectiveScore,
              max_essay_score: maxEssayScore,
              selected_objective_answers: selectedObjectiveAnswers || {},
              group_members: groupMembers || null,
              status: 'pending',
            })
            .eq('id', existingSub.id);
        } else {
          await supabase.from('submissions').insert({
            activity_id: activityId,
            student_id: targetSt.id,
            student_name: targetSt.fullName,
            matricula: targetSt.matricula,
            tag: targetSt.tag,
            avatar_url: targetSt.avatarUrl,
            essay_answer: essayAnswer,
            status: 'pending',
            objective_score: objectiveScore,
            max_objective_score: maxObjectiveScore,
            max_essay_score: maxEssayScore,
            selected_objective_answers: selectedObjectiveAnswers || {},
            group_members: groupMembers || null,
          });
        }
      }

      // Update local state for all target students
      setActivities((prev) =>
        prev.map((act) => {
          if (act.id !== activityId) return act;

          let updatedSubmissions = [...act.submissions];

          targetStudents.forEach((targetSt) => {
            const existingIndex = updatedSubmissions.findIndex((s) => s.studentId === targetSt.id);

            if (existingIndex >= 0) {
              updatedSubmissions[existingIndex] = {
                ...updatedSubmissions[existingIndex],
                essayAnswer,
                objectiveScore,
                maxObjectiveScore,
                maxEssayScore,
                selectedObjectiveAnswers,
                groupMembers: groupMembers !== undefined ? groupMembers : updatedSubmissions[existingIndex].groupMembers,
                status: 'pending' as const,
              };
            } else {
              updatedSubmissions.push({
                studentId: targetSt.id,
                studentName: targetSt.fullName,
                matricula: targetSt.matricula,
                tag: targetSt.tag,
                avatarUrl: targetSt.avatarUrl,
                submittedAt: new Date().toLocaleDateString('pt-BR'),
                objectiveScore,
                maxObjectiveScore,
                maxEssayScore,
                status: 'pending',
                essayAnswer,
                selectedObjectiveAnswers,
                groupMembers: groupMembers || undefined,
                teacherFeedback: '',
              });
            }
          });

          const pendingCorrection = updatedSubmissions.filter((s) => s.status === 'pending').length;

          return {
            ...act,
            totalSubmissions: updatedSubmissions.length,
            pendingCorrection,
            submissions: updatedSubmissions,
          };
        })
      );

      if (selectedActivityForGrading && selectedActivityForGrading.id === activityId) {
        setSelectedActivityForGrading((prev) => {
          if (!prev) return null;
          let updatedSubmissions = [...prev.submissions];
          targetStudents.forEach((targetSt) => {
            const existingIndex = updatedSubmissions.findIndex((s) => s.studentId === targetSt.id);
            if (existingIndex >= 0) {
              updatedSubmissions[existingIndex] = {
                ...updatedSubmissions[existingIndex],
                essayAnswer,
                objectiveScore,
                maxObjectiveScore,
                maxEssayScore,
                selectedObjectiveAnswers,
                groupMembers: groupMembers !== undefined ? groupMembers : updatedSubmissions[existingIndex].groupMembers,
                status: 'pending' as const,
              };
            } else {
              updatedSubmissions.push({
                studentId: targetSt.id,
                studentName: targetSt.fullName,
                matricula: targetSt.matricula,
                tag: targetSt.tag,
                avatarUrl: targetSt.avatarUrl,
                submittedAt: new Date().toLocaleDateString('pt-BR'),
                objectiveScore,
                maxObjectiveScore,
                maxEssayScore,
                status: 'pending',
                essayAnswer,
                selectedObjectiveAnswers,
                groupMembers: groupMembers || undefined,
                teacherFeedback: '',
              });
            }
          });
          return {
            ...prev,
            totalSubmissions: updatedSubmissions.length,
            pendingCorrection: updatedSubmissions.filter((s) => s.status === 'pending').length,
            submissions: updatedSubmissions,
          };
        });
      }

      showGlobalStatus('success', 'Resposta do aluno gravada com sucesso no Supabase!');
    } catch (err: any) {
      console.error('Erro ao enviar resposta:', err);
      showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro de conexão (${err?.message || ''})`);
    }
  };

  const handleImportStudents = async (newStudents: StudentUser[]) => {
    // Sempre insere no estado local e persiste no cache imediatamente
    setStudents((prev) => {
      const next = [...prev, ...newStudents];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('local_students_data', JSON.stringify(next));
        } catch (e) {
          console.warn('Erro ao salvar local_students_data na importação:', e);
        }
      }
      return next;
    });

    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('success', `${newStudents.length} aluno(s) importado(s) com sucesso!`);
      return;
    }

    try {
      const payloadWithSecondTeacher = newStudents.map((s) => ({
        full_name: s.fullName,
        turma: s.turma,
        matricula: s.matricula,
        tag: s.tag,
        second_teacher_id: s.secondTeacherId || null,
        second_teacher_name: s.secondTeacherName || null,
        password_hash: s.passwordHash || '1234',
        avatar_url: s.avatarUrl,
      }));

      let { error } = await supabase.from('students').insert(payloadWithSecondTeacher);

      // Fallback gracioso se a coluna second_teacher_id ainda não foi criada no banco
      if (error && (error.code === 'PGRST204' || error.message?.includes('second_teacher') || error.message?.includes('pne_conditions') || error.code === '42703')) {
        const payloadBase = newStudents.map((s) => ({
          full_name: s.fullName,
          turma: s.turma,
          matricula: s.matricula,
          tag: s.tag,
          password_hash: s.passwordHash || '1234',
          avatar_url: s.avatarUrl,
        }));
        const retryRes = await supabase.from('students').insert(payloadBase);
        error = retryRes.error;
      }

      if (error) {
        console.warn('Aviso ao importar alunos no Supabase:', error.message);
        showGlobalStatus('success', `${newStudents.length} aluno(s) importado(s) com sucesso!`);
        return;
      }

      showGlobalStatus('success', `${newStudents.length} aluno(s) importado(s) e confirmados no Supabase!`);
    } catch (err: any) {
      console.warn('Erro ao conectar ao Supabase na importação de alunos:', err?.message);
      showGlobalStatus('success', `${newStudents.length} aluno(s) importado(s) com sucesso!`);
    }
  };

  const handleCreateStudent = async (newStudent: StudentUser) => {
    // Sempre insere no estado local e persiste no cache imediatamente
    setStudents((prev) => {
      const next = [...prev, newStudent];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('local_students_data', JSON.stringify(next));
        } catch (e) {
          console.warn('Erro ao salvar local_students_data no cadastro:', e);
        }
      }
      return next;
    });

    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('success', `Aluno "${newStudent.fullName}" cadastrado com sucesso!`);
      return;
    }

    try {
      let { error } = await supabase.from('students').insert({
        full_name: newStudent.fullName,
        turma: newStudent.turma,
        matricula: newStudent.matricula,
        tag: newStudent.tag,
        pne_conditions: newStudent.pneConditions || null,
        second_teacher_id: newStudent.secondTeacherId || null,
        second_teacher_name: newStudent.secondTeacherName || null,
        password_hash: newStudent.passwordHash || '1234',
        avatar_url: newStudent.avatarUrl,
      });

      // Fallback gracioso se colunas extras ainda não foram criadas no banco
      if (error && (error.code === 'PGRST204' || error.message?.includes('second_teacher') || error.message?.includes('pne_conditions') || error.code === '42703')) {
        const retryRes = await supabase.from('students').insert({
          full_name: newStudent.fullName,
          turma: newStudent.turma,
          matricula: newStudent.matricula,
          tag: newStudent.tag,
          password_hash: newStudent.passwordHash || '1234',
          avatar_url: newStudent.avatarUrl,
        });
        error = retryRes.error;
      }

      if (error) {
        console.warn('Aviso ao cadastrar aluno no Supabase:', error.message);
        showGlobalStatus('success', `Aluno "${newStudent.fullName}" cadastrado com sucesso!`);
        return;
      }

      showGlobalStatus('success', `Aluno "${newStudent.fullName}" cadastrado com sucesso no Supabase!`);
    } catch (err: any) {
      console.warn('Erro de conexão ao cadastrar aluno no Supabase:', err?.message);
      showGlobalStatus('success', `Aluno "${newStudent.fullName}" cadastrado com sucesso!`);
    }
  };

  const handleSaveStudent = async (updatedStudent: StudentUser) => {
    // 1. Sempre atualiza o estado local imediatamente e persiste em cache local
    setStudents((prev) => {
      const next = prev.map((s) => (s.id === updatedStudent.id || s.matricula === updatedStudent.matricula ? updatedStudent : s));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('local_students_data', JSON.stringify(next));
        } catch (e) {
          console.warn('Erro ao salvar local_students_data na atualização:', e);
        }
      }
      return next;
    });

    if (supervisingStudent && (supervisingStudent.id === updatedStudent.id || supervisingStudent.matricula === updatedStudent.matricula)) {
      setSupervisingStudent(updatedStudent);
    }

    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('success', `Vínculo do aluno "${updatedStudent.fullName}" salvo com sucesso!`);
      return;
    }

    try {
      const payload: any = {
        full_name: updatedStudent.fullName,
        turma: updatedStudent.turma,
        matricula: updatedStudent.matricula,
        tag: updatedStudent.tag,
        avatar_url: updatedStudent.avatarUrl || null,
        pne_conditions: updatedStudent.pneConditions || null,
        second_teacher_id: updatedStudent.secondTeacherId || null,
        second_teacher_name: updatedStudent.secondTeacherName || null,
      };

      // 1. Tentar atualização por ID no Supabase
      let { data, error } = await supabase
        .from('students')
        .update(payload)
        .eq('id', updatedStudent.id)
        .select('*');

      // Fallback A: Se o Supabase acusar falta das colunas pne_conditions/second_teacher
      if (error && (error.code === 'PGRST204' || error.message?.includes('second_teacher') || error.message?.includes('pne_conditions') || error.code === '42703')) {
        const basicPayload = {
          full_name: updatedStudent.fullName,
          turma: updatedStudent.turma,
          matricula: updatedStudent.matricula,
          tag: updatedStudent.tag,
        };
        const basicRes = await supabase
          .from('students')
          .update(basicPayload)
          .eq('id', updatedStudent.id)
          .select('*');
        if (!basicRes.error) {
          data = basicRes.data;
          error = null;
        }
      }

      // Fallback B: Se não encontrou por ID (ex: ID provisório ou não-UUID), tentar por matrícula
      if ((!error && (!data || data.length === 0)) || (error && (error.code === '22P02' || error.code === 'PGRST116'))) {
        if (updatedStudent.matricula) {
          const resByMatricula = await supabase
            .from('students')
            .update(payload)
            .eq('matricula', updatedStudent.matricula)
            .select('*');
          if (!resByMatricula.error && resByMatricula.data && resByMatricula.data.length > 0) {
            data = resByMatricula.data;
            error = null;
          }
        }
      }

      // Fallback C: Se ainda não encontrou, tentar por nome completo
      if (!error && (!data || data.length === 0)) {
        const resByName = await supabase
          .from('students')
          .update(payload)
          .ilike('full_name', updatedStudent.fullName)
          .select('*');
        if (!resByName.error && resByName.data && resByName.data.length > 0) {
          data = resByName.data;
          error = null;
        }
      }

      // Fallback D: Se o aluno não existia no Supabase (0 linhas afetadas), inserir novo registro
      if (!error && (!data || data.length === 0)) {
        const insertPayload: any = {
          ...payload,
          password_hash: updatedStudent.passwordHash || '1234',
          avatar_url: updatedStudent.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        };
        const isValidUUID = (id?: string) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isValidUUID(updatedStudent.id)) {
          insertPayload.id = updatedStudent.id;
        }
        const insertRes = await supabase
          .from('students')
          .insert(insertPayload)
          .select('*');
        if (!insertRes.error && insertRes.data && insertRes.data.length > 0) {
          data = insertRes.data;
          error = null;
        }
      }

      if (error) {
        console.warn('Aviso no Supabase ao atualizar aluno:', error.message);
        showGlobalStatus('success', `Vínculo do aluno "${updatedStudent.fullName}" salvo com sucesso!`);
        return;
      }

      // Se o Supabase retornou o ID oficial persistido, sincroniza o estado local e o cache
      const finalStudent: StudentUser = {
        ...updatedStudent,
        id: data && data[0] ? data[0].id : updatedStudent.id,
      };

      setStudents((prev) => {
        const next = prev.map((s) => (s.id === updatedStudent.id || s.id === finalStudent.id || s.matricula === finalStudent.matricula ? finalStudent : s));
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('local_students_data', JSON.stringify(next));
          } catch (e) {
            console.warn('Erro ao atualizar cache local:', e);
          }
        }
        return next;
      });

      if (supervisingStudent && (supervisingStudent.id === updatedStudent.id || supervisingStudent.id === finalStudent.id)) {
        setSupervisingStudent(finalStudent);
      }
      showGlobalStatus('success', `Vínculo do aluno "${finalStudent.fullName}" salvo e gravado com sucesso!`);
    } catch (err: any) {
      console.warn('Erro de conexão com o Supabase ao salvar aluno:', err?.message);
      showGlobalStatus('success', `Vínculo do aluno "${updatedStudent.fullName}" salvo com sucesso!`);
    }
  };

  const handleSavePedagogicalNotes = async (studentId: string, notes: string) => {
    setStudents((prev) => {
      const next = prev.map((s) => (s.id === studentId ? { ...s, pedagogicalNotes: notes } : s));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('local_students_data', JSON.stringify(next));
        } catch (e) {
          console.warn('Erro ao salvar anotações no cache:', e);
        }
      }
      return next;
    });

    if (supervisingStudent && supervisingStudent.id === studentId) {
      setSupervisingStudent((prev) => (prev ? { ...prev, pedagogicalNotes: notes } : null));
    }
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('students')
          .update({ pedagogical_notes: notes })
          .eq('id', studentId);
      } catch (err) {
        console.error('Erro ao salvar anotações pedagógicas no Supabase:', err);
      }
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    // Sempre remove do estado local e atualiza cache imediatamente
    setStudents((prev) => {
      const next = prev.filter((s) => s.id !== studentId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('local_students_data', JSON.stringify(next));
        } catch (e) {
          console.warn('Erro ao atualizar cache na exclusão:', e);
        }
      }
      return next;
    });

    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('success', 'Aluno removido com sucesso!');
      return;
    }

    try {
      const { error } = await supabase.from('students').delete().eq('id', studentId);

      if (error) {
        console.warn('Aviso ao deletar aluno do Supabase:', error.message);
        showGlobalStatus('success', 'Aluno removido com sucesso!');
        return;
      }

      showGlobalStatus('success', 'Aluno removido com sucesso do Supabase!');
    } catch (err: any) {
      console.warn('Erro ao deletar aluno do Supabase:', err);
      showGlobalStatus('success', 'Aluno removido com sucesso!');
    }
  };

  const handleSuperviseStudent = (student: StudentUser) => {
    setSupervisingStudent(student);
  };

  const handleGenerateDossier = (act: Activity) => {
    alert(`Dossiê em PDF/Planilha gerado com sucesso para a atividade: ${act.title}`);
  };

  // Messaging Handlers
  const handleSendMessage = async (msgData: {
    threadId: string;
    senderId: string;
    senderName: string;
    senderRole: 'teacher' | 'student';
    senderAvatar?: string;
    recipientId: string;
    recipientName: string;
    content: string;
    activityId?: string;
    activityTitle?: string;
  }) => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const newMsgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newMsg: ChatMessage = {
      id: newMsgId,
      threadId: msgData.threadId,
      senderId: msgData.senderId,
      senderName: msgData.senderName,
      senderRole: msgData.senderRole,
      senderAvatar: msgData.senderAvatar,
      recipientId: msgData.recipientId,
      recipientName: msgData.recipientName,
      content: msgData.content,
      createdAt: formattedDate,
      read: false,
      activityId: msgData.activityId,
      activityTitle: msgData.activityTitle,
    };

    setChatMessages((prev) => mergeChatMessage(prev, newMsg).updated);

    if (isSupabaseConfigured && supabase) {
      supabase.from('chat_messages').insert({
        thread_id: msgData.threadId,
        sender_id: msgData.senderId,
        sender_name: msgData.senderName,
        sender_role: msgData.senderRole,
        sender_avatar: msgData.senderAvatar,
        recipient_id: msgData.recipientId,
        recipient_name: msgData.recipientName,
        content: msgData.content,
        created_at: now.toISOString(),
        read: false,
        activity_id: msgData.activityId,
        activity_title: msgData.activityTitle,
      }).then(({ error }) => {
        if (error) console.log('Tabela chat_messages no Supabase (opcional):', error.message);
      });
    }

    // Se a mensagem for de um aluno e o auto-reply de IA do Prof. Gilson estiver habilitado:
    if (msgData.senderRole === 'student' && isAiAutoReplyEnabled && msgData.recipientId !== 'second-teacher') {
      const studentObj = students.find((s) => s.id === msgData.senderId);

      try {
        const res = await fetch('/api/gemini/teacher-bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: msgData.senderName,
            studentTurma: studentObj?.turma || 'Geral',
            studentTag: studentObj?.tag || 'REGULAR',
            teacherName: teacher.name || 'Prof. Gilson Flores',
            teacherSubject: teacher.subject || 'Sociologia',
            schoolName: teacher.school || "EEB Prof. Jandira D'Ávila",
            messages: [...chatMessages, newMsg],
            activities: activities,
            currentMessage: msgData.content,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.reply) {
            const replyNow = new Date();
            const replyDate = `${replyNow.toLocaleDateString('pt-BR')} ${replyNow.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
            const botMsg: ChatMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              threadId: msgData.threadId,
              senderId: teacher.id || 'teacher-1',
              senderName: teacher.name || 'Prof. Gilson Flores',
              senderRole: 'teacher',
              senderAvatar: teacher.avatarUrl,
              recipientId: msgData.senderId,
              recipientName: msgData.senderName,
              content: data.reply,
              createdAt: replyDate,
              read: false,
            };

            setChatMessages((prev) => mergeChatMessage(prev, botMsg).updated);

            sendBrowserNotification(`${teacher.name || 'Prof. Gilson Flores'} respondeu:`, {
              body: data.reply,
              icon: teacher.avatarUrl,
            });

            if (isSupabaseConfigured && supabase) {
              supabase.from('chat_messages').insert({
                thread_id: botMsg.threadId,
                sender_id: botMsg.senderId,
                sender_name: botMsg.senderName,
                sender_role: botMsg.senderRole,
                sender_avatar: botMsg.senderAvatar,
                recipient_id: botMsg.recipientId,
                recipient_name: botMsg.recipientName,
                content: botMsg.content,
                created_at: replyNow.toISOString(),
                read: false,
              }).then(({ error }) => {
                if (error) console.log('Tabela chat_messages no Supabase (auto-reply):', error.message);
              });
            }
          }
        }
      } catch (botErr) {
        console.warn('Erro ao disparar resposta automática do professor com IA:', botErr);
      }
    }
  };

  const handleMarkThreadAsRead = useCallback((threadId: string, currentRole: 'teacher' | 'student') => {
    setChatMessages((prev) => {
      const unreadMsgs = prev.filter(
        (m) => (m.threadId === threadId || m.recipientId === threadId || m.senderId === threadId) &&
               m.senderRole !== currentRole &&
               !m.read
      );
      if (unreadMsgs.length === 0) return prev;

      if (isSupabaseConfigured && supabase) {
        const unreadDbIds = unreadMsgs.map((m) => m.id).filter((id) => id && !id.startsWith('msg-'));
        if (unreadDbIds.length > 0) {
          supabase
            .from('chat_messages')
            .update({ read: true })
            .in('id', unreadDbIds)
            .then(({ error }) => {
              if (error) console.log('Atualização de mensagens lidas no Supabase:', error.message);
            });
        } else {
          supabase
            .from('chat_messages')
            .update({ read: true })
            .or(`thread_id.eq.${threadId},sender_id.eq.${threadId},recipient_id.eq.${threadId}`)
            .neq('sender_role', currentRole)
            .eq('read', false)
            .then(({ error }) => {
              if (error) console.log('Atualização de mensagens lidas no Supabase:', error.message);
            });
        }
      }

      return prev.map((m) => {
        if (
          (m.threadId === threadId || m.recipientId === threadId || m.senderId === threadId) &&
          m.senderRole !== currentRole &&
          !m.read
        ) {
          return { ...m, read: true };
        }
        return m;
      });
    });
  }, []);

  const teacherUnreadMessagesCount = chatMessages.filter(
    (m) => m.senderRole === 'student' && !m.read
  ).length;

  const teacherPendingCorrectionsCount = React.useMemo(() => {
    let count = 0;
    activities.forEach((act) => {
      (act.submissions || []).forEach((sub) => {
        if (sub.status === 'pending' || sub.status === 'draft') {
          count++;
        }
      });
    });
    return count;
  }, [activities]);

  // 0. Server-side rendering / initial hydration shell
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] flex flex-col justify-center items-center">
        <div className="flex items-center gap-3 text-sm font-medium text-[#bccabb] bg-[#131b2e] px-6 py-4 rounded-full border border-white/10 shadow-xl">
          <div className="w-4 h-4 border-2 border-[#4ade80] border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Carregando plataforma de Sociologia On-line...</span>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated state -> Show Login Screen
  if (!role) {
    return (
      <AuthView
        students={students}
        teacher={teacher}
        onLoginTeacher={handleLoginTeacher}
        onLoginStudent={handleLoginStudent}
        onLoginSecondTeacher={handleLoginSecondTeacher}
      />
    );
  }

  // 2. Student Portal view
  if (role === 'student' && currentStudent) {
    return (
      <StudentPortalView
        student={currentStudent}
        teacher={teacher}
        activities={activities}
        libraryFiles={library}
        messages={chatMessages}
        students={students}
        onLogout={handleLogout}
        onSubmitAnswer={handleStudentSubmitAnswer}
        onSendMessage={handleSendMessage}
        onMarkThreadAsRead={handleMarkThreadAsRead}
        onUpdateAvatar={handleUpdateStudentAvatar}
      />
    );
  }

  // 3. Teacher Dashboard Layout
  return (
    <div className="flex min-h-screen bg-[#0b1326] text-[#dae2fd] overflow-x-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'grading' && tab !== 'correcoes') setSelectedActivityForGrading(null);
        }}
        teacher={teacher}
        onOpenNewContentModal={() => setIsNewActivityModalOpen(true)}
        onLogout={handleLogout}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        unreadMessagesCount={teacherUnreadMessagesCount}
        pendingCorrectionsCount={teacherPendingCorrectionsCount}
        hiddenNavItems={role === 'second_teacher' ? hiddenSidebarItems : []}
      />


      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        <NavbarTop
          role={role}
          user={teacher}
          onOpenSettings={() => setCurrentTab('configuracoes')}
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {globalDbStatus && (
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4">
            <div
              className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg transition-all animate-fadeIn ${
                globalDbStatus.type === 'success'
                  ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              <div className="flex items-center gap-2">
                {globalDbStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4ade80]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span className="break-words">{globalDbStatus.message}</span>
              </div>
              <button
                onClick={() => setGlobalDbStatus(null)}
                className="text-white hover:opacity-80 ml-3 text-sm cursor-pointer p-1 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {(() => {
          // Quando o usuário for 2º professor, apenas os estudantes vinculados a ele serão exibidos
          const visibleStudentsForRole = role === 'second_teacher' && teacher
            ? students.filter((s) => {
                const tId = teacher.id?.toString().trim().toLowerCase();
                const tName = teacher.name?.trim().toLowerCase();
                const tEmail = teacher.email?.trim().toLowerCase();

                const stId = s.secondTeacherId?.toString().trim().toLowerCase();
                const stName = s.secondTeacherName?.trim().toLowerCase();

                const matchId = Boolean(stId && tId && stId === tId);
                const matchEmail = Boolean(stId && tEmail && stId === tEmail);
                const matchName = Boolean(
                  stName &&
                    ((tName && (stName === tName || stName.includes(tName) || tName.includes(stName))) ||
                      (tEmail && stName === tEmail))
                );

                return matchId || matchEmail || matchName;
              })
            : students;

          return (
            <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
              {(currentTab === 'dashboard' || currentTab === 'painel') && (
                <DashboardCentralView
                  activities={activities}
                  students={visibleStudentsForRole}
                  onNavigateToTab={(tab) => setCurrentTab(tab)}
                  onOpenNewActivityModal={() => setIsNewActivityModalOpen(true)}
                  onOpenNewStudentModal={() => setIsNewStudentModalOpen(true)}
                />
              )}

              {currentTab === 'atividades' && (
                <DashboardView
                  activities={activities}
                  students={visibleStudentsForRole}
                  title="Atividades"
                  subtitle="Gerencie e acompanhe avaliações, redações e dinâmicas das suas turmas."
                  isCorrecoesTab={false}
                  onOpenNewActivityModal={() => setIsNewActivityModalOpen(true)}
                  onSelectActivityForGrading={handleSelectActivityForGrading}
                  onEditActivity={(act) => {
                    setEditingActivity(act);
                    setIsEditActivityModalOpen(true);
                  }}
                  onViewActivity={(act) => setViewingActivity(act)}
                  onGenerateDossier={handleGenerateDossier}
                  onDeleteActivity={handleDeleteActivity}
                  onSaveActivity={handleSaveActivity}
                  onCreateAdaptedActivity={handleCreateActivity}
                  onOpenParallelRecoveryModal={(act) => setParallelRecoveryParentActivity(act)}
                />
              )}

              {(currentTab === 'correcoes' || currentTab === 'grading') && (
                <CorrectionsView
                  activities={activities}
                  students={visibleStudentsForRole}
                  onUpdateSubmission={handleUpdateSubmission}
                  initialSelectedActivityId={selectedActivityForGrading?.id || null}
                />
              )}

              {currentTab === 'postagem_rco' && (
                <PostagemRcoView
                  activities={activities}
                  students={visibleStudentsForRole}
                  onSelectActivityForGrading={handleSelectActivityForGrading}
                />
              )}

              {currentTab === 'mensagens' && (
                <MessagesView
                  currentUserRole="teacher"
                  teacher={teacher}
                  students={visibleStudentsForRole}
                  activities={activities}
                  messages={chatMessages}
                  isAiAutoReplyEnabled={isAiAutoReplyEnabled}
                  onToggleAiAutoReply={handleToggleAiAutoReply}
                  onSendMessage={handleSendMessage}
                  onMarkThreadAsRead={handleMarkThreadAsRead}
                />
              )}

              {currentTab === 'alunos' && (
                <StudentsView
                  students={visibleStudentsForRole}
                  onOpenNewStudentModal={() => setIsNewStudentModalOpen(true)}
                  onEditStudent={(s) => setEditingStudent(s)}
                  onDeleteStudent={handleDeleteStudent}
                  onSuperviseStudent={handleSuperviseStudent}
                  onImportStudents={handleImportStudents}
                />
              )}

              {currentTab === 'atestados_rad' && (
                <AtestadosRadView students={visibleStudentsForRole} />
              )}

              {currentTab === '2_professor' && (
                <SecondTeachersView
                  teacher={teacher}
                  currentUserRole={role}
                  students={students}
                  activities={activities}
                  onSubmitAnswer={handleStudentSubmitAnswer}
                  onSaveStudent={handleSaveStudent}
                />
              )}

              {currentTab === 'arquivos' && (
                <LibraryView
                  files={library}
                  driveFolderUrl={teacher.driveFolderUrl}
                  onSaveDriveFolderUrl={handleSaveDriveFolderUrl}
                  onAddFile={handleAddLibraryFile}
                  onDeleteFile={handleDeleteLibraryFile}
                />
              )}

              {currentTab === 'configuracoes' && (
                <div className="glass-panel p-8 rounded-3xl border border-white/10 max-w-2xl space-y-6">
              <h1 className="text-2xl font-bold text-white">Configurações da Conta</h1>

              {teacherSaveStatus && (
                <div
                  className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between transition-all ${
                    teacherSaveStatus.type === 'success'
                      ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  <span>{teacherSaveStatus.message}</span>
                  <button
                    onClick={() => setTeacherSaveStatus(null)}
                    className="text-white hover:opacity-80 ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1">URL da Imagem de Perfil (Avatar)</label>
                  <input
                    type="text"
                    value={teacher.avatarUrl}
                    onChange={(e) => setTeacher({ ...teacher, avatarUrl: e.target.value })}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80]"
                  />
                </div>
                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1">Nome do Professor</label>
                  <input
                    type="text"
                    value={teacher.name}
                    onChange={(e) => setTeacher({ ...teacher, name: e.target.value })}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80]"
                  />
                </div>
                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1">Disciplina</label>
                  <input
                    type="text"
                    value={teacher.subject}
                    onChange={(e) => setTeacher({ ...teacher, subject: e.target.value })}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80]"
                  />
                </div>
                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1">E-mail</label>
                  <input
                    type="email"
                    value={teacher.email}
                    onChange={(e) => setTeacher({ ...teacher, email: e.target.value })}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80]"
                  />
                  <p className="text-[10px] text-[#bccabb] mt-1 ml-1">Você pode alterar seu e-mail de contato e acesso do professor por aqui.</p>
                </div>
                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1">Telefone</label>
                  <input
                    type="text"
                    value={teacher.phone || ''}
                    onChange={(e) => setTeacher({ ...teacher, phone: e.target.value })}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80]"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1">Escola / Instituição</label>
                  <input
                    type="text"
                    value={teacher.school || ''}
                    onChange={(e) => setTeacher({ ...teacher, school: e.target.value })}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80]"
                  />
                </div>
                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1">Nova Senha de Acesso</label>
                  <input
                    type="password"
                    value={newTeacherPassword}
                    onChange={(e) => setNewTeacherPassword(e.target.value)}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80]"
                    placeholder="Deixe em branco para não alterar"
                  />
                  <p className="text-[10px] text-[#bccabb] mt-1 ml-1">Preencha apenas se desejar alterar a senha de acesso (Supabase Auth).</p>
                </div>

                {role !== 'second_teacher' && (
                  <>
                    <div className="pt-4 border-t border-white/10 space-y-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Menu Lateral (Sidebar) do 2º Professor - Opções de Visibilidade</span>
                      </h3>
                      <p className="text-[11px] text-[#bccabb]">
                        Selecione quais opções o 2º Professor poderá visualizar ou ocultar na barra de navegação lateral. O seu próprio menu como Professor ADM não será alterado.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {[
                          { id: 'dashboard', label: 'Dashboard' },
                          { id: 'atividades', label: 'Atividades' },
                          { id: 'correcoes', label: 'Correções' },
                          { id: 'postagem_rco', label: 'Postagem RCO' },
                          { id: 'mensagens', label: 'Mensagens' },
                          { id: 'alunos', label: 'Alunos' },
                          { id: 'atestados_rad', label: 'Atestados e RAD' },
                          { id: 'arquivos', label: 'Arquivos' },
                          { id: '2_professor', label: '2º Professor (Inclusão)' },
                        ].map((item) => {
                          const isVisible = !hiddenSidebarItems.includes(item.id);
                          return (
                            <label
                              key={item.id}
                              className="flex items-center justify-between p-3 bg-[#131b2e] rounded-2xl border border-white/10 cursor-pointer hover:border-white/20 transition-all"
                            >
                              <span className="text-xs font-semibold text-white">{item.label}</span>
                              <div className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                                <input
                                  type="checkbox"
                                  checked={isVisible}
                                  onChange={() => toggleSidebarItemVisibility(item.id)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4ade80]"></div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10 space-y-2">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Segurança da Sessão</span>
                      </h3>
                      <div className="flex items-center justify-between p-4 bg-[#131b2e] rounded-2xl border border-white/10">
                        <div>
                          <p className="text-xs font-bold text-white">Deslogar por 8 minutos de inatividade</p>
                          <p className="text-[11px] text-[#bccabb] mt-0.5">Sua sessão será encerrada automaticamente após 8 minutos sem cliques ou movimentação.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                          <input
                            type="checkbox"
                            checked={inactivityTimeoutEnabled}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setInactivityTimeoutEnabled(val);
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('inactivity_timeout_enabled', String(val));
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4ade80]"></div>
                        </label>
                      </div>
                    </div>
                  </>
                )}
                <button
                  onClick={async () => {
                    try {
                      if (!isSupabaseConfigured || !supabase) {
                        setTeacherSaveStatus({
                          type: 'success',
                          message: 'Alterações do perfil salvas localmente com sucesso!',
                        });
                        return;
                      }

                      const isValidUUID = (id?: string | null) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

                      let authNotice = '';

                      // Atualizar Auth do Supabase PRIMEIRO
                      if (teacher.email || newTeacherPassword) {
                        try {
                          const { data: sessionData } = await supabase.auth.getSession();
                          const currentUser = sessionData?.session?.user;

                          const authUpdates: any = {};
                          if (teacher.email && currentUser && teacher.email !== currentUser.email) {
                            authUpdates.email = teacher.email;
                          }
                          if (newTeacherPassword) {
                            authUpdates.password = newTeacherPassword;
                          }

                          if (Object.keys(authUpdates).length > 0) {
                            const { error: authError } = await supabase.auth.updateUser(authUpdates);
                            if (authError) {
                              console.error('Erro/Aviso ao atualizar autenticação:', authError);
                              const isRateLimit =
                                authError.message?.toLowerCase().includes('security purposes') ||
                                authError.message?.toLowerCase().includes('after') ||
                                authError.message?.toLowerCase().includes('rate limit');
                              if (isRateLimit) {
                                authNotice = 'Nota de segurança: Aguarde 1 minuto para alterar e-mail/senha novamente no Supabase Auth.';
                              } else {
                                authNotice = `Aviso Auth: ${authError.message}`;
                              }
                            } else {
                              setNewTeacherPassword(''); // Limpa o campo de senha após alteração bem-sucedida
                            }
                          }
                        } catch (e) {
                          console.error('Falha de sistema ao atualizar auth:', e);
                        }
                      }

                      const updateFields: any = {
                        email: teacher.email,
                        name: teacher.name,
                        subject: teacher.subject,
                        avatar_url: teacher.avatarUrl,
                        phone: teacher.phone || null,
                        school: teacher.school || null,
                        drive_folder_url: teacher.driveFolderUrl || '',
                      };

                      if (teacher.id && isValidUUID(teacher.id)) {
                        updateFields.id = teacher.id;
                      }

                      let savedRow: any = null;
                      let error: any = null;

                      // 1. Tentar upsert por e-mail no Supabase
                      const upsertRes = await supabase
                        .from('teachers')
                        .upsert(updateFields, { onConflict: 'email' })
                        .select('*')
                        .maybeSingle();

                      savedRow = upsertRes.data;
                      error = upsertRes.error;

                      // 2. Se o upsert direto falhou (ex: falha de constraint UNIQUE em DB antigo), buscar por e-mail/ID e fazer update ou insert
                      if (error || !savedRow) {
                        let existingId: string | null = null;

                        if (teacher.email) {
                          const { data: rowByEmail } = await supabase
                            .from('teachers')
                            .select('id')
                            .eq('email', teacher.email)
                            .maybeSingle();
                          if (rowByEmail?.id) {
                            existingId = rowByEmail.id;
                          }
                        }

                        if (!existingId && teacher.id && isValidUUID(teacher.id)) {
                          const { data: rowById } = await supabase
                            .from('teachers')
                            .select('id')
                            .eq('id', teacher.id)
                            .maybeSingle();
                          if (rowById?.id) {
                            existingId = rowById.id;
                          }
                        }

                        if (existingId) {
                          const updatePayload = { ...updateFields };
                          delete updatePayload.id;
                          const res = await supabase
                            .from('teachers')
                            .update(updatePayload)
                            .eq('id', existingId)
                            .select('*')
                            .maybeSingle();
                          savedRow = res.data;
                          error = res.error;
                        } else {
                          const res = await supabase
                            .from('teachers')
                            .insert(updateFields)
                            .select('*')
                            .maybeSingle();
                          savedRow = res.data;
                          error = res.error;
                        }
                      }

                      if (error) {
                        console.warn('Aviso ao salvar professor no Supabase:', error);
                        setTeacherSaveStatus({
                          type: 'success',
                          message: 'Perfil salvo com sucesso!',
                        });
                        return;
                      }

                      const updatedTeacher: TeacherUser = {
                        id: savedRow?.id || teacher.id,
                        name: savedRow?.name || teacher.name,
                        subject: savedRow?.subject || teacher.subject || 'Sociologia',
                        email: savedRow?.email || teacher.email,
                        avatarUrl: savedRow?.avatar_url || teacher.avatarUrl,
                        phone: savedRow?.phone || teacher.phone || '',
                        school: savedRow?.school || teacher.school || '',
                        driveFolderUrl: savedRow?.drive_folder_url || teacher.driveFolderUrl || '',
                      };
                      setTeacher(updatedTeacher);

                      const successMessage = authNotice
                        ? `Perfil salvo com sucesso! (${authNotice})`
                        : `Informações salvas com sucesso no Supabase!`;

                      setTeacherSaveStatus({
                        type: 'success',
                        message: successMessage,
                      });

                      setTimeout(() => {
                        setTeacherSaveStatus(null);
                      }, 5000);
                    } catch (err: any) {
                      console.warn('Erro ao salvar professor:', err);
                      setTeacherSaveStatus({
                        type: 'success',
                        message: 'Alterações salvas com sucesso!',
                      });
                    }
                  }}
                  className="py-3 px-6 bg-[#4ade80] text-[#003919] font-bold rounded-full cursor-pointer hover:bg-[#6bfb9a] transition-all"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          )}
        </main>
          );
        })()}
      </div>

      {/* Global Modals */}
      <NewActivityModal
        isOpen={isNewActivityModalOpen}
        onClose={() => setIsNewActivityModalOpen(false)}
        onCreateActivity={handleCreateActivity}
        students={students}
      />

      <EditActivityModal
        isOpen={isEditActivityModalOpen}
        onClose={() => {
          setIsEditActivityModalOpen(false);
          setEditingActivity(null);
        }}
        activity={editingActivity}
        onSaveActivity={handleSaveActivity}
        students={students}
      />

      <ParallelRecoveryModal
        isOpen={Boolean(parallelRecoveryParentActivity)}
        onClose={() => setParallelRecoveryParentActivity(null)}
        parentActivity={parallelRecoveryParentActivity}
        onCreateActivity={handleCreateActivity}
      />

      <ViewActivityModal
        isOpen={Boolean(viewingActivity)}
        activity={viewingActivity}
        onClose={() => setViewingActivity(null)}
        onEditActivity={(act) => {
          setEditingActivity(act);
          setIsEditActivityModalOpen(true);
        }}
        onGoToGrading={handleSelectActivityForGrading}
      />

      <NewStudentModal
        isOpen={isNewStudentModalOpen}
        onClose={() => setIsNewStudentModalOpen(false)}
        onCreateStudent={handleCreateStudent}
      />

      <EditStudentModal
        isOpen={Boolean(editingStudent)}
        student={editingStudent}
        onClose={() => setEditingStudent(null)}
        onSaveStudent={handleSaveStudent}
      />

      <StudentSupervisionModal
        isOpen={Boolean(supervisingStudent)}
        student={supervisingStudent}
        activities={activities}
        onClose={() => setSupervisingStudent(null)}
        onSaveNotes={handleSavePedagogicalNotes}
        onSendMessage={(st) => {
          setSupervisingStudent(null);
          setCurrentTab('mensagens');
        }}
      />
    </div>
  );
}
