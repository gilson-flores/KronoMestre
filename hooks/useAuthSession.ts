'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserRole, TeacherUser, StudentUser, Activity, LibraryFile, ChatMessage } from '@/lib/types';
import {
  initialTeacher,
  initialStudents,
  initialActivities,
  initialLibrary,
} from '@/lib/initialData';
import {
  cleanLegacyCacheKeys,
  getTenantSessionItem,
  setTenantSessionItem,
  purgeAllAuthAndTenantCaches,
  getScopedLocalStorageItem,
} from '@/lib/cacheUtils';

interface UseAuthSessionParams {
  setStudents: React.Dispatch<React.SetStateAction<StudentUser[]>>;
  setActivities: React.Dispatch<React.SetStateAction<Activity[]>>;
  setLibrary: React.Dispatch<React.SetStateAction<LibraryFile[]>>;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setIsDataLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadDataTrigger: React.Dispatch<React.SetStateAction<number>>;
  setCurrentTab: React.Dispatch<React.SetStateAction<string>>;
  showGlobalStatus: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function useAuthSession({
  setStudents,
  setActivities,
  setLibrary,
  setChatMessages,
  setIsDataLoading,
  setLoadDataTrigger,
  setCurrentTab,
  showGlobalStatus,
}: UseAuthSessionParams) {
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
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const handleReturnToSupervision = useCallback(() => {
    if (typeof window === 'undefined') return;
    const snapRaw = localStorage.getItem('teacher_snapshot');
    if (snapRaw) {
      try {
        const snap = JSON.parse(snapRaw);
        const tenantVals = Object.keys(localStorage)
          .filter((k) => k.includes('tenant') || k === 'teacher_snapshot')
          .map((k) => ({ k, v: localStorage.getItem(k) }));

        localStorage.clear();
        sessionStorage.clear();

        tenantVals.forEach((tv) => {
          if (tv.v !== null) localStorage.setItem(tv.k, tv.v);
        });

        localStorage.setItem('role', snap.role);
        if (snap.teacherId) localStorage.setItem('teacherId', snap.teacherId);
        if (snap.teacherName) localStorage.setItem('teacherName', snap.teacherName);
        if (snap.secondTeacherId) localStorage.setItem('secondTeacherId', snap.secondTeacherId);

        window.location.reload();
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        const isStudent = keys.some((k) => k.includes('role') && localStorage.getItem(k) === 'student');
        if (isStudent) {
          keys.forEach((key) => {
            const kLower = key.toLowerCase();
            if (
              kLower.includes('activities') ||
              kLower.includes('students') ||
              kLower.includes('submissions') ||
              kLower.includes('library')
            ) {
              localStorage.removeItem(key);
            }
          });
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      if (typeof window === 'undefined') return;
      cleanLegacyCacheKeys();

      const isExplicitLogout = sessionStorage.getItem('explicit_logout') === 'true';
      if (isExplicitLogout) {
        purgeAllAuthAndTenantCaches();
        setRole(null);
        setCurrentStudent(null);
        setIsAuthChecking(false);
        return;
      }

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
              Pragma: 'no-cache',
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

              try {
                const cachedStudents = getScopedLocalStorageItem('local_students_data', data.user.id);
                if (cachedStudents) {
                  const parsed = JSON.parse(cachedStudents);
                  if (Array.isArray(parsed) && parsed.length > 0) setStudents(parsed);
                }
                const cachedActs = getScopedLocalStorageItem('local_activities_data', data.user.id);
                if (cachedActs) {
                  const parsed = JSON.parse(cachedActs);
                  if (Array.isArray(parsed) && parsed.length > 0) setActivities(parsed);
                }
                const cachedMsgs = getScopedLocalStorageItem('local_messages_data', data.user.id);
                if (cachedMsgs) {
                  const parsed = JSON.parse(cachedMsgs);
                  if (Array.isArray(parsed) && parsed.length > 0) setChatMessages(parsed);
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
              driveFolderUrl:
                data.user.driveFolderUrl || parsedLocalSession?.teacherData?.driveFolderUrl || '',
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
            purgeAllAuthAndTenantCaches();
            setRole(null);
            setCurrentStudent(null);
          }
        } else {
          purgeAllAuthAndTenantCaches();
          setRole(null);
          setCurrentStudent(null);
        }

        const savedDriveUrl = localStorage.getItem('teacher_drive_folder_url');
        if (savedDriveUrl) setTeacher((prev) => ({ ...prev, driveFolderUrl: savedDriveUrl }));

        const savedTimeout = localStorage.getItem('inactivity_timeout_enabled');
        if (savedTimeout !== null) setInactivityTimeoutEnabled(savedTimeout === 'true');
      } catch (e) {
        console.warn('Erro ao restaurar sessão do Firebase:', e);
        purgeAllAuthAndTenantCaches();
        setRole(null);
        setCurrentStudent(null);
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkSession();
  }, [setStudents, setActivities, setChatMessages]);

  const handleLoginTeacher = useCallback(
    (loggedTeacher: TeacherUser) => {
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
    },
    [setIsDataLoading, setCurrentTab, setStudents, setActivities, setLibrary, setLoadDataTrigger]
  );

  const handleLoginSecondTeacher = useCallback(
    (loggedTeacher: TeacherUser) => {
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
    },
    [setIsDataLoading, setCurrentTab, setLoadDataTrigger]
  );

  const handleLoginStudent = useCallback(
    (loggedStudent: StudentUser) => {
      if (typeof window !== 'undefined') {
        const keysToKeep = Object.keys(localStorage).filter(
          (k) => k.includes('tenant') || k === 'teacher_snapshot'
        );
        const tenantVals = keysToKeep.map((k) => ({ k, v: localStorage.getItem(k) }));
        localStorage.clear();
        sessionStorage.clear();
        tenantVals.forEach((tv) => {
          if (tv.v !== null) localStorage.setItem(tv.k, tv.v);
        });
      }

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
    },
    [setIsDataLoading, setLoadDataTrigger]
  );

  const handlePasswordChanged = useCallback(() => {
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
  }, [showGlobalStatus]);

  const handleLogout = useCallback(
    async (reason?: string) => {
      if (typeof window !== 'undefined') {
        try {
          const cronoBackup: Record<string, string> = {};
          Object.keys(localStorage).forEach((k) => {
            if (
              k.startsWith('krono_cronograma_') ||
              k.startsWith('krono_avatar_') ||
              k.startsWith('krono_read_msgs_') ||
              k.includes('version') ||
              k.includes('build') ||
              k.includes('deploy') ||
              k === 'app_theme_mode'
            ) {
              const val = localStorage.getItem(k);
              if (val !== null) cronoBackup[k] = val;
            }
          });
          purgeAllAuthAndTenantCaches();
          localStorage.clear();
          sessionStorage.clear();
          Object.entries(cronoBackup).forEach(([k, v]) => localStorage.setItem(k, v));
          sessionStorage.setItem('explicit_logout', 'true');
          if ('caches' in window) {
            caches.keys().then((names) => names.forEach((n) => caches.delete(n))).catch(() => {});
          }
        } catch (e) {}
      }

      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {
        console.warn('Falha ao invalidar cookie no servidor', e);
      }

      setRole(null);
      setCurrentStudent(null);
      setStudents(initialStudents);
      setActivities(initialActivities);
      setLibrary(initialLibrary);

      if (reason && typeof reason === 'string') {
        showGlobalStatus('error', reason);
      }

      window.location.replace('/?logout=' + Date.now());
    },
    [showGlobalStatus, setStudents, setActivities, setLibrary]
  );

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

  return {
    role,
    setRole,
    teacher,
    setTeacher,
    currentStudent,
    setCurrentStudent,
    mustChangePassword,
    setMustChangePassword,
    inactivityTimeoutEnabled,
    setInactivityTimeoutEnabled,
    isAuthChecking,
    setIsAuthChecking,
    handleReturnToSupervision,
    handleLoginTeacher,
    handleLoginSecondTeacher,
    handleLoginStudent,
    handlePasswordChanged,
    handleLogout,
  };
}
