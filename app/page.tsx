'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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


import { normalizeStudentName, getActivityGradeDistribution } from '@/lib/studentUtils';
import {
  sendBrowserNotification,
  checkAndNotifyApproachingDeadlines,
  notifyNewActivityForStudent,
  notifyDeadlineExtendedForStudent,
  requestNotificationPermission,
  registerServiceWorker,
} from '@/lib/notificationUtils';
import { NewActivityModal } from '@/components/modals/NewActivityModal';
import { EditActivityModal } from '@/components/modals/EditActivityModal';
import { ViewActivityModal } from '@/components/modals/ViewActivityModal';
import { NewStudentModal } from '@/components/modals/NewStudentModal';
import { EditStudentModal } from '@/components/modals/EditStudentModal';
import { StudentSupervisionModal } from '@/components/modals/StudentSupervisionModal';
import { NewSecondTeacherModal } from '@/components/modals/NewSecondTeacherModal';
import { ParallelRecoveryModal } from '@/components/modals/ParallelRecoveryModal';
import { ForceChangePasswordModal } from '@/components/modals/ForceChangePasswordModal';
import { hashPasswordBcrypt } from '@/lib/crypto';
import { scrollToTop } from '@/lib/utils';
import {
  getScopedLocalStorageItem,
  setScopedLocalStorageItem,
  cleanLegacyCacheKeys,
  getCurrentOwnerTeacherId,
} from '@/lib/cacheUtils';
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
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [inactivityTimeoutEnabled, setInactivityTimeoutEnabled] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isDataLoading, setIsDataLoading] = useState<boolean>(() => Boolean(isSupabaseConfigured && supabase));
  const [dataLoadError, setDataLoadError] = useState<boolean>(false);
  const [loadDataTrigger, setLoadDataTrigger] = useState<number>(0);

  // Restaurar sessão via nova API do Firebase (Tenant Architecture)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 0);

    const checkSession = async () => {
      if (typeof window === 'undefined') return;
      cleanLegacyCacheKeys();
      
      // PROTEÇÃO DE TERMINAL PÚBLICO: Se a aba foi fechada, a memória volátil sumiu.
      const activeSession = sessionStorage.getItem('active_session');
      if (!activeSession) {
        // Força a destruição de qualquer cookie que o Firebase tenha deixado vivo
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
        return; // Interrompe o processo e obriga a logar novamente
      }

      try {
        // Bate na rota da nossa nova arquitetura para validar o cookie
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.user && data.user.role === 'teacher') {
            const tenant = data.user.tenant || {};
            setRole('teacher');
            setTeacher(prev => ({
              ...prev,
              id: data.user.id,
              email: data.user.email,
              name: tenant.name || tenant.nome || data.user.name || prev.name,
              subject: tenant.subject || prev.subject,
              school: tenant.school !== undefined ? tenant.school : prev.school,
              phone: tenant.phone !== undefined ? tenant.phone : prev.phone,
              avatarUrl: tenant.avatarUrl || prev.avatarUrl,
              matriculaFuncional: tenant.matriculaFuncional !== undefined ? tenant.matriculaFuncional : prev.matriculaFuncional,
              contractStartDate: tenant.contractStartDate || prev.contractStartDate,
              contractEndDate: tenant.contractEndDate || prev.contractEndDate,
              contractType: tenant.contractType || prev.contractType,
              contractStatus: tenant.contractStatus || prev.contractStatus,
              driveFolderUrl: tenant.driveFolderUrl || prev.driveFolderUrl,
              is_admin: tenant.is_admin ?? (data.user.email === '755840@profe.sed.sc.gov.br' || data.user.email === 'gilsonjuniores@gmail.com'),
              isAdmin: tenant.is_admin ?? (data.user.email === '755840@profe.sed.sc.gov.br' || data.user.email === 'gilsonjuniores@gmail.com'),
              plan_type: tenant.plan_type || 'basic',
              escolas_vinculadas: tenant.escolas_vinculadas || prev.escolas_vinculadas || [],
              disciplinas: tenant.disciplinas || prev.disciplinas || [],
              ownerTeacherId: data.user.id,
            }));
          }
        }

        // Mantém as configurações visuais do localStorage
        const savedDriveUrl = localStorage.getItem('teacher_drive_folder_url');
        if (savedDriveUrl) setTeacher((prev) => ({ ...prev, driveFolderUrl: savedDriveUrl }));

        const savedTimeout = localStorage.getItem('inactivity_timeout_enabled');
        if (savedTimeout !== null) setInactivityTimeoutEnabled(savedTimeout === 'true');

        if ('serviceWorker' in navigator) {
          registerServiceWorker().catch(() => {});
        }
      } catch (e) {
        console.warn('Erro ao restaurar sessão do Firebase:', e);
      }
    };

    checkSession();
    return () => clearTimeout(timer);
  }, []);

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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);

  // Active datasets (filtered by non-archived for the current school cycle / vinculo)
  const activeStudents = useMemo(() => students.filter((s) => !s.isArchived), [students]);
  const activeActivities = useMemo(() => activities.filter((a) => !a.isArchived), [activities]);

  const visibleStudentsForRole = useMemo(() => {
    if (role === 'second_teacher' && teacher) {
      return activeStudents.filter((s) => {
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
      });
    }
    return activeStudents;
  }, [role, teacher, activeStudents]);

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

  // Theme preference state (default 'dark' para alto contraste)
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_theme_mode');
      if (saved === 'light') return 'light';
    }
    return 'dark';
  });

  // Atualizar classe do documento quando tema muda
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

    // 3. Persistir no Firestore via Firebase Admin API
    try {
      await fetch('/api/teacher/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            driveFolderUrl: cleanUrl,
          }
        })
      });
    } catch (err) {
      console.warn('Aviso ao sincronizar link do Drive no Firestore:', err);
    }

    // 4. Sincronização secundária no Supabase (se configurado)
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

        await supabase
          .from('teachers')
          .upsert(payload, { onConflict: 'email' });
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
    if (isSupabaseConfigured && supabase) {
      try {
        // Se a Data URL for muito grande para a coluna text do Supabase, salvar string vazia para evitar estouro
        const safeDriveUrl =
          newFile.driveUrl && newFile.driveUrl.startsWith('data:') && newFile.driveUrl.length > 500000
            ? ''
            : newFile.driveUrl || '';

        await supabase!.from('library_files').insert({
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
        setScopedLocalStorageItem('library_files_data', JSON.stringify(updated), teacher.id);
      } catch (err) {
        console.warn('Erro ao atualizar localStorage após deleção:', err);
      }
    }
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase!.from('library_files').delete().eq('id', fileId);
      } catch (err) {
        console.warn('Erro ao deletar arquivo no Supabase:', err);
      }
    }
    showGlobalStatus('success', 'Arquivo removido da biblioteca.');
  };

  // Carregar dados iniciais do Firestore (Arquitetura Multi-Tenant)
  useEffect(() => {
    const loadData = async () => {
      setIsDataLoading(true);
      setDataLoadError(false);
      try {
        // 1. Carregar Alunos do Firestore
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

        // 2. Carregar Atividades do Firestore
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
      } catch (err: any) {
        console.error('Erro ao carregar dados do Firestore:', err);
        setDataLoadError(true);
      } finally {
        setIsDataLoading(false);
      }
    };

    if (role === 'teacher' || role === 'second_teacher') {
      loadData();
    } else {
      setIsDataLoading(false);
    }
  }, [loadDataTrigger, role, teacher.id]);

  // Tab efetiva para 2º Professor: garante que nunca renderize aba indevida
  const activeTeacherTab = useMemo(() => {
    if (role === 'second_teacher') {
      const allowedTabs = ['dashboard', 'painel', 'alunos', 'atestados_rad', 'arquivos', 'configuracoes'];
      if (!allowedTabs.includes(currentTab)) {
        return 'dashboard';
      }
    }
    return currentTab;
  }, [role, currentTab]);

  // Carregamento sob demanda (lazy) da Biblioteca apenas quando a aba 'arquivos' for acessada
  useEffect(() => {
    if (activeTeacherTab !== 'arquivos') return;
    if (!isSupabaseConfigured || !supabase) return;

    const loadLibrary = async () => {
      try {
        const { data: dbLibrary } = await supabase!.from('library_files').select('*');
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
          if (typeof window !== 'undefined') {
            try {
              setScopedLocalStorageItem('library_files_data', JSON.stringify(mappedLibrary), teacher.id);
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar arquivos da biblioteca sob demanda:', err);
      }
    };

    loadLibrary();
  }, [activeTeacherTab]);

  // Auth Handlers
  const handleLoginTeacher = (loggedTeacher: TeacherUser) => {
    setTeacher(loggedTeacher);
    setRole('teacher');
    setMustChangePassword(false);
    setCurrentTab('painel');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'active_session',
        JSON.stringify({
          role: 'teacher',
          ownerTeacherId: loggedTeacher.id,
          teacherData: loggedTeacher,
        })
      );
      requestNotificationPermission().catch(() => {});

      // Carregar cache local seguro do professor que está iniciando sessão
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
    setTeacher(loggedTeacher);
    setRole('second_teacher');
    setMustChangePassword(Boolean(loggedTeacher.mustChangePassword));
    setCurrentTab('dashboard');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'active_session',
        JSON.stringify({
          role: 'second_teacher',
          ownerTeacherId: loggedTeacher.id,
          teacherData: loggedTeacher,
          mustChangePassword: Boolean(loggedTeacher.mustChangePassword),
        })
      );
      requestNotificationPermission().catch(() => {});
    }
    setLoadDataTrigger((prev) => prev + 1);
  };

  const handleLoginStudent = (loggedStudent: StudentUser) => {
    setCurrentStudent(loggedStudent);
    setRole('student');
    setMustChangePassword(Boolean(loggedStudent.mustChangePassword));
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'active_session',
        JSON.stringify({
          role: 'student',
          studentId: loggedStudent.id,
          studentData: loggedStudent,
          ownerTeacherId: loggedStudent.ownerTeacherId || '',
          mustChangePassword: Boolean(loggedStudent.mustChangePassword),
        })
      );
      requestNotificationPermission().catch(() => {});
    }
    setLoadDataTrigger((prev) => prev + 1);
    // Verificar prazos imediatamente no login do aluno
    setTimeout(() => {
      checkAndNotifyApproachingDeadlines(activities, loggedStudent, showGlobalStatus);
    }, 1200);
  };

  const handlePasswordChanged = () => {
    setMustChangePassword(false);
    showGlobalStatus('success', 'Nova senha pessoal cadastrada com sucesso! Acesso liberado.');
    if (typeof window !== 'undefined') {
      try {
        const sessionStr = sessionStorage.getItem('active_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          session.mustChangePassword = false;
          if (session.studentData) session.studentData.mustChangePassword = false;
          if (session.teacherData) session.teacherData.mustChangePassword = false;
          sessionStorage.setItem('active_session', JSON.stringify(session));
        }
      } catch (e) {
        console.warn('Erro ao atualizar active_session no cliente:', e);
      }
    }
  };

  const handleTeacherTabChange = useCallback((tab: string) => {
    if (role === 'second_teacher') {
      const allowedTabs = ['dashboard', 'painel', 'alunos', 'atestados_rad', 'arquivos', 'configuracoes'];
      if (!allowedTabs.includes(tab)) {
        setCurrentTab('dashboard');
        return;
      }
    }
    setCurrentTab(tab);
    if (tab !== 'grading' && tab !== 'correcoes') setSelectedActivityForGrading(null);
  }, [role]);

  const handleLogout = useCallback(async (reason?: string) => {
    // 1. Destruição total do Cache do Navegador
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.removeItem('local_students_data');
      localStorage.removeItem('local_activities_data');
      localStorage.removeItem('library_files_data');
    }
    
    // 2. Destruição da Sessão no Servidor (Firebase)
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn("Falha ao invalidar cookie no servidor", e);
    }

    // 3. Destruição legada (Supabase fallback de segurança)
    if (isSupabaseConfigured && supabase) {
      supabase?.auth.signOut().catch(() => {});
    }

    // 4. Limpeza da Memória RAM (Estados do React)
    setRole(null);
    setCurrentStudent(null);
    setStudents(initialStudents);
    setActivities(initialActivities);
    setLibrary(initialLibrary);

    if (reason && typeof reason === 'string') {
      showGlobalStatus('error', reason);
    }
    
    // 5. Força o recarregamento da página para garantir estado virgem
    window.location.href = '/';
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
    // 1. Otimismo UI (Cache Rápido)
    setActivities((prev) => {
      const next = [newAct, ...prev];
      if (typeof window !== 'undefined') setScopedLocalStorageItem('local_activities_data', JSON.stringify(next), teacher.id);
      return next;
    });

    // 2. Transplante Firebase
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAct)
      });
      if (!res.ok) throw new Error('Falha ao salvar no banco.');
      
      showGlobalStatus('success', `Atividade "${newAct.title}" criada com sucesso na nuvem!`);
      sendBrowserNotification(`📢 Nova Atividade: ${newAct.title}`, {
        body: `Turma ${newAct.turma} • Valor: ${newAct.maxGrade || 10} pts`,
        tag: `new-act-${newAct.id}`,
      });
    } catch (err) {
      console.warn('Erro ao criar atividade:', err);
      showGlobalStatus('error', 'A atividade aparece na tela, mas falhou ao salvar na nuvem.');
    }
  };

  const handleSaveActivity = async (updatedAct: Activity) => {
    // Auto adjust status if deadline is specified
    if (updatedAct.status !== 'Inativo' && updatedAct.deadline) {
      const isoMatch = updatedAct.deadline.match(/\b(20\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
      if (isoMatch) {
        const todayISO = new Date().toISOString().split('T')[0];
        updatedAct.status = isoMatch[0] >= todayISO ? 'Ativo' : 'Prazo Encerrado';
      }
    }

    // 1. Otimismo UI
    setActivities((prev) => {
      const next = prev.map((a) => (a.id === updatedAct.id ? updatedAct : a));
      if (typeof window !== 'undefined') setScopedLocalStorageItem('local_activities_data', JSON.stringify(next), teacher.id);
      return next;
    });
    if (selectedActivityForGrading?.id === updatedAct.id) setSelectedActivityForGrading(updatedAct);

    // 2. Transplante Firebase
    try {
      const res = await fetch('/api/activities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAct)
      });
      if (!res.ok) throw new Error('Falha na atualização.');
      showGlobalStatus('success', `Atividade "${updatedAct.title}" atualizada com sucesso!`);
    } catch (err) {
      console.warn('Erro ao atualizar atividade:', err);
      showGlobalStatus('error', 'Dados alterados na tela, mas não salvos na nuvem.');
    }
  };

  const handleDeleteActivity = async (activity: Activity) => {
    // Validação de segurança pedagógica:
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
          `Bloqueio de Segurança: A atividade "${activity.title}" possui notas aplicadas ou entregas com pendência no RCO.`
        );
        return;
      }
    }

    // 1. Otimismo UI
    setActivities((prev) => {
      const next = prev.filter((a) => a.id !== activity.id);
      if (typeof window !== 'undefined') setScopedLocalStorageItem('local_activities_data', JSON.stringify(next), teacher.id);
      return next;
    });
    if (selectedActivityForGrading?.id === activity.id) setSelectedActivityForGrading(null);

    // 2. Transplante Firebase
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
        showGlobalStatus('error', '🚨 Bloqueio: Esta atividade já foi devolvida 3 vezes. A 4ª devolução está bloqueada! Atribua a nota final e conclua a avaliação.');
        return;
      }

      const newReturnCount = status === 'returned' ? currentReturnCount + 1 : currentReturnCount;
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
            registeredInStateSystem: registeredInStateSystem !== undefined ? registeredInStateSystem : sub.registeredInStateSystem,
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

      // 1. Otimismo UI
      setActivities((prev) => {
        const next = prev.map((act) => (act.id === activityId ? updatedActivity : act));
        if (typeof window !== 'undefined') setScopedLocalStorageItem('local_activities_data', JSON.stringify(next), teacher.id);
        return next;
      });

      if (selectedActivityForGrading?.id === activityId) {
        setSelectedActivityForGrading(updatedActivity);
      }

      // 2. Transplante Firebase via API (PUT na rota de Atividades)
      try {
        const res = await fetch('/api/activities', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedActivity)
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

    // 2. Persistir no Firebase Firestore via /api/students
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
          await supabase!.from('submissions').insert({
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
    const processedStudents = await Promise.all(
      newStudents.map(async (s) => {
        let hashed = s.passwordHash;
        if (!hashed || (!hashed.startsWith('$2a$') && !hashed.startsWith('$2b$'))) {
          hashed = await hashPasswordBcrypt(hashed || s.matricula || '123456');
        }
        return { ...s, passwordHash: hashed, mustChangePassword: true };
      })
    );

    // 1. Otimismo UI: Atualiza a tela instantaneamente
    setStudents((prev) => {
      const next = [...prev, ...processedStudents];
      if (typeof window !== 'undefined') setScopedLocalStorageItem('local_students_data', JSON.stringify(next), teacher.id);
      return next;
    });

    // 2. Transplante: Envia para o Firebase (POST /api/students)
    try {
      // Como o backend aceita lote ou único, enviamos um por um de forma segura (ou lote se preferir otimizar no futuro)
      await Promise.all(processedStudents.map(student => 
        fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(student)
        })
      ));
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

    const studentToSave: StudentUser = { ...newStudent, passwordHash: hashedPass, mustChangePassword: true };

    // 1. Otimismo UI
    setStudents((prev) => {
      const next = [...prev, studentToSave];
      if (typeof window !== 'undefined') setScopedLocalStorageItem('local_students_data', JSON.stringify(next), teacher.id);
      return next;
    });

    // 2. Transplante Firebase
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentToSave)
      });
      if (!res.ok) throw new Error('Falha ao salvar no banco.');
      showGlobalStatus('success', `Aluno "${studentToSave.fullName}" cadastrado com sucesso!`);
    } catch (err) {
      console.warn('Erro ao cadastrar aluno:', err);
      showGlobalStatus('error', 'O aluno aparece na tela, mas falhou ao salvar na nuvem.');
    }
  };

  const handleSaveStudent = async (updatedStudent: StudentUser) => {
    // 1. Otimismo UI
    setStudents((prev) => {
      const next = prev.map((s) => (s.id === updatedStudent.id || s.matricula === updatedStudent.matricula ? updatedStudent : s));
      if (typeof window !== 'undefined') setScopedLocalStorageItem('local_students_data', JSON.stringify(next), teacher.id);
      return next;
    });

    if (supervisingStudent && (supervisingStudent.id === updatedStudent.id || supervisingStudent.matricula === updatedStudent.matricula)) {
      setSupervisingStudent(updatedStudent);
    }

    // 2. Transplante Firebase
    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStudent)
      });
      if (!res.ok) throw new Error('Falha na atualização.');
      showGlobalStatus('success', `Vínculo do aluno "${updatedStudent.fullName}" salvo e gravado com sucesso!`);
    } catch (err) {
      console.warn('Erro ao atualizar aluno:', err);
      showGlobalStatus('error', 'Dados alterados na tela, mas não salvos na nuvem.');
    }
  };

  const handleSavePedagogicalNotes = async (studentId: string, notes: string) => {
    // Atualiza estado local
    const targetStudent = students.find((s) => s.id === studentId);
    if (!targetStudent) return;
    const updatedStudent = { ...targetStudent, pedagogicalNotes: notes };

    setStudents((prev) => {
      const next = prev.map((s) => (s.id === studentId ? updatedStudent : s));
      if (typeof window !== 'undefined') setScopedLocalStorageItem('local_students_data', JSON.stringify(next), teacher.id);
      return next;
    });

    if (supervisingStudent && supervisingStudent.id === studentId) {
      setSupervisingStudent(updatedStudent);
    }

    // Envia o objeto inteiro atualizado (a API de PUT do Firebase sobrescreve o nó do aluno)
    try {
      await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStudent)
      });
    } catch (err) {
      console.error('Erro ao salvar anotações pedagógicas:', err);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    // 1. Otimismo UI
    setStudents((prev) => {
      const next = prev.filter((s) => s.id !== studentId);
      if (typeof window !== 'undefined') setScopedLocalStorageItem('local_students_data', JSON.stringify(next), teacher.id);
      return next;
    });

    // 2. Transplante Firebase
    try {
      const res = await fetch(`/api/students?id=${studentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir na nuvem.');
      showGlobalStatus('success', 'Aluno removido com sucesso!');
    } catch (err) {
      console.warn('Erro ao deletar aluno:', err);
      showGlobalStatus('error', 'Aluno oculto da tela, mas exclusão na nuvem falhou.');
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
      // Persistir arquivamento em lote no Firebase Firestore
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

      // Atualizar estado em memória e cache local
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

      // Persistir restauração de vínculo no Firebase Firestore
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

      // Atualizar no estado local em memória e no cache
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
      supabase!.from('chat_messages').insert({
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
              supabase!.from('chat_messages').insert({
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
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center">
        <div className="flex items-center gap-3 text-sm font-medium text-muted bg-surface px-6 py-4 rounded-full border border-border shadow-xl">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
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
          // @ts-expect-error - Ignorando incompatibilidade temporária de tipagem do chat legada
          onSendMessage={handleSendMessage}
          onMarkThreadAsRead={handleMarkThreadAsRead}
        />
    );
  }

  // 4. Teacher Dashboard Layout
  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Sidebar Navigation */}
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
            ) : (


      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        <NavbarTop
          role={role}
          user={teacher}
          onOpenSettings={() => handleTeacherTabChange('configuracoes')}
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
          {(activeTeacherTab === 'dashboard' || activeTeacherTab === 'painel') && (
            role === 'second_teacher' ? (
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
            )
          )}

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

          {(activeTeacherTab === 'correcoes' || activeTeacherTab === 'grading') && role !== 'second_teacher' && (
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
                  <label className="block text-muted font-semibold mb-1">URL da Imagem de Perfil (Avatar)</label>
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
                  <p className="text-[10px] text-muted mt-1 ml-1">Você pode alterar seu e-mail de contato e acesso do professor por aqui.</p>
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
                  <label className="block text-muted font-semibold mb-1">Matrícula Funcional / Vínculo</label>
                  <input
                    type="text"
                    value={teacher.matriculaFuncional || ''}
                    onChange={(e) => setTeacher({ ...teacher, matriculaFuncional: e.target.value })}
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                    placeholder="Ex: 654.982-1"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-background border border-border">
                  <div>
                    <label className="block text-muted font-semibold mb-1">Início da Vigência do Contrato</label>
                    <input
                      type="date"
                      value={teacher.contractStartDate || ''}
                      onChange={(e) => setTeacher({ ...teacher, contractStartDate: e.target.value })}
                      className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-muted font-semibold mb-1">Término / Encerramento do Contrato</label>
                    <input
                      type="date"
                      value={teacher.contractEndDate || ''}
                      onChange={(e) => setTeacher({ ...teacher, contractEndDate: e.target.value })}
                      className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-muted font-semibold mb-1">Tipo de Vínculo Contratual</label>
                    <select
                      value={teacher.contractType || 'ACT / Contratado'}
                      onChange={(e) => setTeacher({ ...teacher, contractType: e.target.value })}
                      className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="ACT / Contratado" className="bg-surface text-foreground">ACT / Admitido em Caráter Temporário</option>
                      <option value="Efetivo" className="bg-surface text-foreground">Professor Efetivo / Concursado</option>
                      <option value="Substituto" className="bg-surface text-foreground">Professor Substituto</option>
                      <option value="Outro" className="bg-surface text-foreground">Outro Vínculo</option>
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
                  <p className="text-[10px] text-muted mt-1 ml-1">Preencha apenas se desejar alterar a senha de acesso (Supabase Auth).</p>
                </div>

                <div className="pt-4 border-t border-border space-y-2">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>Aparência e Contraste Visual</span>
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface rounded-2xl border border-border gap-3">
                    <div>
                      <p className="text-xs font-bold text-foreground">Tema Escuro de Alto Contraste</p>
                      <p className="text-[11px] text-muted mt-0.5">Letras nítidas e legíveis para conforto visual e uso profissional prolongado.</p>
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
                      <p className="text-xs font-bold text-foreground">Deslogar por 8 minutos de inatividade</p>
                      <p className="text-[11px] text-muted mt-0.5">Sua sessão será encerrada automaticamente após 8 minutos sem cliques ou movimentação.</p>
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
                <button
                  onClick={async () => {
                    try {
                      // 1. Salvar no Firestore via API segura do Firebase Admin
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
                            escolas_vinculadas: teacher.escolas_vinculadas || [],
                            disciplinas: teacher.disciplinas || [],
                          }
                        })
                      });

                      if (!resFirestore.ok) {
                        const errData = await resFirestore.json().catch(() => ({}));
                        throw new Error(errData.error || 'Falha ao salvar no Firestore');
                      }

                      // 2. Fallback de sincronização opcional no Supabase (sem bloquear se falhar)
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
            : (st) => {
                setSupervisingStudent(null);
                setCurrentTab('mensagens');
              }
        }
      />

      {/* Modal Obrigatório de Troca de Senha no Primeiro Acesso */}
      {mustChangePassword && role && role !== 'teacher' && (
        <ForceChangePasswordModal
          isOpen={mustChangePassword}
          userName={role === 'student' ? currentStudent?.fullName || 'Aluno' : teacher.name || '2º Professor'}
          userRole={role === 'student' ? 'student' : 'second_teacher'}
          onPasswordChanged={handlePasswordChanged}
        />
      )}
    </div>
  );
}
