'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  initialStudents,
  initialActivities,
  initialSchedule,
  initialLibrary,
  initialChatMessages,
} from '@/lib/initialData';
import { StudentUser, Activity, LibraryFile } from '@/lib/types';
import { AuthView } from '@/components/AuthView';
import { fetchWithRetry } from '@/lib/fetchRetry';
import { useFreshness } from '@/lib/useFreshness';
import { UpdateBanner } from '@/components/UpdateBanner';
import { Sidebar } from '@/components/Sidebar';
import { NavbarTop } from '@/components/NavbarTop';
import { DashboardView } from '@/components/views/DashboardView';
import { DashboardCentralView } from '@/components/views/DashboardCentralView';
import { PostagemRcoView } from '@/components/views/PostagemRcoView';
import { CorrectionsView } from '@/components/views/CorrectionsView';
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
import { TeacherSettingsView } from '@/components/views/TeacherSettingsView';
import { CronogramaView } from '@/components/views/CronogramaView';

import { NewActivityModal } from '@/components/modals/NewActivityModal';
import { EditActivityModal } from '@/components/modals/EditActivityModal';
import { ViewActivityModal } from '@/components/modals/ViewActivityModal';
import { NewStudentModal } from '@/components/modals/NewStudentModal';
import { EditStudentModal } from '@/components/modals/EditStudentModal';
import { StudentSupervisionModal } from '@/components/modals/StudentSupervisionModal';
import { ParallelRecoveryModal } from '@/components/modals/ParallelRecoveryModal';
import { ForceChangePasswordModal } from '@/components/modals/ForceChangePasswordModal';
import { scrollToTop } from '@/lib/utils';
import {
  setScopedLocalStorageItem,
  getTenantSessionItem,
  setTenantSessionItem,
} from '@/lib/cacheUtils';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

