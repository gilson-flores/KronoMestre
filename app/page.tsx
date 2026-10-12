'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { SecondTeacherDashboardView } from '@/components/views/SecondTeacherDashboardView';
import { SecondTeacherPortalView } from '@/components/views/SecondTeacherPortalView';
import { AtestadosRadView } from '@/components/views/AtestadosRadView';
import { BackupView } from '@/components/views/BackupView';
import { AdaptedActivitiesView } from '@/components/views/AdaptedActivitiesView';
import { InteractiveActivitiesView } from '@/components/views/InteractiveActivitiesView';

import { normalizeStudentName } from '@/lib/studentUtils';
import { NewActivityModal } from '@/components/modals/NewActivityModal';
import { EditActivityModal } from '@/components/modals/EditActivityModal';
import { ViewActivityModal } from '@/components/modals/ViewActivityModal';
import { NewStudentModal } from '@/components/modals/NewStudentModal';
import { EditStudentModal } from '@/components/modals/EditStudentModal';
import { StudentSupervisionModal } from '@/components/modals/StudentSupervisionModal';
import { ParallelRecoveryModal } from '@/components/modals/ParallelRecoveryModal';
import { ForceChangePasswordModal } from '@/components/modals/ForceChangePasswordModal';
import { hashPasswordBcrypt } from '@/lib/crypto';
import { scrollToTop } from '@/lib/utils';
import {
  getScopedLocalStorageItem,
  setScopedLocalStorageItem,
  cleanLegacyCacheKeys,
  getTenantSessionItem,
  setTenantSessionItem,
  removeTenantSessionItem,
  purgeAllAuthAndTenantCaches,
} from '@/lib/cacheUtils';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

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

  // 2. Verificação de mensagem otimista local vs banco
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

  // Auth state (substitui 'Carregando...' por 'Prof. Gilson Flores')
  const [role, setRole] = useState<UserRole>(null);
  const [teacher, setTeacher] = useState<TeacherUser>(() => ({
    ...initialTeacher,
    name:
      initialTeacher.name && !initialTeacher.name.toLowerCase().includes('carregando')
        ? initialTeacher.name
        : 'Prof. Gilson Flores',
  }));
  const [currentStudent, setCurrentStudent] = useState<StudentUser | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [inactivityTimeoutEnabled, setInactivityTimeoutEnabled] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isDataLoading, setIsDataLoading] = useState<boolean>(() => Boolean(isSupabaseConfigured && supabase));
  const [dataLoadError, setDataLoadError] = useState<boolean>(false);
  const [loadDataTrigger, setLoadDataTrigger] = useState<number>(0);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const lastLoadTimestampRef = useRef<number>(0);

  // App datasets
  const [students, setStudents] = useState<StudentUser[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = getScopedLocalStorageItem('local_students_data');
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
        const saved = getScopedLocalStorageItem('local_activities_data');
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

  const [library, setLibrary] = useState<LibraryFile[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = getScopedLocalStorageItem('library_files_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Erro ao restaurar biblioteca local na inicialização:', e);
      }
    }
    return initialLibrary;
  });

  // Restaurar sessão via API do Firebase (Tenant Architecture)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 0);

    const checkSession = async () => {
      if (typeof window === 'undefined') return;
      cleanLegacyCacheKeys();

      const isExplicitLogout = sessionStorage.getItem('explicit_logout') === 'true';
      if (isExplicitLogout) {
        setIsAuthChecking(false);
        return;
      }

      // ISOLAMENTO DE TENANT: Busca a sessão associada ao usuário ativo no sessionStorage
      const currentActiveUid = sessionStorage.getItem('current_active_user_id') || '';
      const activeSession =
        (currentActiveUid ? getTenantSessionItem('active_session', currentActiveUid) : null) ||
        sessionStorage.getItem('active_session');
      let parsedLocalSession: any = null;
      if (activeSession) {
        try {
          parsedLocalSession = JSON.parse(activeSession);
        } catch (e) {}
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        let res: Response | null = null;
        try {
          res = await fetch('/api/auth/session', {
            signal: controller.signal,
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store',
              'Pragma': 'no-cache',
            },
          });
        } finally {
          clearTimeout(timeoutId);
        }
        if (res && res.ok) {
          const data = await res.json();
          if (data.user && data.user.role === 'teacher') {
            const tenant = data.user.tenant || {};
            setRole('teacher');
            setTeacher((prev) => ({
              ...prev,
              id: data.user.id,
              email: data.user.email,
              name: tenant.name || tenant.nome || data.user.name || 'Prof. Gilson Flores',
              subject: tenant.subject || prev.subject,
              school: tenant.school !== undefined ? tenant.school : prev.school,
              phone: tenant.phone !== undefined ? tenant.phone : prev.phone,
              avatarUrl: tenant.avatarUrl || prev.avatarUrl,
              matriculaFuncional:
                tenant.matriculaFuncional !== undefined
                  ? tenant.matriculaFuncional
                  : prev.matriculaFuncional,
              tenantCode:
                tenant.tenantCode ||
                prev.tenantCode ||
                parsedLocalSession?.teacherData?.tenantCode ||
                parsedLocalSession?.tenantCode ||
                'G2U9',
              contractStartDate: tenant.contractStartDate || prev.contractStartDate,
              contractEndDate: tenant.contractEndDate || prev.contractEndDate,
              contractType: tenant.contractType || prev.contractType,
              contractStatus: tenant.contractStatus || prev.contractStatus,
              driveFolderUrl: tenant.driveFolderUrl || prev.driveFolderUrl,
              is_admin:
                tenant.is_admin ??
                (data.user.email === '755840@profe.sed.sc.gov.br' ||
                  data.user.email === 'gilsonjuniores@gmail.com'),
              isAdmin:
                tenant.is_admin ??
                (data.user.email === '755840@profe.sed.sc.gov.br' ||
                  data.user.email === 'gilsonjuniores@gmail.com'),
              plan_type: tenant.plan_type || 'unlimited',
              escolas_vinculadas: tenant.escolas_vinculadas || prev.escolas_vinculadas || [],
              disciplinas: tenant.disciplinas || prev.disciplinas || [],
              ownerTeacherId: data.user.id,
            }));

            if (typeof window !== 'undefined') {
              const sessionPayload = {
                role: 'teacher',
                ownerTeacherId: data.user.id,
                teacherData: data.user,
              };
              setTenantSessionItem('active_session', JSON.stringify(sessionPayload), data.user.id);
            }

            // Hidratação imediata do cache local para resiliência instantânea
            if (typeof window !== 'undefined') {
              try {
                const cachedStudents = getScopedLocalStorageItem('local_students_data', data.user.id);
                if (cachedStudents) {
                  const parsed = JSON.parse(cachedStudents);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    setStudents(parsed);
                  }
                }
                const cachedActs = getScopedLocalStorageItem('local_activities_data', data.user.id);
                if (cachedActs) {
                  const parsed = JSON.parse(cachedActs);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    setActivities(parsed);
                  }
                }
                const cachedMsgs = getScopedLocalStorageItem('local_messages_data', data.user.id);
                if (cachedMsgs) {
                  const parsed = JSON.parse(cachedMsgs);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    setChatMessages(parsed);
                  }
                }
              } catch (e) {}
            }
          } else if (data.user && data.user.role === 'second_teacher') {
            const updatedTeacher = {
              ...(parsedLocalSession?.teacherData || {}),
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              ownerTeacherId: data.user.ownerTeacherId,
              mustChangePassword: Boolean(data.user.mustChangePassword),
              driveFolderUrl: data.user.driveFolderUrl || parsedLocalSession?.teacherData?.driveFolderUrl || '',
            };
            setTeacher(updatedTeacher);
            setRole('second_teacher');
            setMustChangePassword(Boolean(data.user.mustChangePassword));

            if (typeof window !== 'undefined') {
              const sessionPayload = {
                role: 'second_teacher',
                ownerTeacherId: data.user.ownerTeacherId,
                teacherData: updatedTeacher,
                mustChangePassword: Boolean(data.user.mustChangePassword),
              };
              setTenantSessionItem('active_session', JSON.stringify(sessionPayload), data.user.id);
            }
          } else if (data.user && data.user.role === 'student') {
            if (data.user?.tenant) {
              const t = data.user.tenant;
              setTeacher((prev) => ({
                ...prev,
                id: data.user.ownerTeacherId || prev.id,
                name: t.name || 'Prof. Gilson Flores',
                subject: t.subject || prev.subject,
                school: t.school || prev.school,
                avatarUrl: t.avatarUrl || prev.avatarUrl,
                driveFolderUrl: t.driveFolderUrl || prev.driveFolderUrl,
              }));
            }
            const studentPayload = {
              ...(parsedLocalSession?.studentData || {}),
              ...data.user,
            };
            setCurrentStudent(studentPayload);
            setRole('student');
            setMustChangePassword(Boolean(data.user.mustChangePassword));

            if (typeof window !== 'undefined') {
              const sessionPayload = {
                role: 'student',
                studentId: data.user.id,
                studentData: studentPayload,
                ownerTeacherId: data.user.ownerTeacherId || '',
                mustChangePassword: Boolean(data.user.mustChangePassword),
              };
              setTenantSessionItem('active_session', JSON.stringify(sessionPayload), data.user.id);
            }
          } else {
            // O servidor respondeu com sucesso que NÃO HÁ USUÁRIO AUTENTICADO (user: null)
            // Purga caches residuais para impedir herança acidental de sessão
            purgeAllAuthAndTenantCaches();
            setRole(null);
            setCurrentStudent(null);
          }
        } else {
          // Em caso de falha de conexão com o servidor, só restaura se houver sessão legítima de aluno/2º professor
          if (parsedLocalSession?.role === 'second_teacher' && parsedLocalSession?.teacherData) {
            setTeacher(parsedLocalSession.teacherData);
            setRole('second_teacher');
            setMustChangePassword(Boolean(parsedLocalSession.mustChangePassword));
          } else if (parsedLocalSession?.role === 'student' && parsedLocalSession?.studentData) {
            setCurrentStudent(parsedLocalSession.studentData);
            setRole('student');
            setMustChangePassword(Boolean(parsedLocalSession.mustChangePassword));
          } else {
            setRole(null);
          }
        }

        const savedDriveUrl = localStorage.getItem('teacher_drive_folder_url');
        if (savedDriveUrl) setTeacher((prev) => ({ ...prev, driveFolderUrl: savedDriveUrl }));

        const savedTimeout = localStorage.getItem('inactivity_timeout_enabled');
        if (savedTimeout !== null) setInactivityTimeoutEnabled(savedTimeout === 'true');
      } catch (e) {
        console.warn('Erro ao restaurar sessão do Firebase:', e);
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkSession();
    return () => clearTimeout(timer);
  }, []);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);

  // Active datasets
  const activeStudents = useMemo(() => students.filter((s) => !s.isArchived), [students]);
  const activeActivities = useMemo(() => activities.filter((a) => !a.isArchived), [activities]);

  // Extração estável dos identificadores do professor para evitar recálculo desnecessário de visibleStudentsForRole
  const teacherId = teacher?.id?.toString().trim().toLowerCase() || '';
  const teacherName = teacher?.name?.trim().toLowerCase() || '';
  const teacherEmail = teacher?.email?.trim().toLowerCase() || '';

  const visibleStudentsForRole = useMemo(() => {
    if (role === 'second_teacher' && (teacherId || teacherName || teacherEmail)) {
      return activeStudents.filter((s) => {
        const stId = s.secondTeacherId?.toString().trim().toLowerCase();
        const stName = s.secondTeacherName?.trim().toLowerCase();

        const matchId = Boolean(stId && teacherId && stId === teacherId);
        const matchEmail = Boolean(stId && teacherEmail && stId === teacherEmail);
        const matchName = Boolean(
          stName &&
            ((teacherName && (stName === teacherName || stName.includes(teacherName) || teacherName.includes(stName))) ||
              (teacherEmail && stName === teacherEmail))
        );

        return matchId || matchEmail || matchName;
      });
    }
    return activeStudents;
  }, [role, teacherId, teacherName, teacherEmail, activeStudents]);

  // Estrutura memoizada de agrupamento por turma: O(1) de acesso para filtros de turmas
  const studentsByTurma = useMemo(() => {
    const map = new Map<string, StudentUser[]>();
    for (const student of visibleStudentsForRole) {
      const turma = student.turma || 'Sem Turma';
      const list = map.get(turma);
      if (list) {
        list.push(student);
      } else {
        map.set(turma, [student]);
      }
    }
    return map;
  }, [visibleStudentsForRole]);

  // Lista ordenada única de turmas ativas memoizada
  const availableTurmas = useMemo(() => {
    return Array.from(studentsByTurma.keys()).sort((a, b) => a.localeCompare(b));
  }, [studentsByTurma]);

  const [selectedActivityForGrading, setSelectedActivityForGrading] = useState<Activity | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals state
  const [isNewActivityModalOpen, setIsNewActivityModalOpen] = useState(false);
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentUser | null>(null);
  const [supervisingStudent, setSupervisingStudent] = useState<StudentUser | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isEditActivityModalOpen, setIsEditActivityModalOpen] = useState(false);
  const [parallelRecoveryParentActivity, setParallelRecoveryParentActivity] = useState<Activity | null>(null);
  const [viewingActivity, setViewingActivity] = useState<Activity | null>(null);
  const [teacherSaveStatus, setTeacherSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [globalDbStatus, setGlobalDbStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [newTeacherPassword, setNewTeacherPassword] = useState('');

  // Theme preference state
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_theme_mode');
      if (saved === 'light') return 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (themeMode === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      }
      localStorage.setItem('app_theme_mode', themeMode);
    }
  }, [themeMode]);

  // AI Auto-Reply State for Teacher (Boby Sociólogo / Prof. Gilson)
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

  const showGlobalStatus = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    if (type === 'success') {
      scrollToTop();
    }
    setGlobalDbStatus({ type: type === 'info' ? 'success' : type, message });
    setTimeout(() => {
      setGlobalDbStatus((current) => (current?.message === message ? null : current));
    }, 6000);
  }, []);

  const handleSaveDriveFolderUrl = async (url: string) => {
    const cleanUrl = url.trim();
    setTeacher((prev) => ({ ...prev, driveFolderUrl: cleanUrl }));

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('teacher_drive_folder_url', cleanUrl);
        const currentActiveUid = sessionStorage.getItem('current_active_user_id') || teacher.id || '';
        const sessionStr =
          (currentActiveUid ? getTenantSessionItem('active_session', currentActiveUid) : null) ||
          sessionStorage.getItem('active_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          if (session.teacherData) {
            session.teacherData.driveFolderUrl = cleanUrl;
            setTenantSessionItem('active_session', JSON.stringify(session), currentActiveUid);
          }
        }
      } catch (e) {
        console.warn('Erro ao atualizar armazenamento local da sessão:', e);
      }
    }

    try {
      await fetch('/api/teacher/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            driveFolderUrl: cleanUrl,
          },
        }),
      });
    } catch (err) {
      console.warn('Aviso ao sincronizar link do Drive no Firestore:', err);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const cleanEmail = (teacher.email || '').trim().toLowerCase();
        const payload: any = {
          email: cleanEmail,
          name: teacher.name,
          subject: teacher.subject,
          avatar_url: teacher.avatarUrl,
          phone: teacher.phone || null,
          school: teacher.school || null,
          drive_folder_url: cleanUrl,
        };

        await supabase.from('teachers').upsert(payload, { onConflict: 'email' });
      } catch (err) {
        console.warn('Aviso secundário no Supabase:', err);
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
        setScopedLocalStorageItem('library_files_data', JSON.stringify(updated), teacher.id);
      } catch (err) {
        console.warn('Não foi possível salvar os arquivos no localStorage (cota excedida):', err);
      }
    }

    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFile),
      });
      if (!res.ok) throw new Error('Falha ao salvar no Firestore.');
      showGlobalStatus('success', 'Arquivo cadastrado com sucesso no Firestore!');
    } catch (err) {
      console.warn('Erro ao salvar arquivo na nuvem:', err);
      showGlobalStatus('error', 'Arquivo exibido na tela, mas falhou ao salvar na nuvem.');
    }
  };

  const handleDeleteLibraryFile = async (fileId: string) => {
    setLibrary((prev) => prev.filter((f) => f.id !== fileId));
    if (typeof window !== 'undefined') {
      try {
        const updated = sanitizeLibraryForStorage(library.filter((f) => f.id !== fileId));
        setScopedLocalStorageItem('library_files_data', JSON.stringify(updated), teacher.id);
      } catch (err) {
        console.warn('Erro ao atualizar localStorage após deleção:', err);
      }
    }

    try {
      const res = await fetch(`/api/library?id=${fileId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir na nuvem.');
      showGlobalStatus('success', 'Arquivo removido da biblioteca.');
    } catch (err) {
      console.warn('Erro ao deletar arquivo na nuvem:', err);
      showGlobalStatus('error', 'Arquivo removido da tela, mas exclusão na nuvem falhou.');
    }
  };

  // Carregar dados iniciais do Firestore (Arquitetura Multi-Tenant)
  useEffect(() => {
    const loadData = async () => {
      const now = Date.now();
      if (now - lastLoadTimestampRef.current < 4000) {
        return;
      }
      lastLoadTimestampRef.current = now;

      setIsDataLoading(true);
      setDataLoadError(false);
      try {
        // 1. Carregar Alunos do Firestore (com cache no backend e cliente)
        const stuRes = await fetch('/api/students');
        if (stuRes.ok) {
          const stuData = await stuRes.json();
          if (Array.isArray(stuData.students) && stuData.students.length > 0) {
            setStudents(stuData.students);
            if (typeof window !== 'undefined') {
              setScopedLocalStorageItem('local_students_data', JSON.stringify(stuData.students), teacher.id);
            }
          }
        }

        // 2. Carregar Atividades do Firestore (com sincronização segura)
        const actRes = await fetch('/api/activities');
        if (actRes.ok) {
          const actData = await actRes.json();
          if (Array.isArray(actData.activities)) {
            setActivities(actData.activities);
            if (typeof window !== 'undefined') {
              setScopedLocalStorageItem('local_activities_data', JSON.stringify(actData.activities), teacher.id);
            }
          }
        }

        // 3. Carregar Mensagens de Chat do Firestore (com cache local resiliente)
        const msgRes = await fetch('/api/messages');
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          if (Array.isArray(msgData.messages)) {
            setChatMessages(msgData.messages);
            if (typeof window !== 'undefined') {
              setScopedLocalStorageItem('local_messages_data', JSON.stringify(msgData.messages), teacher.id);
            }
          }
        }

        // 4. Carregar Biblioteca de Arquivos do Firestore COM CACHE (Economia de Leituras)
        const cacheKey = `library_cache_${teacher?.id || 'default'}`;
        const cachedLibrary = sessionStorage.getItem(cacheKey);

        if (cachedLibrary) {
          setLibrary(JSON.parse(cachedLibrary));
        } else {
          const libRes = await fetch('/api/library');
          if (libRes.ok) {
            const libData = await libRes.json();
            if (Array.isArray(libData.files) && libData.files.length > 0) {
              const mappedLibrary: LibraryFile[] = libData.files.map((item: any) => ({
                id: item.id,
                title: item.title,
                category: item.category || 'Geral',
                turma: item.turma || 'Todas',
                fileSize: item.fileSize || item.file_size || '1 MB',
                updatedAt: item.updatedAt || item.updated_at || new Date().toLocaleDateString('pt-BR'),
                driveUrl: item.driveUrl || item.drive_url || item.file_url || '',
              }));
              setLibrary(mappedLibrary);
              // Guarda o resultado mapeado no cache do navegador
              sessionStorage.setItem(cacheKey, JSON.stringify(mappedLibrary));
            }
          }
        }
      } catch (err: any) {
        console.error('Erro ao carregar dados do Firestore:', err);
        setDataLoadError(true);
      } finally {
        setIsDataLoading(false);
      }
    };

    if (role === 'teacher' || role === 'second_teacher' || role === 'student') {
      loadData();
    } else {
      queueMicrotask(() => {
        setIsDataLoading(false);
      });
    }
  }, [loadDataTrigger, role, teacher.id]);

  // Tab efetiva para 2º Professor
  const activeTeacherTab = useMemo(() => {
    if (role === 'second_teacher') {
      const allowedTabs = ['dashboard', 'painel', 'alunos', 'atestados_rad', 'arquivos', 'configuracoes'];
      if (!allowedTabs.includes(currentTab)) {
        return 'dashboard';
      }
    }
    return currentTab;
  }, [role, currentTab]);

  // Estado de alunos online em tempo real (orientado a eventos via SSE / Firestore, sem polling)
  const [liveOnlineCount, setLiveOnlineCount] = useState<number>(0);

  // Efeito orientado a eventos para escutar sessões genuínas de alunos via SSE
  useEffect(() => {
    if (role === 'student' && currentStudent?.id) {
      setLiveOnlineCount(1);
      return;
    }

    if (typeof window === 'undefined') return;

    let eventSource: EventSource | null = null;
    let isMounted = true;

    try {
      const teacherId = teacher?.id || '5IdpwffjnhewdZ5dONRB9QoIRBZ2';
      eventSource = new EventSource(`/api/students/presence/stream?teacherId=${encodeURIComponent(teacherId)}`);

      eventSource.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          if (typeof data.onlineCount === 'number') {
            setLiveOnlineCount(data.onlineCount);
          }
        } catch {
          // Ignora mensagens malformadas ou comentários keepalive
        }
      };

      eventSource.onerror = () => {
        // EventSource reconecta automaticamente em segundo plano
      };
    } catch (err) {
      console.warn('[Presence] Falha ao inicializar EventSource de presença:', err);
    }

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [role, currentStudent?.id, teacher?.id]);

  // Assinatura de presença memoizada: só invalida quando o status real de atividade online muda,
  // poupando ciclos de CPU e conversões repetitivas de Data nos renders da árvore de componentes
  const presenceSignature = useMemo(() => {
    if (role === 'student') return 'student_self';
    if (liveOnlineCount > 0) return `live_${liveOnlineCount}`;

    const targetStudents = role === 'second_teacher' ? visibleStudentsForRole : activeStudents;
    if (!Array.isArray(targetStudents) || targetStudents.length === 0) return 'empty';

    return targetStudents
      .filter((s) => s.isOnline === true && s.lastActiveAt)
      .map((s) => `${s.id}:${s.lastActiveAt}`)
      .join('|');
  }, [role, liveOnlineCount, role === 'second_teacher' ? visibleStudentsForRole : activeStudents]);

  // Contador de presença real de alunos (zero dados fantasmas e sem número 37 estático),
  // protegido por memoização com verificação leve de janela temporal de 5 minutos
  const onlineStudentsCount = useMemo(() => {
    if (role === 'student' && currentStudent?.id) {
      return 1;
    }

    // Se temos a contagem do stream em tempo real do Firestore, respeitamos diretamente
    if (liveOnlineCount > 0) {
      return liveOnlineCount;
    }

    const targetStudents = role === 'second_teacher' ? visibleStudentsForRole : activeStudents;
    if (!Array.isArray(targetStudents) || targetStudents.length === 0) {
      return 0;
    }

    // Validação estrita sobre a lista local de estudantes:
    // NUNCA marca online se lastActiveAt não existir ou se for mais antigo que 5 minutos
    const now = Date.now();
    const fiveMinutesMs = 5 * 60 * 1000;
    let count = 0;

    for (const st of targetStudents) {
      if (st.isOnline === true && st.lastActiveAt) {
        const activeTime = new Date(st.lastActiveAt).getTime();
        if (!isNaN(activeTime) && now - activeTime <= fiveMinutesMs) {
          count++;
        }
      }
    }

    return count;
  }, [role, currentStudent?.id, liveOnlineCount, presenceSignature, role === 'second_teacher' ? visibleStudentsForRole : activeStudents]);

  // Carregamento sob demanda da Biblioteca do Firestore
  useEffect(() => {
    if (activeTeacherTab !== 'arquivos') return;
    if (library.length > 0) return;

    const loadLibrary = async () => {
      try {
        const res = await fetch('/api/library');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.files) && data.files.length > 0) {
            const mappedLibrary: LibraryFile[] = data.files.map((item: any) => ({
              id: item.id,
              title: item.title,
              category: item.category || 'Geral',
              turma: item.turma || 'Todas',
              fileSize: item.fileSize || item.file_size || '1 MB',
              updatedAt: item.updatedAt || item.updated_at || new Date().toLocaleDateString('pt-BR'),
              driveUrl: item.driveUrl || item.drive_url || item.file_url || '',
            }));
            setLibrary(mappedLibrary);
            if (typeof window !== 'undefined') {
              try {
                setScopedLocalStorageItem('library_files_data', JSON.stringify(mappedLibrary), teacher.id);
              } catch (e) {}
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar arquivos da biblioteca no Firestore:', err);
      }
    };

    loadLibrary();
  }, [activeTeacherTab, teacher.id]);

  // Auth Handlers
  const handleLoginTeacher = (loggedTeacher: TeacherUser) => {
    setIsDataLoading(true);
    setTeacher(loggedTeacher);
    setRole('teacher');
    setMustChangePassword(false);
    setCurrentTab('painel');
    if (typeof window !== 'undefined') {
      purgeAllAuthAndTenantCaches();
      const sessionPayload = {
        role: 'teacher',
        ownerTeacherId: loggedTeacher.id,
        teacherData: loggedTeacher,
      };
      setTenantSessionItem('active_session', JSON.stringify(sessionPayload), loggedTeacher.id);

      try {
        const cachedStudents = getScopedLocalStorageItem('local_students_data', loggedTeacher.id);
        if (cachedStudents) {
          const parsed = JSON.parse(cachedStudents);
          if (Array.isArray(parsed) && parsed.length > 0) setStudents(parsed);
        }
        const cachedActs = getScopedLocalStorageItem('local_activities_data', loggedTeacher.id);
        if (cachedActs) {
          const parsed = JSON.parse(cachedActs);
          if (Array.isArray(parsed) && parsed.length > 0) setActivities(parsed);
        }
        const cachedLib = getScopedLocalStorageItem('library_files_data', loggedTeacher.id);
        if (cachedLib) {
          const parsed = JSON.parse(cachedLib);
          if (Array.isArray(parsed) && parsed.length > 0) setLibrary(parsed);
        }
      } catch (e) {
        console.warn('Erro ao carregar cache do professor:', e);
      }
    }
    setLoadDataTrigger((prev) => prev + 1);
  };

  const handleLoginSecondTeacher = (loggedTeacher: TeacherUser) => {
    setIsDataLoading(true);
    setTeacher(loggedTeacher);
    setRole('second_teacher');
    setMustChangePassword(Boolean(loggedTeacher.mustChangePassword));
    setCurrentTab('dashboard');
    if (typeof window !== 'undefined') {
      purgeAllAuthAndTenantCaches();
      const sessionPayload = {
        role: 'second_teacher',
        ownerTeacherId: loggedTeacher.id,
        teacherData: loggedTeacher,
        mustChangePassword: Boolean(loggedTeacher.mustChangePassword),
      };
      setTenantSessionItem('active_session', JSON.stringify(sessionPayload), loggedTeacher.id);
    }
    setLoadDataTrigger((prev) => prev + 1);
  };

  const handleLoginStudent = (loggedStudent: StudentUser) => {
    setIsDataLoading(true);
    setCurrentStudent(loggedStudent);
    setRole('student');
    setMustChangePassword(Boolean(loggedStudent.mustChangePassword));
    if (typeof window !== 'undefined') {
      purgeAllAuthAndTenantCaches();
      const sessionPayload = {
        role: 'student',
        studentId: loggedStudent.id,
        studentData: loggedStudent,
        ownerTeacherId: loggedStudent.ownerTeacherId || '',
        mustChangePassword: Boolean(loggedStudent.mustChangePassword),
      };
      setTenantSessionItem('active_session', JSON.stringify(sessionPayload), loggedStudent.id);
    }
    setLoadDataTrigger((prev) => prev + 1);
  };

  const handlePasswordChanged = () => {
    setMustChangePassword(false);
    showGlobalStatus('success', 'Nova senha pessoal cadastrada com sucesso! Acesso liberado.');
    if (typeof window !== 'undefined') {
      try {
        const currentActiveUid = sessionStorage.getItem('current_active_user_id') || '';
        const sessionStr =
          (currentActiveUid ? getTenantSessionItem('active_session', currentActiveUid) : null) ||
          sessionStorage.getItem('active_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          session.mustChangePassword = false;
          if (session.studentData) session.studentData.mustChangePassword = false;
          if (session.teacherData) session.teacherData.mustChangePassword = false;
          setTenantSessionItem('active_session', JSON.stringify(session), currentActiveUid);
        }
      } catch (e) {
        console.warn('Erro ao atualizar active_session no cliente:', e);
      }
    }
  };

  const handleTeacherTabChange = useCallback(
    (tab: string) => {
      if (role === 'second_teacher') {
        const allowedTabs = ['dashboard', 'painel', 'alunos', 'atestados_rad', 'arquivos', 'configuracoes'];
        if (!allowedTabs.includes(tab)) {
          setCurrentTab('dashboard');
          return;
        }
      }
      setCurrentTab(tab);
      if (tab !== 'grading' && tab !== 'correcoes') setSelectedActivityForGrading(null);
    },
    [role]
  );

  const handleLogout = useCallback(async (reason?: string) => {
    if (typeof window !== 'undefined') {
      purgeAllAuthAndTenantCaches();
      sessionStorage.setItem('explicit_logout', 'true');
    }

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Falha ao invalidar cookie no servidor', e);
    }

    if (isSupabaseConfigured && supabase) {
      supabase?.auth.signOut().catch(() => {});
    }

    setRole(null);
    setCurrentStudent(null);
    setStudents(initialStudents);
    setActivities(initialActivities);
    setLibrary(initialLibrary);

    if (reason && typeof reason === 'string') {
      showGlobalStatus('error', reason);
    }

    window.location.href = '/';
  }, [showGlobalStatus, setStudents, setActivities, setLibrary]);

  // Temporizador de Desconexão por Inatividade (8 minutos)
  useEffect(() => {
    if (!role || !inactivityTimeoutEnabled) return;

    const INACTIVITY_LIMIT_MS = 8 * 60 * 1000;
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

  const handleCreateActivity = async (newAct: Activity) => {
    setActivities((prev) => {
      if (prev.some((a) => a.id === newAct.id)) return prev;

      const next = [newAct, ...prev];
      if (typeof window !== 'undefined')
        setScopedLocalStorageItem('local_activities_data', JSON.stringify(next), teacher.id);
      return next;
    });

    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAct),
      });
      if (!res.ok) throw new Error('Falha ao salvar no banco.');

      showGlobalStatus('success', `Atividade "${newAct.title}" criada com sucesso na nuvem!`);
    } catch (err) {
      console.warn('Erro ao criar atividade:', err);
      showGlobalStatus('error', 'A atividade aparece na tela, mas falhou ao salvar na nuvem.');
    }
  };

  const handleSaveActivity = async (updatedAct: Activity) => {
    if (updatedAct.status !== 'Inativo' && updatedAct.deadline) {
      const isoMatch = updatedAct.deadline.match(/\b(20\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
      if (isoMatch) {
        const todayISO = new Date().toISOString().split('T')[0];
        updatedAct.status = isoMatch[0] >= todayISO ? 'Ativo' : 'Prazo Encerrado';
      }
    }

    setActivities((prev) => {
      const next = prev.map((a) => (a.id === updatedAct.id ? updatedAct : a));
      if (typeof window !== 'undefined')
        setScopedLocalStorageItem('local_activities_data', JSON.stringify(next), teacher.id);
      return next;
    });
    if (selectedActivityForGrading?.id === updatedAct.id) setSelectedActivityForGrading(updatedAct);

    try {
      const res = await fetch('/api/activities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAct),
      });
      if (!res.ok) throw new Error('Falha na atualização.');
      showGlobalStatus('success', `Atividade "${updatedAct.title}" atualizada com sucesso!`);
    } catch (err) {
      console.warn('Erro ao atualizar atividade:', err);
      showGlobalStatus('error', 'Dados alterados na tela, mas não salvos na nuvem.');
    }
  };

  const handleDeleteActivity = async (activity: Activity) => {
    const subs = activity.submissions || [];
    const hasAppliedGradesOrWork =
      subs.length > 0 &&
      subs.some(
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
          `Bloqueio de Segurança: A atividade "${activity.title}" possui notas aplicadas ou entregas com pendência no RCO.`
        );
        return;
      }
    }

    setActivities((prev) => {
      const next = prev.filter((a) => a.id !== activity.id);
      if (typeof window !== 'undefined')
        setScopedLocalStorageItem('local_activities_data', JSON.stringify(next), teacher.id);
      return next;
    });
    if (selectedActivityForGrading?.id === activity.id) setSelectedActivityForGrading(null);

    try {
      const res = await fetch(`/api/activities?id=${activity.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir na nuvem.');
      showGlobalStatus('success', `Atividade "${activity.title}" excluída com sucesso!`);
    } catch (err) {
      console.warn('Erro ao excluir atividade:', err);
      showGlobalStatus('error', 'Atividade oculta da tela, mas exclusão na nuvem falhou.');
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
    try {
      const targetActivity = activities.find((a) => a.id === activityId);
      if (!targetActivity) return;

      const currentSub = targetActivity.submissions.find((s) => s.studentId === studentId);
      const currentReturnCount = currentSub?.returnCount || 0;

      if (status === 'returned' && currentReturnCount >= 3) {
        showGlobalStatus(
          'error',
          '🚨 Bloqueio: Esta atividade já foi devolvida 3 vezes. A 4ª devolução está bloqueada! Atribua a nota final e conclua a avaliação.'
        );
        return;
      }

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
            const existsInActivity = targetActivity.submissions.some((s) => s.studentId === matchedSt.id);
            if (!existsInActivity) {
              missingGroupMembers.push(matchedSt);
            }
          }
        });

        targetActivity.submissions.forEach((s) => {
          if (
            s.groupMembers === currentSub.groupMembers ||
            memberNames.some((m) => normalizeStudentName(m) === normalizeStudentName(s.studentName))
          ) {
            targetGroupStudentIds.add(s.studentId);
          }
        });
      }

      const idsToUpdate = isInitialGroupGrading ? Array.from(targetGroupStudentIds) : [studentId];
      let updatedSubmissions = [...targetActivity.submissions];

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
              registeredInStateSystem !== undefined
                ? registeredInStateSystem
                : sub.registeredInStateSystem,
          };
        }
        return sub;
      });

      const pendingCorrection = updatedSubmissions.filter((s) => s.status === 'pending').length;
      const updatedActivity: Activity = {
        ...targetActivity,
        pendingCorrection,
        submissions: updatedSubmissions,
      };

      setActivities((prev) => {
        const next = prev.map((act) => (act.id === activityId ? updatedActivity : act));
        if (typeof window !== 'undefined')
          setScopedLocalStorageItem('local_activities_data', JSON.stringify(next), teacher.id);
        return next;
      });

      if (selectedActivityForGrading?.id === activityId) {
        setSelectedActivityForGrading(updatedActivity);
      }

      try {
        const res = await fetch('/api/activities', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedActivity),
        });
        if (!res.ok) throw new Error('Falha ao atualizar a atividade na nuvem.');
        showGlobalStatus('success', 'Nota e feedback sincronizados diretamente no Firebase com sucesso!');
      } catch (err) {
        console.warn('Erro ao atualizar nota no Firebase:', err);
        showGlobalStatus('error', 'A nota foi registrada na tela, mas falhou ao salvar na nuvem.');
      }
    } catch (err: any) {
      console.error('Erro local ao calcular submissão:', err);
      showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro de execução (${err?.message || ''})`);
    }
  };

  const handleUpdateStudentAvatar = async (studentId: string, newAvatarUrl: string) => {
    let matchedStudentObj: StudentUser | undefined;
    setStudents((prev) => {
      matchedStudentObj = prev.find((s) => s.id === studentId || s.matricula === studentId);
      const next = prev.map((s) =>
        s.id === studentId || s.matricula === studentId ? { ...s, avatarUrl: newAvatarUrl } : s
      );
      if (typeof window !== 'undefined') {
        try {
          setScopedLocalStorageItem('local_students_data', JSON.stringify(next), teacher.id);
        } catch (e) {}
      }
      return next;
    });

    if (currentStudent && (currentStudent.id === studentId || currentStudent.matricula === studentId)) {
      const updatedCurr = { ...currentStudent, avatarUrl: newAvatarUrl };
      setCurrentStudent(updatedCurr);
      if (typeof window !== 'undefined') {
        try {
          setTenantSessionItem(
            'active_session',
            JSON.stringify({ role: 'student', studentId: updatedCurr.id, studentData: updatedCurr }),
            updatedCurr.id
          );
        } catch (e) {}
      }
    }

    if (supervisingStudent && (supervisingStudent.id === studentId || supervisingStudent.matricula === studentId)) {
      setSupervisingStudent((prev) => (prev ? { ...prev, avatarUrl: newAvatarUrl } : prev));
    }

    try {
      const targetId = matchedStudentObj?.id || studentId;
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetId,
          avatarUrl: newAvatarUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.warn('Aviso ao persistir avatar no Firestore:', data.error);
      }

      showGlobalStatus('success', 'Avatar atualizado com sucesso!');
    } catch (err: any) {
      console.warn('Aviso ao persistir avatar no Firestore:', err);
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

    try {
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

      const currentAct = activities.find((a) => a.id === activityId);
      if (!currentAct) {
        showGlobalStatus('error', 'Atividade não encontrada na lista.');
        return;
      }

      const updatedSubmissions = [...currentAct.submissions];

      targetStudents.forEach((targetSt) => {
        const existingIndex = updatedSubmissions.findIndex((s) => s.studentId === targetSt.id);

        const isAutoGradedGame = Boolean(
          currentAct.isGameActivity ||
          currentAct.type === 'Jogo Avaliativo' ||
          (maxEssayScore === 0 && objectiveScore !== undefined)
        );
        const submissionStatus = isAutoGradedGame ? ('graded' as const) : ('pending' as const);

        if (existingIndex >= 0) {
          updatedSubmissions[existingIndex] = {
            ...updatedSubmissions[existingIndex],
            essayAnswer,
            objectiveScore,
            maxObjectiveScore,
            maxEssayScore,
            selectedObjectiveAnswers,
            groupMembers:
              groupMembers !== undefined
                ? groupMembers
                : updatedSubmissions[existingIndex].groupMembers,
            status: submissionStatus,
            teacherFeedback: isAutoGradedGame
              ? (updatedSubmissions[existingIndex].teacherFeedback || '🎮 Avaliação automática KronoGames concluída.')
              : updatedSubmissions[existingIndex].teacherFeedback,
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
            status: submissionStatus,
            essayAnswer,
            selectedObjectiveAnswers,
            groupMembers: groupMembers || undefined,
            teacherFeedback: isAutoGradedGame ? '🎮 Avaliação automática KronoGames concluída.' : '',
          });
        }
      });

      const pendingCorrection = updatedSubmissions.filter((s) => s.status === 'pending').length;

      const targetActivityToSave: Activity = {
        ...currentAct,
        totalSubmissions: updatedSubmissions.length,
        pendingCorrection,
        submissions: updatedSubmissions,
      };

      // 1. Atualiza estado e cache local de forma atômica
      const targetOwnerId = studentUser.ownerTeacherId || teacher.id || '5IdpwffjnhewdZ5dONRB9QoIRBZ2';
      setActivities((prev) => {
        const next = prev.map((act) => (act.id === activityId ? targetActivityToSave : act));
        if (typeof window !== 'undefined') {
          setScopedLocalStorageItem('local_activities_data', JSON.stringify(next), targetOwnerId);
        }
        return next;
      });

      if (selectedActivityForGrading && selectedActivityForGrading.id === activityId) {
        setSelectedActivityForGrading(targetActivityToSave);
      }

      // 2. Grava diretamente no Firestore (com retry preventivo)
      const res = await fetch('/api/activities', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': targetOwnerId,
        },
        body: JSON.stringify({
          ...targetActivityToSave,
          ownerTeacherId: targetOwnerId,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      showGlobalStatus('success', 'Resposta da atividade enviada com sucesso para o Professor!');
    } catch (err: any) {
      console.error('Erro ao enviar resposta:', err);
      showGlobalStatus('error', `Falha ao salvar na nuvem: Erro de conexão (${err?.message || ''})`);
    }
  };

  const handleImportStudents = async (newStudents: StudentUser[]) => {
    const processedStudents = await Promise.all(
      newStudents.map(async (s) => {
        let hashed = s.passwordHash;
        if (!hashed || (!hashed.startsWith('$2a$') && !hashed.startsWith('$2b$'))) {
          hashed = await hashPasswordBcrypt(hashed || '123456');
        }
        // O mustChangePassword: true obriga a tela de Nova Senha no primeiro acesso
        return { ...s, passwordHash: hashed, mustChangePassword: true };
      })
    );

    setStudents((prev) => {
      const next = [...prev, ...processedStudents];
      if (typeof window !== 'undefined')
        setScopedLocalStorageItem('local_students_data', JSON.stringify(next), teacher.id);
      return next;
    });

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedStudents),
      });
      if (!res.ok) throw new Error('Falha ao gravar lote de alunos no Firestore.');
      showGlobalStatus('success', `${processedStudents.length} aluno(s) importado(s) e confirmados no Banco!`);
    } catch (err) {
      console.warn('Erro ao conectar na importação de alunos:', err);
      showGlobalStatus('error', 'A importação ocorreu na tela, mas houve falha ao salvar na nuvem.');
    }
  };

  const handleCreateStudent = async (newStudent: StudentUser) => {
    let hashedPass = newStudent.passwordHash;
    if (!hashedPass || (!hashedPass.startsWith('$2a$') && !hashedPass.startsWith('$2b$'))) {
      hashedPass = await hashPasswordBcrypt(hashedPass || newStudent.matricula || '123456');
    }

    const studentToSave: StudentUser = {
      ...newStudent,
      passwordHash: hashedPass,
      mustChangePassword: true,
    };

    setStudents((prev) => {
      if (prev.some((s) => s.id === studentToSave.id || s.matricula === studentToSave.matricula))
        return prev;

      const next = [...prev, studentToSave];
      if (typeof window !== 'undefined')
        setScopedLocalStorageItem('local_students_data', JSON.stringify(next), teacher.id);
      return next;
    });

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentToSave),
      });
      if (!res.ok) throw new Error('Falha ao salvar no banco.');
      showGlobalStatus('success', `Aluno "${studentToSave.fullName}" cadastrado com sucesso!`);
    } catch (err) {
      console.warn('Erro ao cadastrar aluno:', err);
      showGlobalStatus('error', 'O aluno aparece na tela, mas falhou ao salvar na nuvem.');
    }
  };

  const handleSaveStudent = async (updatedStudent: StudentUser) => {
    setStudents((prev) => {
      const next = prev.map((s) =>
        s.id === updatedStudent.id || s.matricula === updatedStudent.matricula ? updatedStudent : s
      );
      if (typeof window !== 'undefined')
        setScopedLocalStorageItem('local_students_data', JSON.stringify(next), teacher.id);
      return next;
    });

    if (
      supervisingStudent &&
      (supervisingStudent.id === updatedStudent.id ||
        supervisingStudent.matricula === updatedStudent.matricula)
    ) {
      setSupervisingStudent(updatedStudent);
    }

    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStudent),
      });
      if (!res.ok) throw new Error('Falha na atualização.');
      showGlobalStatus('success', `Vínculo do aluno "${updatedStudent.fullName}" salvo e gravado com sucesso!`);
    } catch (err) {
      console.warn('Erro ao atualizar aluno:', err);
      showGlobalStatus('error', 'Dados alterados na tela, mas não salvos na nuvem.');
    }
  };

  const handleSavePedagogicalNotes = async (studentId: string, notes: string) => {
    const targetStudent = students.find((s) => s.id === studentId);
    if (!targetStudent) return;
    const updatedStudent = { ...targetStudent, pedagogicalNotes: notes };

    setStudents((prev) => {
      const next = prev.map((s) => (s.id === studentId ? updatedStudent : s));
      if (typeof window !== 'undefined')
        setScopedLocalStorageItem('local_students_data', JSON.stringify(next), teacher.id);
      return next;
    });

    if (supervisingStudent && supervisingStudent.id === studentId) {
      setSupervisingStudent(updatedStudent);
    }

    try {
      await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStudent),
      });
    } catch (err) {
      console.error('Erro ao salvar anotações pedagógicas:', err);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    setStudents((prev) => {
      const next = prev.filter((s) => s.id !== studentId);
      if (typeof window !== 'undefined')
        setScopedLocalStorageItem('local_students_data', JSON.stringify(next), teacher.id);
      return next;
    });

    try {
      const res = await fetch(`/api/students?id=${studentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir na nuvem.');
      showGlobalStatus('success', 'Aluno removido com sucesso!');
    } catch (err) {
      console.warn('Erro ao deletar aluno:', err);
      showGlobalStatus('error', 'Aluno oculto da tela, mas exclusão na nuvem falhou.');
    }
  };

  const handleDeleteAllStudents = async () => {
    if (!window.confirm('⚠️ ATENÇÃO EXTREMA: Tem certeza que deseja EXCLUIR TODOS OS ALUNOS da base ativa?')) return;
    
    const confirmText = window.prompt('Para confirmar, digite EXCLUIR TODOS:');
    if (confirmText !== 'EXCLUIR TODOS') {
      showGlobalStatus('error', 'Exclusão cancelada. O texto de confirmação não confere.');
      return;
    }

    setIsDataLoading(true);
    try {
      const res = await fetch('/api/students?id=all', { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir na nuvem.');
      
      setStudents([]);
      if (typeof window !== 'undefined') {
        setScopedLocalStorageItem('local_students_data', '[]', teacher.id);
      }
      showGlobalStatus('success', 'Todos os alunos foram excluídos com sucesso da base de dados!');
    } catch (err) {
      console.warn('Erro ao deletar todos os alunos:', err);
      showGlobalStatus('error', 'Erro ao processar exclusão em massa no servidor.');
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleSuperviseStudent = (student: StudentUser) => {
    setSupervisingStudent(student);
  };

  const handleGenerateDossier = (act: Activity) => {
    alert(`Dossiê em PDF/Planilha gerado com sucesso para a atividade: ${act.title}`);
  };

  const handleArchiveVinculo = async (reason: string, schoolName?: string, vinculoCode?: string) => {
    const now = new Date();
    const nowIso = now.toISOString();
    const trimmedReason = reason.trim() || 'Troca de vínculo';
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const finalMonthYear = `${month}/${year}`;
    const finalSchool = (schoolName || teacher.school || 'Escola Estadual').trim();
    const finalVinculoCode = vinculoCode || `Vínculo ${finalMonthYear}`;
    const finalVinculoId = `VINC-${month}${year}-${Date.now().toString(36)}`;

    const activeStudentsList = students.filter((s) => !s.isArchived);
    const activeActivitiesList = activities.filter((a) => !a.isArchived);
    const studentsCount = activeStudentsList.length;
    const activitiesCount = activeActivitiesList.length;

    if (studentsCount === 0 && activitiesCount === 0) {
      showGlobalStatus('info', 'Não há alunos ou atividades ativas para arquivar no vínculo atual.');
      return { success: false, studentsCount: 0, activitiesCount: 0 };
    }

    try {
      const archiveRes = await fetch('/api/vinculos/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: trimmedReason,
          schoolName: finalSchool,
          vinculoId: finalVinculoId,
          vinculoCode: finalVinculoCode,
        }),
      });

      if (!archiveRes.ok) {
        const errorData = await archiveRes.json().catch(() => ({}));
        console.warn('Aviso ao arquivar no Firestore:', errorData.error);
      }

      setStudents((prev) => {
        const updated = prev.map((s) =>
          !s.isArchived
            ? {
                ...s,
                isArchived: true,
                archivedAt: nowIso,
                archivedReason: trimmedReason,
                archivedVinculoId: finalVinculoId,
                archivedSchool: finalSchool,
              }
            : s
        );
        if (typeof window !== 'undefined') {
          try {
            setScopedLocalStorageItem('local_students_data', JSON.stringify(updated), teacher.id);
          } catch (e) {}
        }
        return updated;
      });

      setActivities((prev) => {
        const updated = prev.map((a) =>
          !a.isArchived
            ? {
                ...a,
                isArchived: true,
                archivedAt: nowIso,
                archivedReason: trimmedReason,
                archivedVinculoId: finalVinculoId,
                archivedSchool: finalSchool,
              }
            : a
        );
        if (typeof window !== 'undefined') {
          try {
            setScopedLocalStorageItem('local_activities_data', JSON.stringify(updated), teacher.id);
          } catch (e) {}
        }
        return updated;
      });

      const successMsg = `${finalVinculoCode} (${finalSchool}) arquivado com sucesso: ${studentsCount} alunos e ${activitiesCount} atividades.`;
      showGlobalStatus('success', successMsg);

      return {
        success: true,
        studentsCount,
        activitiesCount,
      };
    } catch (err: any) {
      console.error('Erro ao arquivar vínculo:', err);
      showGlobalStatus('error', `Falha ao arquivar vínculo: ${err?.message || 'Erro de conexão'}`);
      return {
        success: false,
        studentsCount: 0,
        activitiesCount: 0,
        error: err?.message,
      };
    }
  };

  const handleRestoreVinculo = async (target: {
    vinculoId?: string;
    studentIds?: string[];
    activityIds?: string[];
    vinculoCode?: string;
  }) => {
    try {
      const studentIdsToRestore =
        target.studentIds && target.studentIds.length > 0
          ? target.studentIds
          : students
              .filter((s) => s.isArchived && (!target.vinculoId || s.archivedVinculoId === target.vinculoId))
              .map((s) => s.id);

      const activityIdsToRestore =
        target.activityIds && target.activityIds.length > 0
          ? target.activityIds
          : activities
              .filter((a) => a.isArchived && (!target.vinculoId || a.archivedVinculoId === target.vinculoId))
              .map((a) => a.id);

      if (studentIdsToRestore.length === 0 && activityIdsToRestore.length === 0) {
        showGlobalStatus('info', 'Nenhum registro encontrado para este vínculo.');
        return { success: false, studentsCount: 0, activitiesCount: 0 };
      }

      const restoreRes = await fetch('/api/vinculos/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vinculoId: target.vinculoId,
          studentIds: studentIdsToRestore,
          activityIds: activityIdsToRestore,
        }),
      });

      if (!restoreRes.ok) {
        const errorData = await restoreRes.json().catch(() => ({}));
        console.warn('Aviso ao restaurar vínculo no Firestore:', errorData.error);
      }

      setStudents((prev) => {
        const updated = prev.map((s) => {
          if (studentIdsToRestore.includes(s.id)) {
            return {
              ...s,
              isArchived: false,
              archivedAt: undefined,
              archivedReason: undefined,
              archivedVinculoId: undefined,
              archivedSchool: undefined,
            };
          }
          return s;
        });
        if (typeof window !== 'undefined') {
          try {
            setScopedLocalStorageItem('local_students_data', JSON.stringify(updated), teacher.id);
          } catch (e) {}
        }
        return updated;
      });

      setActivities((prev) => {
        const updated = prev.map((a) => {
          if (activityIdsToRestore.includes(a.id)) {
            return {
              ...a,
              isArchived: false,
              archivedAt: undefined,
              archivedReason: undefined,
              archivedVinculoId: undefined,
              archivedSchool: undefined,
            };
          }
          return a;
        });
        if (typeof window !== 'undefined') {
          try {
            setScopedLocalStorageItem('local_activities_data', JSON.stringify(updated), teacher.id);
          } catch (e) {}
        }
        return updated;
      });

      const msg = `${target.vinculoCode || 'Vínculo'} restaurado com sucesso! ${studentIdsToRestore.length} aluno(s) e ${activityIdsToRestore.length} atividade(s) foram reativados na base de trabalho.`;
      showGlobalStatus('success', msg);

      return {
        success: true,
        studentsCount: studentIdsToRestore.length,
        activitiesCount: activityIdsToRestore.length,
      };
    } catch (err: any) {
      console.error('Erro ao restaurar vínculo:', err);
      showGlobalStatus('error', `Falha ao restaurar vínculo: ${err?.message || 'Erro inesperado'}`);
      return {
        success: false,
        studentsCount: 0,
        activitiesCount: 0,
        error: err?.message,
      };
    }
  };

  // Messaging Handlers
  const handleSendMessage = async (msgData: {
    threadId: string;
    senderId: string;
    senderName: string;
    senderRole: 'teacher' | 'student' | 'second_teacher';
    senderAvatar?: string;
    recipientId: string;
    recipientName: string;
    content: string;
    activityId?: string;
    activityTitle?: string;
  }) => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    const newMsgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newMsg: ChatMessage = {
      id: newMsgId,
      threadId: msgData.threadId,
      senderId: msgData.senderId,
      senderName: msgData.senderName,
      senderRole: msgData.senderRole as 'teacher' | 'student',
      senderAvatar: msgData.senderAvatar,
      recipientId: msgData.recipientId,
      recipientName: msgData.recipientName,
      content: msgData.content,
      createdAt: formattedDate,
      read: false,
      activityId: msgData.activityId,
      activityTitle: msgData.activityTitle,
    };

    // 1. Otimismo UI
    setChatMessages((prev) => mergeChatMessage(prev, newMsg).updated);

    // 2. Persistir mensagem no Firebase Firestore
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMsg,
          createdAtIso: now.toISOString(),
        }),
      });
    } catch (err) {
      console.warn('Erro ao persistir mensagem no Firestore:', err);
    }

    // 3. Se a mensagem for de um aluno para o Prof. Titular e o Boby Sociólogo estiver ativo:
    if (
      msgData.senderRole === 'student' &&
      isAiAutoReplyEnabled &&
      msgData.recipientId !== 'second-teacher'
    ) {
      const studentObj = students.find((s) => s.id === msgData.senderId);
      const cleanTeacherName =
        teacher.name && !teacher.name.toLowerCase().includes('carregando')
          ? teacher.name
          : 'Prof. Gilson Flores';

      try {
        const res = await fetch('/api/gemini/teacher-bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: msgData.senderName,
            studentTurma: studentObj?.turma || 'Geral',
            studentTag: studentObj?.tag || 'REGULAR',
            teacherName: cleanTeacherName,
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
            const replyDate = `${replyNow.toLocaleDateString('pt-BR')} ${replyNow.toLocaleTimeString(
              'pt-BR',
              { hour: '2-digit', minute: '2-digit' }
            )}`;
            const botMsg: ChatMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              threadId: msgData.threadId,
              senderId: teacher.id || 'teacher-1',
              senderName: data.teacherName || `Boby Sociólogo 🤖 (${cleanTeacherName})`,
              senderRole: 'teacher',
              senderAvatar: teacher.avatarUrl,
              recipientId: msgData.senderId,
              recipientName: msgData.senderName,
              content: data.reply,
              createdAt: replyDate,
              read: false,
            };

            setChatMessages((prev) => mergeChatMessage(prev, botMsg).updated);

            await fetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...botMsg,
                createdAtIso: replyNow.toISOString(),
              }),
            });
          }
        }
      } catch (botErr) {
        console.warn('Erro ao disparar resposta automática do Boby Sociólogo:', botErr);
      }
    }
  };

  const handleMarkThreadAsRead = useCallback((threadId: string, currentRole: 'teacher' | 'student') => {
    setChatMessages((prev) => {
      const unreadMsgs = prev.filter(
        (m) =>
          (m.threadId === threadId || m.recipientId === threadId || m.senderId === threadId) &&
          m.senderRole !== currentRole &&
          !m.read
      );
      if (unreadMsgs.length === 0) return prev;

      fetch('/api/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, currentRole }),
      }).catch((err) => console.warn('Erro ao marcar mensagens como lidas no Firestore:', err));

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

  // 0. Server-side rendering / initial hydration shell / data loading
  if (!isMounted || isAuthChecking || isDataLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-[#f8fafc] flex flex-col justify-center items-center p-4">
        <div className="flex items-center gap-3 text-sm font-medium text-[#94a3b8] bg-[#111827] px-6 py-4 rounded-full border border-[#1e293b] shadow-xl">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Carregando plataforma KronoMestre...</span>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated state -> Show Login Screen
  if (!role) {
    return (
      <AuthView
        students={activeStudents}
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

  // 3. Second Teacher Dedicated Portal view
  if (role === 'second_teacher' && teacher) {
    return (
      <SecondTeacherPortalView
        teacher={teacher}
        allStudents={activeStudents}
        activities={activeActivities}
        libraryFiles={library}
        messages={chatMessages}
        onLogout={handleLogout}
        onSendMessage={handleSendMessage}
        onMarkThreadAsRead={handleMarkThreadAsRead}
      />
    );
  }

  // 4. Teacher Dashboard Layout
  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-x-hidden">
      <Sidebar
        currentTab={activeTeacherTab}
        setCurrentTab={handleTeacherTabChange}
        teacher={teacher}
        role={role === 'second_teacher' ? 'second_teacher' : 'teacher'}
        onOpenNewContentModal={() => setIsNewActivityModalOpen(true)}
        onLogout={handleLogout}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        unreadMessagesCount={teacherUnreadMessagesCount}
        pendingCorrectionsCount={teacherPendingCorrectionsCount}
      />

      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        <NavbarTop
          role={role}
          user={teacher}
          onOpenSettings={() => handleTeacherTabChange('configuracoes')}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onlineStudentsCount={onlineStudentsCount}
        />

        {globalDbStatus && (
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4">
            <div
              className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg transition-all animate-fadeIn ${
                globalDbStatus.type === 'success'
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'bg-rose-100 text-rose-600 border border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {globalDbStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span className="break-words">{globalDbStatus.message}</span>
              </div>
              <button
                onClick={() => setGlobalDbStatus(null)}
                className="text-foreground hover:opacity-80 ml-3 text-sm cursor-pointer p-1 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {(activeTeacherTab === 'dashboard' || activeTeacherTab === 'painel') &&
            (role === 'second_teacher' ? (
              <SecondTeacherDashboardView
                teacher={teacher}
                students={visibleStudentsForRole}
                activities={activities}
                onNavigateToTab={handleTeacherTabChange}
              />
            ) : (
              <DashboardCentralView
                activities={activeActivities}
                students={visibleStudentsForRole}
                isLoading={isDataLoading}
                hasError={dataLoadError}
                onRetry={() => setLoadDataTrigger((prev) => prev + 1)}
                onNavigateToTab={handleTeacherTabChange}
                onOpenNewActivityModal={() => setIsNewActivityModalOpen(true)}
                onOpenNewStudentModal={() => setIsNewStudentModalOpen(true)}
                onSelectActivityForGrading={handleSelectActivityForGrading}
                onOpenParallelRecoveryModal={(act) => setParallelRecoveryParentActivity(act)}
                onViewActivity={(act) => setViewingActivity(act)}
              />
            ))}

          {activeTeacherTab === 'atividades' && role !== 'second_teacher' && (
            <DashboardView
              activities={activeActivities}
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

          {activeTeacherTab === 'atividades_interativas' && role !== 'second_teacher' && (
            <InteractiveActivitiesView
              activities={activeActivities}
              students={visibleStudentsForRole}
              teacher={teacher}
              onOpenNewActivityModal={() => setIsNewActivityModalOpen(true)}
              onDeleteActivity={(actId) => {
                const target = activities.find((a) => a.id === actId);
                if (target) handleDeleteActivity(target);
              }}
              onSaveCreatedActivity={async (act) => {
                await handleCreateActivity(act);
              }}
              onPlayGamePreview={(act) => {
                setViewingActivity(act);
              }}
            />
          )}

          {activeTeacherTab === 'atividades_adaptadas' && (
            <AdaptedActivitiesView
              activities={activeActivities}
              students={visibleStudentsForRole}
              teacher={teacher}
              onOpenNewActivityModal={() => setIsNewActivityModalOpen(true)}
              onDeleteActivity={(actId) => {
                const target = activities.find((a) => a.id === actId);
                if (target) handleDeleteActivity(target);
              }}
              onSaveCreatedActivity={async (act) => {
                await handleCreateActivity(act);
              }}
            />
          )}

          {(activeTeacherTab === 'correcoes' || activeTeacherTab === 'grading') &&
            role !== 'second_teacher' && (
              <CorrectionsView
                activities={activeActivities}
                students={visibleStudentsForRole}
                isLoading={isDataLoading}
                hasError={dataLoadError}
                onRetry={() => setLoadDataTrigger((prev) => prev + 1)}
                onUpdateSubmission={handleUpdateSubmission}
                initialSelectedActivityId={selectedActivityForGrading?.id || null}
              />
            )}

          {activeTeacherTab === 'postagem_rco' && role !== 'second_teacher' && (
            <PostagemRcoView
              activities={activeActivities}
              students={visibleStudentsForRole}
              onSelectActivityForGrading={handleSelectActivityForGrading}
              teacher={teacher}
            />
          )}

          {activeTeacherTab === 'mensagens' && role !== 'second_teacher' && (
            <MessagesView
              currentUserRole="teacher"
              teacher={teacher}
              students={visibleStudentsForRole}
              activities={activeActivities}
              messages={chatMessages}
              isAiAutoReplyEnabled={isAiAutoReplyEnabled}
              onToggleAiAutoReply={handleToggleAiAutoReply}
              onSendMessage={handleSendMessage}
              onMarkThreadAsRead={handleMarkThreadAsRead}
            />
          )}

          {activeTeacherTab === 'alunos' && (
            <StudentsView
              students={visibleStudentsForRole}
              isReadOnly={role === 'second_teacher'}
              isAdmin={Boolean(teacher.is_admin || teacher.isAdmin)}
              onSimulateStudent={(st) => {
                handleLoginStudent(st);
                showGlobalStatus('success', `Simulando ambiente do aluno ${st.fullName} (Admin Supremo)`);
              }}
              onOpenNewStudentModal={() => setIsNewStudentModalOpen(true)}
              onEditStudent={(s) => setEditingStudent(s)}
              onDeleteStudent={handleDeleteStudent}
              onSuperviseStudent={handleSuperviseStudent}
              onImportStudents={handleImportStudents}
            />
          )}

          {activeTeacherTab === 'atestados_rad' && (
            <AtestadosRadView
              students={visibleStudentsForRole}
              isReadOnly={role === 'second_teacher'}
            />
          )}

          {activeTeacherTab === '2_professor' && role !== 'second_teacher' && (
            <SecondTeachersView
              messages={chatMessages}
              teacher={teacher}
              currentUserRole={role}
              students={activeStudents}
              activities={activeActivities}
              onSubmitAnswer={handleStudentSubmitAnswer}
              onSaveStudent={handleSaveStudent}
              onSimulateSecondTeacher={(st) => {
                handleLoginSecondTeacher(st);
                showGlobalStatus('success', `Simulando ambiente do 2º Professor ${st.name} (Admin Supremo)`);
              }}
            />
          )}

          {activeTeacherTab === 'backup_recuperacao' && role === 'teacher' && (
            <BackupView
              students={students}
              activities={activities}
              teacher={teacher}
              onArchiveVinculo={handleArchiveVinculo}
              onRestoreVinculo={handleRestoreVinculo}
              onNavigateToDashboard={() => setCurrentTab('dashboard')}
            />
          )}

          {activeTeacherTab === 'arquivos' && (
            <LibraryView
              files={library}
              driveFolderUrl={teacher.driveFolderUrl}
              onSaveDriveFolderUrl={handleSaveDriveFolderUrl}
              onAddFile={handleAddLibraryFile}
              onDeleteFile={handleDeleteLibraryFile}
              isReadOnly={role === 'second_teacher'}
            />
          )}

          {activeTeacherTab === 'configuracoes' && (
            <div className="glass-panel p-8 rounded-3xl border border-border max-w-2xl space-y-6">
              <h1 className="text-2xl font-bold text-foreground">Configurações da Conta</h1>

              {teacherSaveStatus && (
                <div
                  className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between transition-all ${
                    teacherSaveStatus.type === 'success'
                      ? 'bg-primary/20 text-primary border border-primary/40'
                      : 'bg-rose-100 text-rose-600 border border-rose-200'
                  }`}
                >
                  <span>{teacherSaveStatus.message}</span>
                  <button
                    onClick={() => setTeacherSaveStatus(null)}
                    className="text-foreground hover:opacity-80 ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-muted font-semibold mb-1">
                    URL da Imagem de Perfil (Avatar)
                  </label>
                  <input
                    type="text"
                    value={teacher.avatarUrl}
                    onChange={(e) => setTeacher({ ...teacher, avatarUrl: e.target.value })}
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-muted font-semibold mb-1">Nome do Professor</label>
                  <input
                    type="text"
                    value={teacher.name}
                    onChange={(e) => setTeacher({ ...teacher, name: e.target.value })}
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-muted font-semibold mb-1">Disciplina</label>
                  <input
                    type="text"
                    value={teacher.subject}
                    onChange={(e) => setTeacher({ ...teacher, subject: e.target.value })}
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-muted font-semibold mb-1">E-mail</label>
                  <input
                    type="email"
                    value={teacher.email}
                    onChange={(e) => setTeacher({ ...teacher, email: e.target.value })}
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-muted mt-1 ml-1">
                    Você pode alterar seu e-mail de contato e acesso do professor por aqui.
                  </p>
                </div>
                <div>
                  <label className="block text-muted font-semibold mb-1">Telefone</label>
                  <input
                    type="text"
                    value={teacher.phone || ''}
                    onChange={(e) => setTeacher({ ...teacher, phone: e.target.value })}
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-muted font-semibold mb-1">Escola / Instituição</label>
                  <input
                    type="text"
                    value={teacher.school || ''}
                    onChange={(e) => setTeacher({ ...teacher, school: e.target.value })}
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-muted font-semibold mb-1">
                    Matrícula Funcional / Vínculo
                  </label>
                  <input
                    type="text"
                    value={teacher.matriculaFuncional || ''}
                    onChange={(e) => setTeacher({ ...teacher, matriculaFuncional: e.target.value })}
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                    placeholder="Ex: 654.982-1"
                  />
                </div>

                <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                  <label className="block text-primary font-bold mb-1">
                    CÓDIGO DE ACESSO DOS ALUNOS
                  </label>
                  <p className="text-[11px] text-muted mb-3 max-w-[90%]">
                    Este é o código exclusivo do seu ambiente (Tenant). Forneça este código aos seus alunos para que eles possam acessar as suas atividades.
                  </p>

                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      readOnly
                      value={teacher.tenantCode || ''}
                      className="w-40 bg-background/50 border border-primary/40 rounded-xl px-4 py-3 text-foreground font-mono text-lg font-bold tracking-widest text-center"
                      placeholder="----"
                    />
                    {!teacher.tenantCode && (
                      <button
                        type="button"
                        onClick={() => {
                          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                          const nums = '0123456789';
                          const c1 = chars.charAt(Math.floor(Math.random() * chars.length));
                          const n1 = nums.charAt(Math.floor(Math.random() * nums.length));
                          const c2 = chars.charAt(Math.floor(Math.random() * chars.length));
                          const n2 = nums.charAt(Math.floor(Math.random() * nums.length));
                          const newCode = `${c1}${n1}${c2}${n2}`;
                          setTeacher({ ...teacher, tenantCode: newCode });
                        }}
                        className="px-4 py-3 bg-primary text-white text-xs font-bold rounded-xl shadow-lg hover:opacity-90 transition-all cursor-pointer"
                      >
                        Gerar Novo Código
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-background border border-border">
                  <div>
                    <label className="block text-muted font-semibold mb-1">
                      Início da Vigência do Contrato
                    </label>
                    <input
                      type="date"
                      value={teacher.contractStartDate || ''}
                      onChange={(e) =>
                        setTeacher({ ...teacher, contractStartDate: e.target.value })
                      }
                      className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-muted font-semibold mb-1">
                      Término / Encerramento do Contrato
                    </label>
                    <input
                      type="date"
                      value={teacher.contractEndDate || ''}
                      onChange={(e) => setTeacher({ ...teacher, contractEndDate: e.target.value })}
                      className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-muted font-semibold mb-1">
                      Tipo de Vínculo Contratual
                    </label>
                    <select
                      value={teacher.contractType || 'ACT / Contratado'}
                      onChange={(e) => setTeacher({ ...teacher, contractType: e.target.value })}
                      className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="ACT / Contratado" className="bg-surface text-foreground">
                        ACT / Admitido em Caráter Temporário
                      </option>
                      <option value="Efetivo" className="bg-surface text-foreground">
                        Professor Efetivo / Concursado
                      </option>
                      <option value="Substituto" className="bg-surface text-foreground">
                        Professor Substituto
                      </option>
                      <option value="Outro" className="bg-surface text-foreground">
                        Outro Vínculo
                      </option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-muted font-semibold mb-1">Nova Senha de Acesso</label>
                  <input
                    type="password"
                    value={newTeacherPassword}
                    onChange={(e) => setNewTeacherPassword(e.target.value)}
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                    placeholder="Deixe em branco para não alterar"
                  />
                  <p className="text-[10px] text-muted mt-1 ml-1">
                    Preencha apenas se desejar alterar a senha de acesso.
                  </p>
                </div>

                <div className="pt-4 border-t border-border space-y-2">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>Aparência e Contraste Visual</span>
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface rounded-2xl border border-border gap-3">
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Tema Escuro de Alto Contraste
                      </p>
                      <p className="text-[11px] text-muted mt-0.5">
                        Letras nítidas e legíveis para conforto visual e uso profissional prolongado.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setThemeMode('dark')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          themeMode === 'dark'
                            ? 'bg-primary text-white shadow-md shadow-primary/25 border border-primary'
                            : 'bg-surface-hover text-muted hover:text-foreground border border-border'
                        }`}
                      >
                        <span>🌙 Tema Escuro (Padrão)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemeMode('light')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          themeMode === 'light'
                            ? 'bg-primary text-white shadow-md shadow-primary/25 border border-primary'
                            : 'bg-surface-hover text-muted hover:text-foreground border border-border'
                        }`}
                      >
                        <span>☀️ Tema Claro</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-2">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>Segurança da Sessão</span>
                  </h3>
                  <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-border">
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Deslogar por 8 minutos de inatividade
                      </p>
                      <p className="text-[11px] text-muted mt-0.5">
                        Sua sessão será encerrada automaticamente após 8 minutos sem cliques ou movimentação.
                      </p>
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
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

<div className="pt-4 border-t border-border space-y-2">
                  <h3 className="text-sm font-bold text-rose-500 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Zona de Perigo (Ações Irreversíveis)</span>
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-rose-500/5 rounded-2xl border border-rose-500/20 gap-3">
                    <div>
                      <p className="text-xs font-bold text-rose-500">
                        Excluir Todos os Alunos Ativos
                      </p>
                      <p className="text-[11px] text-rose-400/80 mt-0.5 max-w-sm">
                        Zera completamente a sua base de alunos, permitindo uma nova importação limpa via CSV.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeleteAllStudents}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
                    >
                      🗑️ Excluir Todos
                    </button>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const resFirestore = await fetch('/api/teacher/profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          profile: {
                            name: teacher.name,
                            subject: teacher.subject,
                            email: teacher.email,
                            avatarUrl: teacher.avatarUrl,
                            phone: teacher.phone || '',
                            school: teacher.school || '',
                            driveFolderUrl: teacher.driveFolderUrl || '',
                            matriculaFuncional: teacher.matriculaFuncional || '',
                            contractStartDate: teacher.contractStartDate || '',
                            contractEndDate: teacher.contractEndDate || '',
                            contractType: teacher.contractType || 'ACT / Contratado',
                            contractStatus: teacher.contractStatus || 'ativo',
                            tenantCode: teacher.tenantCode || '',
                            escolas_vinculadas: teacher.escolas_vinculadas || [],
                            disciplinas: teacher.disciplinas || [],
                          },
                        }),
                      });

                      if (!resFirestore.ok) {
                        const errData = await resFirestore.json().catch(() => ({}));
                        throw new Error(errData.error || 'Falha ao salvar no Firestore');
                      }

                      if (isSupabaseConfigured && supabase) {
                        try {
                          const updateFields: any = {
                            email: teacher.email,
                            name: teacher.name,
                            subject: teacher.subject,
                            avatar_url: teacher.avatarUrl,
                            phone: teacher.phone || null,
                            school: teacher.school || null,
                            drive_folder_url: teacher.driveFolderUrl || '',
                            matricula_funcional: teacher.matriculaFuncional || null,
                            contract_start_date: teacher.contractStartDate || null,
                            contract_end_date: teacher.contractEndDate || null,
                            contract_type: teacher.contractType || 'ACT / Contratado',
                            contract_status: teacher.contractStatus || 'ativo',
                          };
                          await supabase.from('teachers').upsert(updateFields, { onConflict: 'email' });
                        } catch (supaErr) {
                          console.warn('Aviso de sincronização secundária no Supabase:', supaErr);
                        }
                      }

                      setTeacherSaveStatus({
                        type: 'success',
                        message: 'Perfil salvo com sucesso no Firestore (KronoMestre)!',
                      });
                      setTimeout(() => {
                        setTeacherSaveStatus(null);
                      }, 5000);
                    } catch (err: any) {
                      console.error('Erro ao salvar configurações do professor:', err);
                      setTeacherSaveStatus({
                        type: 'error',
                        message: `Erro ao salvar: ${err.message || String(err)}`,
                      });
                    }
                  }}
                  className="py-3 px-6 bg-primary text-white font-bold rounded-full cursor-pointer hover:bg-[#6bfb9a] transition-all"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Modals */}
      <NewActivityModal
        isOpen={isNewActivityModalOpen}
        onClose={() => setIsNewActivityModalOpen(false)}
        onCreateActivity={handleCreateActivity}
        students={activeStudents}
        activities={activeActivities}
        userEmail={teacher?.email}
      />

      <EditActivityModal
        isOpen={isEditActivityModalOpen}
        onClose={() => {
          setIsEditActivityModalOpen(false);
          setEditingActivity(null);
        }}
        activity={editingActivity}
        onSaveActivity={handleSaveActivity}
        students={activeStudents}
        activities={activeActivities}
        userEmail={teacher?.email}
      />

      <ParallelRecoveryModal
        isOpen={Boolean(parallelRecoveryParentActivity)}
        onClose={() => setParallelRecoveryParentActivity(null)}
        parentActivity={parallelRecoveryParentActivity}
        onCreateActivity={handleCreateActivity}
        students={activeStudents}
        activities={activeActivities}
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
        isOpen={isNewStudentModalOpen && role !== 'second_teacher'}
        onClose={() => setIsNewStudentModalOpen(false)}
        onCreateStudent={handleCreateStudent}
      />

      <EditStudentModal
        isOpen={Boolean(editingStudent) && role !== 'second_teacher'}
        student={editingStudent}
        onClose={() => setEditingStudent(null)}
        onSaveStudent={handleSaveStudent}
      />

      <StudentSupervisionModal
        isOpen={Boolean(supervisingStudent)}
        student={supervisingStudent}
        activities={activeActivities}
        onClose={() => setSupervisingStudent(null)}
        onSaveNotes={handleSavePedagogicalNotes}
        onSendMessage={
          role === 'second_teacher'
            ? undefined
            : () => {
                setSupervisingStudent(null);
                setCurrentTab('mensagens');
              }
        }
      />

      {/* Modal Obrigatório de Troca de Senha no Primeiro Acesso */}
      {mustChangePassword && role && role !== 'teacher' && (
        <ForceChangePasswordModal
          isOpen={mustChangePassword}
          userName={
            role === 'student'
              ? currentStudent?.fullName || 'Aluno'
              : teacher.name || '2º Professor'
          }
          userRole={role === 'student' ? 'student' : 'second_teacher'}
          onPasswordChanged={handlePasswordChanged}
        />
      )}
    </div>
  );
}
