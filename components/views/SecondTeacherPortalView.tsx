import { SecondTeacherPortalBody } from "@/components/parts/SecondTeacherPortalBody";
'use client';
import { AdaptedActivitiesView } from '@/components/views/AdaptedActivitiesView';


import React, { useState, useMemo, useEffect } from 'react';
import {
  HeartHandshake,
  Users,
  BookOpen,
  FolderOpen,
  MessageSquare,
  Settings,
  LogOut,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  Eye,
  AlertCircle,
  Calendar,
  Lock,
  Sparkles,
  Award,
  ShieldCheck,
  UserCheck,
  Building2,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { TeacherUser, StudentUser, Activity, LibraryFile, ChatMessage, AtestadoRadRecord } from '@/lib/types';
import { formatAvatarUrl } from '@/lib/utils';
import { getTurmaLabel, isStudentPNE } from '@/lib/studentUtils';
import { getScopedLocalStorageItem, setScopedLocalStorageItem } from '@/lib/cacheUtils';
import { StudentSupervisionModal } from '@/components/modals/StudentSupervisionModal';
import { LibraryView } from '@/components/views/LibraryView';
import { MessagesView } from '@/components/views/MessagesView';
import { Sidebar } from '@/components/Sidebar';
import { Menu } from 'lucide-react';

interface SecondTeacherPortalViewProps {
  teacher: TeacherUser;
  allStudents: StudentUser[];
  activities: Activity[];
  libraryFiles?: LibraryFile[];
  messages?: ChatMessage[];
  onLogout: () => void;
  onSendMessage: (msg: {
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
  }) => void;
  onMarkThreadAsRead?: (threadId: string, role: 'teacher' | 'student') => void;
}

export const SecondTeacherPortalView: React.FC<SecondTeacherPortalViewProps> = ({
  teacher,
  allStudents,
  activities,
  libraryFiles = [],
  messages = [],
  onLogout,
  onSendMessage,
  onMarkThreadAsRead,
}) => {
  // Navigation Tab: 'desempenho' | 'alunos' | 'atestados' | 'biblioteca' | 'mensagens' | 'configuracoes'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'desempenho' | 'alunos' | 'atestados' | 'atividades_adaptadas' | 'biblioteca' | 'mensagens' | 'configuracoes'>('desempenho');

  // Modal for Viewing Full Student Dossier (Read-Only)
  const [selectedStudentForDossier, setSelectedStudentForDossier] = useState<StudentUser | null>(null);

  // Filter and Search states
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterTurmaFilter, setRosterTurmaFilter] = useState('all');
  const [rosterTagFilter, setRosterTagFilter] = useState<'all' | 'tutelados' | 'pne' | 'regular'>('all');

  const [atestadosSearch, setAtestadosSearch] = useState('');
  const [atestadosTurmaFilter, setAtestadosTurmaFilter] = useState('all');
  const [atestadosTipoFilter, setAtestadosTipoFilter] = useState<'all' | 'Atestado' | 'RAD'>('all');

  // Tutored student delivery filter
  const [deliveryFilterStudent, setDeliveryFilterStudent] = useState<string>('all');

  // Atestados records from DB / Local
  const [atestados, setAtestados] = useState<AtestadoRadRecord[]>([]);
  const [isLoadingAtestados, setIsLoadingAtestados] = useState(true);

  // Settings tab form state
  const [profilePhone, setProfilePhone] = useState(teacher.phone || '');
  const [profileSchool, setProfileSchool] = useState(teacher.school || "EEB Prof. Jandira D'Ávila");
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // 1. Determine Tutored Students (strictly PNE students bound to this 2nd teacher)
  const tutoredStudents = useMemo(() => {
    const tId = teacher.id?.toString().trim().toLowerCase();
    const tName = teacher.name?.trim().toLowerCase();
    const tEmail = teacher.email?.trim().toLowerCase();

    return allStudents.filter((s) => {
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
  }, [teacher, allStudents]);

  // 2. Derive distinct turmas from tutored students
  const derivedTurmas = useMemo(() => {
    const set = new Set<string>();
    tutoredStudents.forEach((s) => {
      if (s.turma && s.turma.trim()) {
        set.add(s.turma.trim());
      }
    });
    return Array.from(set).sort();
  }, [tutoredStudents]);

  // 3. Class Roster: ALL students belonging to the derived turmas
  const classRoster = useMemo(() => {
    if (derivedTurmas.length === 0) return [];
    return allStudents.filter((s) => s.turma && derivedTurmas.includes(s.turma.trim()));
  }, [allStudents, derivedTurmas]);

  // Set of tutored IDs for quick lookup
  const tutoredStudentIds = useMemo(() => new Set(tutoredStudents.map((s) => s.id)), [tutoredStudents]);

  const filteredClassRoster = useMemo(() => {
    return classRoster.filter((s) => {
      const matchSearch = s.fullName.toLowerCase().includes(rosterSearch.toLowerCase());
      const matchTurma = rosterTurmaFilter === 'all' || s.turma === rosterTurmaFilter;
      const isPneStudent = isStudentPNE(s);

      let matchTag = true;
      if (rosterTagFilter === 'tutelados') {
        matchTag = tutoredStudentIds.has(s.id);
      } else if (rosterTagFilter === 'pne') {
        matchTag = isPneStudent;
      } else if (rosterTagFilter === 'regular') {
        matchTag = !isPneStudent;
      }

      return matchSearch && matchTurma && matchTag;
    });
  }, [classRoster, rosterSearch, rosterTurmaFilter, rosterTagFilter, tutoredStudentIds]);

  const tutoredMetrics = useMemo(() => {
    let totalEntregas = 0;
    let aguardandoCorrecao = 0;
    let somaNotas = 0;
    let qtdNotas = 0;

    activities.forEach((act) => {
      act.submissions?.forEach((sub) => {
        if (tutoredStudentIds.has(sub.studentId)) {
          totalEntregas++;
          const isGraded = sub.status === 'graded' || (sub.essayScore !== undefined && sub.essayScore !== null);
          if (!isGraded) {
            aguardandoCorrecao++;
          } else {
            const finalGrade =
              Number(sub.objectiveScore || 0) +
              Number(sub.essayScore || 0) +
              Number(sub.extraPoints || 0);
            somaNotas += finalGrade;
            qtdNotas++;
          }
        }
      });
    });

    const mediaGeral = qtdNotas > 0 ? (somaNotas / qtdNotas).toFixed(1) : '-';

    return {
      totalTutelados: tutoredStudents.length,
      totalEntregas,
      aguardandoCorrecao,
      mediaGeral,
    };
  }, [tutoredStudents, tutoredStudentIds, activities]);

  const tutoredDeliveries = useMemo(() => {
    const deliveries: Array<{
      activityId: string;
      studentId: string;
      studentName: string;
      activityTitle: string;
      isAdapted: boolean;
      turma: string;
      status: 'pending' | 'graded';
      totalGrade: number | undefined;
      maxGrade: number;
      teacherFeedback?: string;
    }> = [];

    activities.forEach((act) => {
      act.submissions?.forEach((sub) => {
        if (tutoredStudentIds.has(sub.studentId)) {
          const student = tutoredStudents.find((s) => s.id === sub.studentId);
          const isGraded = sub.status === 'graded' || (sub.essayScore !== undefined && sub.essayScore !== null);
          const computedGrade = isGraded
            ? Number(
                (
                  Number(sub.objectiveScore || 0) +
                  Number(sub.essayScore || 0) +
                  Number(sub.extraPoints || 0)
                ).toFixed(1)
              )
            : undefined;

          deliveries.push({
            activityId: act.id,
            studentId: sub.studentId,
            studentName: student?.fullName || sub.studentName || 'Aluno Desconhecido',
            activityTitle: act.title,
            isAdapted: Boolean(act.isAdapted),
            turma: student?.turma || 'Sem Turma',
            status: isGraded ? 'graded' : 'pending',
            totalGrade: computedGrade,
            maxGrade: act.maxGrade || 10,
            teacherFeedback: sub.teacherFeedback,
          });
        }
      });
    });

    return deliveries.reverse();
  }, [activities, tutoredStudents, tutoredStudentIds]);

  const filteredAtestados = useMemo(() => {
    return atestados.filter((item) => {
      const q = atestadosSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        (item.studentName || '').toLowerCase().includes(q) ||
        (item.motivo || '').toLowerCase().includes(q);
      const matchTurma =
        atestadosTurmaFilter === 'all' || item.studentTurma === atestadosTurmaFilter;
      const matchTipo =
        atestadosTipoFilter === 'all' || item.tipo === atestadosTipoFilter;
      return matchSearch && matchTurma && matchTipo;
    });
  }, [atestados, atestadosSearch, atestadosTurmaFilter, atestadosTipoFilter]);

  const accessibleLibraryFiles = useMemo(() => {
    return (libraryFiles || []).filter((f) => {
      if (f.targetAudience === 'second_teacher' || f.turma === 'Somente 2º Professor') return true;
      if (f.targetAudience === 'all_turmas' || !f.turma || f.turma === 'Todas') return true;
      const fileTurmas = f.turma.split(',').map((t) => t.trim());
      return derivedTurmas.some((dt) => fileTurmas.includes(dt));
    });
  }, [libraryFiles, derivedTurmas]);

  // Load atestados for the derived turmas
  useEffect(() => {
    let isSubscribed = true;

    async function loadAtestados() {
      setIsLoadingAtestados(true);
      let loaded: AtestadoRadRecord[] = [];
      const ownerTeacherId = teacher.ownerTeacherId || (teacher as any).owner_teacher_id || teacher.id;

      // Local storage fallback com isolamento por professor titular
      if (typeof window !== 'undefined') {
        try {
          const raw = getScopedLocalStorageItem('atestados_rad_records', ownerTeacherId) || 
                      getScopedLocalStorageItem('local_atestados_rad_data', ownerTeacherId);
          if (raw) {
            loaded = JSON.parse(raw);
          }
        } catch (e) {
          console.warn('Erro ao ler cache local de atestados:', e);
        }
      }

      // Fetch from API Route
      try {
        const res = await fetch('/api/atestados-rad');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            loaded = json.data;
            if (typeof window !== 'undefined') {
              setScopedLocalStorageItem('atestados_rad_records', JSON.stringify(json.data), ownerTeacherId);
              setScopedLocalStorageItem('local_atestados_rad_data', JSON.stringify(json.data), ownerTeacherId);
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao buscar atestados via API:', err);
      }

      // Filter atestados belonging to the derived turmas
      if (derivedTurmas.length === 0) {
        if (isSubscribed) {
          setAtestados([]);
          setIsLoadingAtestados(false);
        }
        return;
      }

      const rosterIds = new Set(classRoster.map((s) => s.id));
      const rosterMatriculas = new Set(classRoster.map((s) => s.matricula));
      const rosterNames = new Set(classRoster.map((s) => s.fullName.toLowerCase().trim()));

      const filtered = loaded.filter(
        (rec) =>
          (rec.studentTurma && derivedTurmas.includes(rec.studentTurma)) ||
          rosterIds.has(rec.studentId) ||
          rosterMatriculas.has(rec.studentId) ||
          rosterNames.has(rec.studentName?.toLowerCase().trim())
      );

      if (isSubscribed) {
        setAtestados(filtered);
        setIsLoadingAtestados(false);
      }
    }

    loadAtestados();

    return () => { isSubscribed = false; };
  }, [derivedTurmas, classRoster, teacher.id]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsMsg(null);
    try {
      if (newPassword && newPassword !== confirmPassword) {
        setSettingsMsg({ type: 'error', text: 'As senhas não coincidem.' });
        setIsSavingSettings(false);
        return;
      }
      
      const resProfile = await fetch('/api/second-teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: teacher.id,
          email: teacher.email,
          school: profileSchool,
          phone: profilePhone,
        }),
      });

      if (!resProfile.ok) {
        const pData = await resProfile.json().catch(() => ({}));
        throw new Error(pData.error || 'Erro ao atualizar perfil.');
      }

      if (newPassword) {
        const resPass = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newPassword: newPassword,
          }),
        });

        if (!resPass.ok) {
          const passData = await resPass.json().catch(() => ({}));
          throw new Error(passData.error || 'Erro ao atualizar a senha.');
        }
      }
      
      setSettingsMsg({ type: 'success', text: 'Configurações salvas com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      setSettingsMsg({ type: 'error', text: 'Erro ao salvar configurações.' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  return <SecondTeacherPortalBody {...{ teacher, allStudents, activities, messages, onLogout, onSendMessage, onMarkThreadAsRead, tutoredStudents, derivedTurmas, classRoster, tutoredStudentIds, filteredClassRoster, tutoredMetrics, tutoredDeliveries, filteredAtestados, accessibleLibraryFiles, handleSaveSettings, isMobileMenuOpen, setIsMobileMenuOpen, activeTab, setActiveTab, selectedStudentForDossier, setSelectedStudentForDossier, rosterSearch, setRosterSearch, rosterTurmaFilter, setRosterTurmaFilter, rosterTagFilter, setRosterTagFilter, atestadosSearch, setAtestadosSearch, atestadosTurmaFilter, setAtestadosTurmaFilter, atestadosTipoFilter, setAtestadosTipoFilter, deliveryFilterStudent, setDeliveryFilterStudent, atestados, isLoadingAtestados, profilePhone, setProfilePhone, profileSchool, setProfileSchool, newPassword, setNewPassword, confirmPassword, setConfirmPassword, settingsMsg, isSavingSettings }} />;
};

