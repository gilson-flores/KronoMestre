'use client';

import React, { useState } from 'react';
import {
  initialTeacher,
  initialStudents,
  initialActivities,
  initialSchedule,
  initialLibrary,
} from '@/lib/initialData';
import { UserRole, TeacherUser, StudentUser, Activity } from '@/lib/types';
import { AuthView } from '@/components/AuthView';
import { Sidebar } from '@/components/Sidebar';
import { NavbarTop } from '@/components/NavbarTop';
import { DashboardView } from '@/components/views/DashboardView';
import { GradingView } from '@/components/views/GradingView';
import { StudentsView } from '@/components/views/StudentsView';
import { ScheduleView } from '@/components/views/ScheduleView';
import { LibraryView } from '@/components/views/LibraryView';
import { StudentPortalView } from '@/components/views/StudentPortalView';

import { NewActivityModal } from '@/components/modals/NewActivityModal';
import { NewStudentModal } from '@/components/modals/NewStudentModal';
import { EditStudentModal } from '@/components/modals/EditStudentModal';

export default function Home() {
  // Auth state
  const [role, setRole] = useState<UserRole>(null); // 'teacher' | 'student' | null
  const [teacher, setTeacher] = useState<TeacherUser>(initialTeacher);
  const [currentStudent, setCurrentStudent] = useState<StudentUser | null>(null);

  // App datasets
  const [students, setStudents] = useState<StudentUser[]>(initialStudents);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [schedule] = useState(initialSchedule);
  const [library] = useState(initialLibrary);

  // Active view tab: 'painel' | 'atividades' | 'alunos' | 'horarios' | 'arquivos' | 'grading' | 'configuracoes'
  const [currentTab, setCurrentTab] = useState('painel');
  const [selectedActivityForGrading, setSelectedActivityForGrading] = useState<Activity | null>(null);

  // Global search input
  const [globalSearch, setGlobalSearch] = useState('');

  // Modals state
  const [isNewActivityModalOpen, setIsNewActivityModalOpen] = useState(false);
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentUser | null>(null);

  // Auth Handlers
  const handleLoginTeacher = (loggedTeacher: TeacherUser) => {
    setTeacher(loggedTeacher);
    setRole('teacher');
    setCurrentTab('painel');
  };

  const handleLoginStudent = (loggedStudent: StudentUser) => {
    setCurrentStudent(loggedStudent);
    setRole('student');
  };

  const handleLogout = () => {
    setRole(null);
    setCurrentStudent(null);
  };

  // Activity Handlers
  const handleCreateActivity = (newAct: Activity) => {
    setActivities([newAct, ...activities]);
  };

  const handleSelectActivityForGrading = (act: Activity) => {
    setSelectedActivityForGrading(act);
    setCurrentTab('grading');
  };

  const handleUpdateSubmission = (
    activityId: string,
    studentId: string,
    essayScore: number,
    feedback: string,
    status: 'graded' | 'returned' | 'draft'
  ) => {
    setActivities((prev) =>
      prev.map((act) => {
        if (act.id !== activityId) return act;

        const updatedSubmissions = act.submissions.map((sub) => {
          if (sub.studentId === studentId) {
            return {
              ...sub,
              essayScore,
              teacherFeedback: feedback,
              status,
            };
          }
          return sub;
        });

        const pendingCorrection = updatedSubmissions.filter((s) => s.status !== 'graded').length;

        return {
          ...act,
          pendingCorrection,
          submissions: updatedSubmissions,
        };
      })
    );
  };

  const handleStudentSubmitAnswer = (activityId: string, studentId: string, essayAnswer: string) => {
    if (!currentStudent) return;

    setActivities((prev) =>
      prev.map((act) => {
        if (act.id !== activityId) return act;

        const existing = act.submissions.find((s) => s.studentId === studentId);
        let updatedSubmissions = [...act.submissions];

        if (existing) {
          updatedSubmissions = updatedSubmissions.map((s) =>
            s.studentId === studentId ? { ...s, essayAnswer, status: 'pending' as const } : s
          );
        } else {
          updatedSubmissions.push({
            studentId,
            studentName: currentStudent.fullName,
            matricula: currentStudent.matricula,
            tag: currentStudent.tag,
            avatarUrl: currentStudent.avatarUrl,
            objectiveScore: 5.0,
            maxObjectiveScore: 5.0,
            maxEssayScore: 5.0,
            status: 'pending',
            essayAnswer,
            teacherFeedback: '',
          });
        }

        return {
          ...act,
          totalSubmissions: act.totalSubmissions + 1,
          pendingCorrection: act.pendingCorrection + 1,
          submissions: updatedSubmissions,
        };
      })
    );
  };

  // Student CRUD Handlers
  const handleCreateStudent = (newStudent: StudentUser) => {
    setStudents([...students, newStudent]);
  };

  const handleSaveStudent = (updatedStudent: StudentUser) => {
    setStudents(students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
  };

  const handleDeleteStudent = (studentId: string) => {
    setStudents(students.filter((s) => s.id !== studentId));
  };

  const handleSuperviseStudent = (student: StudentUser) => {
    alert(`Supervisionando desempenho do aluno: ${student.fullName} (Matrícula: ${student.matricula})`);
  };

  const handleGenerateDossier = (act: Activity) => {
    alert(`Dossiê em PDF/Planilha gerado com sucesso para a atividade: ${act.title}`);
  };

  // 1. Unauthenticated state -> Show Login Screen
  if (!role) {
    return (
      <AuthView
        students={students}
        teacher={teacher}
        onLoginTeacher={handleLoginTeacher}
        onLoginStudent={handleLoginStudent}
      />
    );
  }

  // 2. Student Portal view
  if (role === 'student' && currentStudent) {
    return (
      <StudentPortalView
        student={currentStudent}
        activities={activities}
        onLogout={handleLogout}
        onSubmitAnswer={handleStudentSubmitAnswer}
      />
    );
  }

  // 3. Teacher Dashboard Layout
  return (
    <div className="flex min-h-screen bg-[#0b1326] text-[#dae2fd]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'grading') setSelectedActivityForGrading(null);
        }}
        teacher={teacher}
        onOpenNewContentModal={() => setIsNewActivityModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <NavbarTop
          role={role}
          user={teacher}
          onOpenSettings={() => setCurrentTab('configuracoes')}
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
        />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'painel' && (
            <DashboardView
              activities={activities}
              onOpenNewActivityModal={() => setIsNewActivityModalOpen(true)}
              onSelectActivityForGrading={handleSelectActivityForGrading}
              onEditActivity={(act) => alert(`Editando atividade: ${act.title}`)}
              onGenerateDossier={handleGenerateDossier}
            />
          )}

          {currentTab === 'atividades' && (
            <DashboardView
              activities={activities}
              onOpenNewActivityModal={() => setIsNewActivityModalOpen(true)}
              onSelectActivityForGrading={handleSelectActivityForGrading}
              onEditActivity={(act) => alert(`Editando atividade: ${act.title}`)}
              onGenerateDossier={handleGenerateDossier}
            />
          )}

          {currentTab === 'grading' && (
            <GradingView
              activity={selectedActivityForGrading || activities[3]}
              onBack={() => setCurrentTab('atividades')}
              onUpdateSubmission={handleUpdateSubmission}
            />
          )}

          {currentTab === 'alunos' && (
            <StudentsView
              students={students}
              onOpenNewStudentModal={() => setIsNewStudentModalOpen(true)}
              onEditStudent={(s) => setEditingStudent(s)}
              onDeleteStudent={handleDeleteStudent}
              onSuperviseStudent={handleSuperviseStudent}
            />
          )}

          {currentTab === 'horarios' && <ScheduleView schedule={schedule} />}

          {currentTab === 'arquivos' && <LibraryView files={library} />}

          {currentTab === 'configuracoes' && (
            <div className="glass-panel p-8 rounded-3xl border border-white/10 max-w-2xl space-y-6">
              <h1 className="text-2xl font-bold text-white">Configurações da Conta</h1>
              <div className="space-y-4 text-xs">
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
                <button
                  onClick={() => alert('Configurações atualizadas!')}
                  className="py-3 px-6 bg-[#4ade80] text-[#003919] font-bold rounded-full cursor-pointer"
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
    </div>
  );
}
