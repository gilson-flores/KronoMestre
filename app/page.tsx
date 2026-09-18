'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  initialTeacher,
  initialStudents,
  initialActivities,
  initialLibrary,
  initialChatMessages,
} from '@/lib/initialData';
import { UserRole, TeacherUser, StudentUser, Activity, ChatMessage, LibraryFile } from '@/lib/types';

// Telas Principais
import { AuthView } from '@/components/AuthView';
import { Sidebar } from '@/components/Sidebar';
import { NavbarTop } from '@/components/NavbarTop';
import { DashboardCentralView } from '@/components/views/DashboardCentralView';

// Utilitários Locais
import { getScopedLocalStorageItem, cleanLegacyCacheKeys } from '@/lib/cacheUtils';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);

  // Estados de Autenticação baseados no Firebase / API
  const [role, setRole] = useState<UserRole>(null);
  const [teacher, setTeacher] = useState<TeacherUser>(initialTeacher);
  const [currentStudent, setCurrentStudent] = useState<StudentUser | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  
  // UI States
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [globalDbStatus, setGlobalDbStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fallback Inicial para manter a UI de pé (Dados Mockados / LocalStorage)
  const [students, setStudents] = useState<StudentUser[]>(initialStudents);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);

  const activeTeacherTab = useMemo(() => currentTab, [currentTab]);

  const showGlobalStatus = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setGlobalDbStatus({ type, message });
    setTimeout(() => {
      setGlobalDbStatus((current) => (current?.message === message ? null : current));
    }, 6000);
  }, []);

  // 1. HIDRATAÇÃO INICIAL E CHECAGEM DE SESSÃO
  useEffect(() => {
    const checkSession = async () => {
      cleanLegacyCacheKeys();
      
      try {
        const res = await fetch("/api/auth/session");
        
        if (res.ok) {
          const data = await res.json();
          const authUser = data.user;
          
          if (authUser && authUser.role === 'teacher') {
            setRole('teacher');
            setTeacher((prev) => ({
              ...prev,
              id: authUser.id,
              email: authUser.email,
              name: authUser.tenant?.nome || prev.name,
              // O objeto tenant completo está em authUser.tenant para uso futuro
            }));
          }
        }
      } catch (err) {
        console.error("Falha ao checar sessão:", err);
      } finally {
        setIsMounted(true);
        setIsDataLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLogout = useCallback(() => {
    fetch("/api/auth/logout", { method: "POST" })
      .then(() => {
        setRole(null);
        setTeacher(initialTeacher);
      })
      .catch((err) => console.error(err));
  }, []);

  // 0. Renderização no Servidor (Prevenção de Hydration Mismatch)
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600 bg-white px-6 py-4 rounded-full border border-slate-200 shadow-xl">
          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Carregando plataforma KronoMestre...</span>
        </div>
      </div>
    );
  }

  // 1. Estado Não Autenticado -> Exibe o AuthView
  if (!role) {
    // Note que não estamos mais passando 'handleLoginTeacher', o próprio AuthView gerencia seu fetch.
    // Quando ele der sucesso, a página fará um reload automático ou podemos atualizar o estado aqui no futuro.
    // Como o AuthView agora é autossuficiente para o login, ele fará o fallback.
    return (
      <AuthView>
        <div className="flex flex-col items-center justify-center min-h-screen bg-emerald-50">
          <h2 className="text-xl font-bold text-emerald-800">Sessão Estabelecida.</h2>
          <p className="text-emerald-600">Por favor, atualize a página para carregar o painel.</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg">Atualizar</button>
        </div>
      </AuthView>
    );
  }

  // 2. Painel do Professor (Estrutura Básica Restaurada)
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <Sidebar
        currentTab={activeTeacherTab}
        setCurrentTab={setCurrentTab}
        teacher={teacher}
        role="teacher"
        onOpenNewContentModal={() => {}}
        onLogout={handleLogout}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        unreadMessagesCount={0}
        pendingCorrectionsCount={0}
      />

      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        <NavbarTop
          role={role}
          user={teacher}
          onOpenSettings={() => setCurrentTab('configuracoes')}
          globalSearch=""
          setGlobalSearch={() => {}}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {globalDbStatus && (
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4">
            <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg transition-all animate-fadeIn ${globalDbStatus.type === 'success' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
              <div className="flex items-center gap-2">
                {globalDbStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>{globalDbStatus.message}</span>
              </div>
              <button onClick={() => setGlobalDbStatus(null)} className="ml-3 hover:opacity-80">✕</button>
            </div>
          </div>
        )}

        <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {activeTeacherTab === 'dashboard' && (
            <DashboardCentralView
              activities={activities}
              students={students}
              isLoading={isDataLoading}
              hasError={false}
              onRetry={() => {}}
              onNavigateToTab={setCurrentTab}
              onOpenNewActivityModal={() => {}}
              onOpenNewStudentModal={() => {}}
              onSelectActivityForGrading={() => {}}
              onOpenParallelRecoveryModal={() => {}}
              onViewActivity={() => {}}
            />
          )}
          {activeTeacherTab !== 'dashboard' && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <h2 className="text-xl font-bold text-slate-400">Página em Migração (Fase 3)</h2>
              <p className="text-slate-500 mt-2 max-w-md">Esta aba está sendo conectada ao novo banco de dados Firestore. Retorne ao Dashboard ou aguarde o Sócio Estratégico enviar o próximo código.</p>
              <button onClick={() => setCurrentTab('dashboard')} className="mt-6 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium">Voltar ao Dashboard</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