import { useAuthSession } from '@/hooks/useAuthSession';
import { useStudentsManager } from '@/hooks/useStudentsManager';
import { useActivitiesManager } from '@/hooks/useActivitiesManager';
import { useChatMessaging } from '@/hooks/useChatMessaging';
import { isolateActivitiesForStudentTurma } from '@/lib/groupActivityUtils';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [schedule] = useState(initialSchedule);
  const [library, setLibrary] = useState<LibraryFile[]>(initialLibrary);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [isAiAutoReplyEnabled, setIsAiAutoReplyEnabled] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  const [dataLoadError, setDataLoadError] = useState<boolean>(false);
  const [loadDataTrigger, setLoadDataTrigger] = useState<number>(0);
  const lastLoadTimestampRef = useRef<number>(0);

  const [globalSearch, setGlobalSearch] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals state
  const [isNewActivityModalOpen, setIsNewActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isEditActivityModalOpen, setIsEditActivityModalOpen] = useState(false);
  const [parallelRecoveryParentActivity, setParallelRecoveryParentActivity] =
    useState<Activity | null>(null);
  const [viewingActivity, setViewingActivity] = useState<Activity | null>(null);
  const [teacherSaveStatus, setTeacherSaveStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [globalDbStatus, setGlobalDbStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [newTeacherPassword, setNewTeacherPassword] = useState('');

  const showGlobalStatus = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    if (type === 'success') {
      scrollToTop();
    }
    setGlobalDbStatus({ type: type === 'info' ? 'success' : type, message });
    setTimeout(() => {
      setGlobalDbStatus((current) => (current?.message === message ? null : current));
    }, 6000);
  }, []);

  // Referências intermediárias para inicialização coordenada entre os hooks
  const studentsSetterRef = useRef<React.Dispatch<React.SetStateAction<StudentUser[]>>>(() => {});
  const activitiesSetterRef = useRef<React.Dispatch<React.SetStateAction<Activity[]>>>(() => {});
  const messagesSetterRef = useRef<React.Dispatch<React.SetStateAction<any[]>>>(() => {});

  const proxySetStudents = useCallback<React.Dispatch<React.SetStateAction<StudentUser[]>>>(
    (val) => studentsSetterRef.current(val),
    []
  );
  const proxySetActivities = useCallback<React.Dispatch<React.SetStateAction<Activity[]>>>(
    (val) => activitiesSetterRef.current(val),
    []
  );
  const proxySetMessages = useCallback<React.Dispatch<React.SetStateAction<any[]>>>(
    (val) => messagesSetterRef.current(val),
    []
  );

  // 1. Hook de Sessão e Autenticação
  const {
    role,
    teacher,
    setTeacher,
    currentStudent,
    setCurrentStudent,
    mustChangePassword,
    inactivityTimeoutEnabled,
    setInactivityTimeoutEnabled,
    isAuthChecking,
    handleReturnToSupervision,
    handleLoginTeacher,
    handleLoginSecondTeacher,
    handleLoginStudent,
    handlePasswordChanged,
    handleLogout,
  } = useAuthSession({
    setStudents: proxySetStudents,
    setActivities: proxySetActivities,
    setLibrary,
    setChatMessages: proxySetMessages,
    setIsDataLoading,
    setLoadDataTrigger,
    setCurrentTab,
    showGlobalStatus,
  });

  // 2. Hook de Gestão de Alunos e Laudos PNE
  const {
    students,
    setStudents,
    isNewStudentModalOpen,
    setIsNewStudentModalOpen,
    editingStudent,
    setEditingStudent,
    supervisingStudent,
    setSupervisingStudent,
    handleUpdateStudentAvatar,
    handleImportStudents,
    handleCreateStudent,
    handleSaveStudent,
    handleSavePedagogicalNotes,
    handleDeleteStudent,
    handleDeleteAllStudents,
    handleSuperviseStudent,
  } = useStudentsManager({
    initialStudents,
    teacherId: teacher.id,
    currentStudent,
    setCurrentStudent,
    setIsDataLoading,
    showGlobalStatus,
  });
  studentsSetterRef.current = setStudents;

  // 3. Hook de Gestão de Atividades, Submissões, Vínculos e Exclusão AEE
  const {
    activities,
    setActivities,
    selectedActivityForGrading,
    setSelectedActivityForGrading,
    handleSaveEditedActivity,
    handleCreateActivity,
    handleSaveActivity,
    handleDeleteActivity,
    handleUpdateSubmission,
    handleStudentSubmitAnswer,
    handleMarkPhysicalDelivery,
    handleToggleRecoveryAuthorization,
    handleGenerateDossier,
    handleArchiveVinculo,
    handleRestoreVinculo,
  } = useActivitiesManager({
    initialActivities,
    teacher,
    students,
    setStudents,
    currentStudent,
    showGlobalStatus,
  });
  activitiesSetterRef.current = setActivities;

  // 4. Hook de Mensagens e Boby Sociólogo
  const {
    chatMessages,
    setChatMessages,
    handleSendMessage,
    handleMarkThreadAsRead,
  } = useChatMessaging(
    initialChatMessages,
    teacher,
    students,
    activities,
    isAiAutoReplyEnabled
  );
  messagesSetterRef.current = setChatMessages;

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedTheme = localStorage.getItem('app_theme_mode');
      if (savedTheme === 'light') setThemeMode('light');

      const savedAiReply = localStorage.getItem('teacher_ai_auto_reply_enabled');
      if (savedAiReply !== null) setIsAiAutoReplyEnabled(savedAiReply === 'true');
    } catch (e) {}
  }, []);

  // Active datasets
  const activeStudents = useMemo(() => students.filter((s) => !s.isArchived), [students]);
  const activeActivities = useMemo(() => activities.filter((a) => !a.isArchived), [activities]);

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
            ((teacherName &&
              (stName === teacherName ||
                stName.includes(teacherName) ||
                teacherName.includes(stName))) ||
              (teacherEmail && stName === teacherEmail))
        );

        return matchId || matchEmail || matchName;
      });
    }
    return activeStudents;
  }, [role, teacherId, teacherName, teacherEmail, activeStudents]);

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

  const availableTurmas = useMemo(() => {
    return Array.from(studentsByTurma.keys()).sort((a, b) => a.localeCompare(b));
  }, [studentsByTurma]);

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

  const handleToggleAiAutoReply = (enabled: boolean) => {
    setIsAiAutoReplyEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('teacher_ai_auto_reply_enabled', String(enabled));
    }
  };

  const handleSaveDriveFolderUrl = async (url: string) => {
    const cleanUrl = url.trim();
    setTeacher((prev) => ({ ...prev, driveFolderUrl: cleanUrl }));

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('teacher_drive_folder_url', cleanUrl);
        const currentActiveUid =
          sessionStorage.getItem('current_active_user_id') || teacher.id || '';
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
      let loadFailed = false;
      try {
        const stuRes = await fetchWithRetry('/api/students');
        if (!stuRes?.ok) loadFailed = true;
        if (stuRes?.ok) {
          const stuData = await stuRes.json();
          if (Array.isArray(stuData.students) && stuData.students.length > 0) {
            setStudents(stuData.students);
            if (typeof window !== 'undefined') {
              setScopedLocalStorageItem(
                'local_students_data',
                JSON.stringify(stuData.students),
                teacher.id
              );
            }
          }
        }

        const actRes = await fetchWithRetry('/api/activities');
        if (!actRes?.ok) loadFailed = true;
        if (actRes?.ok) {
          const actData = await actRes.json();
          if (Array.isArray(actData.activities)) {
            setActivities(actData.activities);
            if (typeof window !== 'undefined') {
              setScopedLocalStorageItem(
                'local_activities_data',
                JSON.stringify(actData.activities),
                teacher.id
              );
            }
          }
        }

        const msgRes = await fetchWithRetry('/api/messages');
        if (!msgRes?.ok) loadFailed = true;
        if (msgRes?.ok) {
          const msgData = await msgRes.json();
          if (Array.isArray(msgData.messages)) {
            setChatMessages(msgData.messages);
            if (typeof window !== 'undefined') {
              setScopedLocalStorageItem(
                'local_messages_data',
                JSON.stringify(msgData.messages),
                teacher.id
              );
            }
          }
        }

        const cacheKey = `library_cache_${teacher?.id || 'default'}`;
        const cachedAt = Number(sessionStorage.getItem(`${cacheKey}_ts`) || 0);
        const cachedLibrary =
          Date.now() - cachedAt < 10 * 60 * 1000 ? sessionStorage.getItem(cacheKey) : null;

        if (cachedLibrary) {
          setLibrary(JSON.parse(cachedLibrary));
        } else {
          const libRes = await fetchWithRetry('/api/library');
          if (!libRes?.ok) loadFailed = true;
          if (libRes?.ok) {
            const libData = await libRes.json();
            if (Array.isArray(libData.files) && libData.files.length > 0) {
              const mappedLibrary: LibraryFile[] = libData.files.map((item: any) => ({
                id: item.id,
                title: item.title,
                category: item.category || 'Geral',
                turma: item.turma || 'Todas',
                fileSize: item.fileSize || item.file_size || '1 MB',
                updatedAt:
                  item.updatedAt || item.updated_at || new Date().toLocaleDateString('pt-BR'),
                driveUrl: item.driveUrl || item.drive_url || item.file_url || '',
              }));
              setLibrary(mappedLibrary);
              sessionStorage.setItem(cacheKey, JSON.stringify(mappedLibrary));
              sessionStorage.setItem(`${cacheKey}_ts`, String(Date.now()));
            }
          }
        }
        if (loadFailed) setDataLoadError(true);
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
  }, [loadDataTrigger, role, teacher.id, setStudents, setActivities, setChatMessages]);

  const silentRefreshState = useRef<{ running: boolean; queued: Set<string> }>({
    running: false,
    queued: new Set(),
  });
  const silentRefresh = useCallback(
    async (changed: string[]) => {
      const st = silentRefreshState.current;
      changed.forEach((col) => st.queued.add(col));
      if (st.running) return;
      st.running = true;
      try {
        while (st.queued.size > 0) {
          const batch = Array.from(st.queued);
          st.queued.clear();

          if (batch.includes('students')) {
            const r = await fetchWithRetry('/api/students');
            if (r?.ok) {
              const d = await r.json();
              if (Array.isArray(d.students) && d.students.length > 0) {
                setStudents(d.students);
                setScopedLocalStorageItem(
                  'local_students_data',
                  JSON.stringify(d.students),
                  teacher.id
                );
              }
            }
          }
          if (batch.includes('activities')) {
            const r = await fetchWithRetry('/api/activities');
            if (r?.ok) {
              const d = await r.json();
              if (Array.isArray(d.activities)) {
                setActivities(d.activities);
                setScopedLocalStorageItem(
                  'local_activities_data',
                  JSON.stringify(d.activities),
                  teacher.id
                );
              }
            }
          }
          if (batch.includes('messages')) {
            const r = await fetchWithRetry('/api/messages');
            if (r?.ok) {
              const d = await r.json();
              if (Array.isArray(d.messages)) {
                setChatMessages(d.messages);
                setScopedLocalStorageItem(
                  'local_messages_data',
                  JSON.stringify(d.messages),
                  teacher.id
                );
              }
            }
          }
          if (batch.includes('library')) {
            const cacheKey = `library_cache_${teacher?.id || 'default'}`;
            sessionStorage.removeItem(cacheKey);
            sessionStorage.removeItem(`${cacheKey}_ts`);
            const r = await fetchWithRetry('/api/library');
            if (r?.ok) {
              const d = await r.json();
              if (Array.isArray(d.files)) {
                const mapped: LibraryFile[] = d.files.map((item: any) => ({
                  id: item.id,
                  title: item.title,
                  category: item.category || 'Geral',
                  turma: item.turma || 'Todas',
                  fileSize: item.fileSize || item.file_size || '1 MB',
                  updatedAt:
                    item.updatedAt || item.updated_at || new Date().toLocaleDateString('pt-BR'),
                  driveUrl: item.driveUrl || item.drive_url || item.file_url || '',
                }));
                setLibrary(mapped);
                sessionStorage.setItem(cacheKey, JSON.stringify(mapped));
                sessionStorage.setItem(`${cacheKey}_ts`, String(Date.now()));
              }
            }
          }
        }
      } catch (err) {
        console.warn('Falha na atualização em segundo plano:', err);
      } finally {
        st.running = false;
      }
    },
    [teacher.id, setStudents, setActivities, setChatMessages]
  );

  const { updateAvailable } = useFreshness({
    enabled: role === 'teacher' || role === 'second_teacher' || role === 'student',
    onChanged: silentRefresh,
  });

  const activeTeacherTab = useMemo(() => {
    if (role === 'second_teacher') {
      const allowedTabs = [
        'dashboard',
        'painel',
        'alunos',
        'atestados_rad',
        'arquivos',
        'configuracoes',
      ];
      if (!allowedTabs.includes(currentTab)) {
        return 'dashboard';
      }
    }
    return currentTab;
  }, [role, currentTab]);

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
              updatedAt:
                item.updatedAt || item.updated_at || new Date().toLocaleDateString('pt-BR'),
              driveUrl: item.driveUrl || item.drive_url || item.file_url || '',
            }));
            setLibrary(mappedLibrary);
            if (typeof window !== 'undefined') {
              try {
                setScopedLocalStorageItem(
                  'library_files_data',
                  JSON.stringify(mappedLibrary),
                  teacher.id
                );
              } catch (e) {}
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar arquivos da biblioteca no Firestore:', err);
      }
    };

    loadLibrary();
  }, [activeTeacherTab, teacher.id, library.length]);

  const handleTeacherTabChange = useCallback(
    (tab: string) => {
      if (role === 'second_teacher') {
        const allowedTabs = [
          'dashboard',
          'painel',
          'alunos',
          'atestados_rad',
          'arquivos',
          'configuracoes',
        ];
        if (!allowedTabs.includes(tab)) {
          setCurrentTab('dashboard');
          return;
        }
      }
      setCurrentTab(tab);
      if (tab !== 'grading' && tab !== 'correcoes') setSelectedActivityForGrading(null);
    },
    [role, setSelectedActivityForGrading]
  );

  const handleSelectActivityForGrading = useCallback(
    (act: Activity) => {
      setSelectedActivityForGrading(act);
      setCurrentTab('grading');
    },
    [setSelectedActivityForGrading]
  );

  const teacherUnreadMessagesCount = chatMessages.filter(
    (m) => m.senderRole === 'student' && !m.read
  ).length;

  const teacherPendingCorrectionsCount = useMemo(() => {
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
        onReturnToSupervision={handleReturnToSupervision}
        student={currentStudent}
        teacher={teacher}
        activities={isolateActivitiesForStudentTurma(activities, currentStudent)}
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
      <UpdateBanner visible={updateAvailable} />
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
          {activeTeacherTab === 'cronograma' && role !== 'second_teacher' && (
            <CronogramaView teacher={teacher} />
          )}
          {(activeTeacherTab === 'dashboard' || activeTeacherTab === 'painel') &&
            (role === 'second_teacher' ? (
              <SecondTeacherDashboardView
                teacher={teacher}
                students={visibleStudentsForRole}
                activities={isolateActivitiesForStudentTurma(activities, currentStudent)}
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
              onEditActivity={handleSaveEditedActivity}
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
                onSaveActivity={handleSaveEditedActivity}
                activities={activeActivities}
                students={visibleStudentsForRole}
                isLoading={isDataLoading}
                hasError={dataLoadError}
                onRetry={() => setLoadDataTrigger((prev) => prev + 1)}
                onUpdateSubmission={handleUpdateSubmission}
                initialSelectedActivityId={selectedActivityForGrading?.id || null}
              />
            )}

          {false && role !== 'second_teacher' && (
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
              isAdmin={false}
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
                showGlobalStatus(
                  'success',
                  `Simulando ambiente do 2º Professor ${st.name} (Admin Supremo)`
                );
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
              students={students}
              files={library}
              driveFolderUrl={teacher.driveFolderUrl}
              onSaveDriveFolderUrl={handleSaveDriveFolderUrl}
              onAddFile={handleAddLibraryFile}
              onDeleteFile={handleDeleteLibraryFile}
              isReadOnly={role === 'second_teacher'}
            />
          )}

          {activeTeacherTab === 'configuracoes' && (
            <TeacherSettingsView
              teacher={teacher}
              setTeacher={setTeacher}
              teacherSaveStatus={teacherSaveStatus}
              setTeacherSaveStatus={setTeacherSaveStatus}
              newTeacherPassword={newTeacherPassword}
              setNewTeacherPassword={setNewTeacherPassword}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              inactivityTimeoutEnabled={inactivityTimeoutEnabled}
              setInactivityTimeoutEnabled={setInactivityTimeoutEnabled}
              onDeleteAllStudents={handleDeleteAllStudents}
            />
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
        onMarkPhysicalDelivery={handleMarkPhysicalDelivery}
        onToggleRecoveryAuthorization={handleToggleRecoveryAuthorization}
        onSimulateStudent={
          role === 'second_teacher'
            ? undefined
            : (st) => {
                setSupervisingStudent(null);
                localStorage.setItem(
                  'teacher_snapshot',
                  JSON.stringify({
                    role: localStorage.getItem('role'),
                    teacherId: localStorage.getItem('teacherId'),
                    teacherName: localStorage.getItem('teacherName') || '',
                    secondTeacherId: localStorage.getItem('secondTeacherId') || '',
                  })
                );
                handleLoginStudent(st);
                showGlobalStatus('success', `Simulando ambiente do aluno ${st.fullName}`);
              }
        }
        onSendMessage={
          role === 'second_teacher'
            ? undefined
            : () => {
                setSupervisingStudent(null);
                setCurrentTab('mensagens');
              }
        }
      />

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
