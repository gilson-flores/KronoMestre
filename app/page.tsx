'use client';

import React, { useState, useEffect } from 'react';
import {
  initialTeacher,
  initialStudents,
  initialActivities,
  initialSchedule,
  initialLibrary,
} from '@/lib/initialData';
import { UserRole, TeacherUser, StudentUser, Activity } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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
          const { data: teacherRow } = await client
            .from('teachers')
            .select('*')
            .eq('email', activeEmail)
            .maybeSingle();

          if (teacherRow) {
            setTeacher({
              id: teacherRow.id,
              name: teacherRow.name,
              subject: teacherRow.subject || 'Sociologia',
              email: teacherRow.email,
              avatarUrl: teacherRow.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
              phone: teacherRow.phone || '',
              school: teacherRow.school || '',
            });
          }
        }

        // 1. Carregar Alunos do Supabase
        const { data: dbStudents } = await client.from('students').select('*');
        if (dbStudents && dbStudents.length > 0) {
          const mappedStudents: StudentUser[] = dbStudents.map((s) => ({
            id: s.id,
            fullName: s.full_name,
            turma: s.turma,
            matricula: s.matricula,
            tag: s.tag,
            passwordHash: s.password_hash || '1234',
            avatarUrl:
              s.avatar_url ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
          }));
          setStudents(mappedStudents);
        }

        // 2. Carregar Atividades e Entregas do Supabase
        const { data: dbActivities } = await client.from('activities').select('*');
        const { data: dbSubmissions } = await client.from('submissions').select('*');

        if (dbActivities && dbActivities.length > 0) {
          const mappedActivities: Activity[] = dbActivities.map((act) => {
            const subs = (dbSubmissions || [])
              .filter((sub) => sub.activity_id === act.id)
              .map((sub) => ({
                studentId: sub.student_id,
                studentName: sub.student_name,
                matricula: sub.matricula,
                tag: sub.tag,
                avatarUrl: sub.avatar_url,
                objectiveScore: Number(sub.objective_score || 0),
                maxObjectiveScore: Number(sub.max_objective_score || 5),
                essayScore:
                  sub.essay_score !== null && sub.essay_score !== undefined
                    ? Number(sub.essay_score)
                    : undefined,
                maxEssayScore: Number(sub.max_essay_score || 5),
                status: sub.status,
                essayAnswer: sub.essay_answer,
                teacherFeedback: sub.teacher_feedback,
              }));

            return {
              id: act.id,
              title: act.title,
              description: act.description,
              turma: act.turma,
              type: act.type,
              status: act.status,
              deadline: act.deadline,
              totalSubmissions: act.total_submissions || subs.length,
              totalStudents: act.total_students || 0,
              pendingCorrection: act.pending_correction || subs.filter((s) => s.status === 'pending').length,
              averageGrade: act.average_grade ? Number(act.average_grade) : undefined,
              completedDate: act.completed_date,
              submissions: subs,
            };
          });
          setActivities(mappedActivities);
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
  const handleCreateActivity = async (newAct: Activity) => {
    setActivities([newAct, ...activities]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('activities').insert({
          id: newAct.id,
          title: newAct.title,
          description: newAct.description,
          turma: newAct.turma,
          type: newAct.type,
          status: newAct.status,
          deadline: newAct.deadline,
          total_submissions: newAct.totalSubmissions,
          total_students: newAct.totalStudents,
          pending_correction: newAct.pendingCorrection,
        });
      } catch (err) {
        console.error('Erro ao salvar atividade no Supabase:', err);
      }
    }
  };

  const handleDeleteActivity = async (activity: Activity) => {
    setActivities((prev) => prev.filter((a) => a.id !== activity.id));
    if (selectedActivityForGrading?.id === activity.id) {
      setSelectedActivityForGrading(null);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('submissions').delete().eq('activity_id', activity.id);
        const { error } = await supabase.from('activities').delete().eq('id', activity.id);
        if (error) {
          console.error('Erro ao excluir atividade no Supabase:', error);
        }
      } catch (err) {
        console.error('Erro ao excluir atividade no Supabase:', err);
      }
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

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('submissions')
          .update({
            essay_score: essayScore,
            teacher_feedback: feedback,
            status: status,
          })
          .eq('activity_id', activityId)
          .eq('student_id', studentId);
      } catch (err) {
        console.error('Erro ao atualizar nota no Supabase:', err);
      }
    }
  };

  const handleStudentSubmitAnswer = async (activityId: string, studentId: string, essayAnswer: string) => {
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

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: existingSub } = await supabase
          .from('submissions')
          .select('id')
          .eq('activity_id', activityId)
          .eq('student_id', studentId)
          .maybeSingle();

        if (existingSub) {
          await supabase
            .from('submissions')
            .update({
              essay_answer: essayAnswer,
              status: 'pending',
            })
            .eq('id', existingSub.id);
        } else {
          await supabase.from('submissions').insert({
            activity_id: activityId,
            student_id: studentId,
            student_name: currentStudent.fullName,
            matricula: currentStudent.matricula,
            tag: currentStudent.tag,
            avatar_url: currentStudent.avatarUrl,
            essay_answer: essayAnswer,
            status: 'pending',
            objective_score: 5.0,
          });
        }
      } catch (err) {
        console.error('Erro ao enviar resposta para o Supabase:', err);
      }
    }
  };

  // Student CRUD Handlers
  const handleCreateStudent = async (newStudent: StudentUser) => {
    setStudents([...students, newStudent]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('students').insert({
          full_name: newStudent.fullName,
          turma: newStudent.turma,
          matricula: newStudent.matricula,
          tag: newStudent.tag,
          password_hash: newStudent.passwordHash || '1234',
          avatar_url: newStudent.avatarUrl,
        });
      } catch (err) {
        console.error('Erro ao cadastrar aluno no Supabase:', err);
      }
    }
  };

  const handleSaveStudent = async (updatedStudent: StudentUser) => {
    setStudents(students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('students')
          .update({
            full_name: updatedStudent.fullName,
            turma: updatedStudent.turma,
            matricula: updatedStudent.matricula,
            tag: updatedStudent.tag,
          })
          .eq('id', updatedStudent.id);
      } catch (err) {
        console.error('Erro ao atualizar aluno no Supabase:', err);
      }
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    setStudents(students.filter((s) => s.id !== studentId));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('students').delete().eq('id', studentId);
      } catch (err) {
        console.error('Erro ao deletar aluno do Supabase:', err);
      }
    }
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
              onDeleteActivity={handleDeleteActivity}
            />
          )}

          {currentTab === 'atividades' && (
            <DashboardView
              activities={activities}
              onOpenNewActivityModal={() => setIsNewActivityModalOpen(true)}
              onSelectActivityForGrading={handleSelectActivityForGrading}
              onEditActivity={(act) => alert(`Editando atividade: ${act.title}`)}
              onGenerateDossier={handleGenerateDossier}
              onDeleteActivity={handleDeleteActivity}
            />
          )}

          {currentTab === 'grading' && (
            selectedActivityForGrading || activities[0] ? (
              <GradingView
                activity={selectedActivityForGrading || activities[0]}
                onBack={() => setCurrentTab('atividades')}
                onUpdateSubmission={handleUpdateSubmission}
              />
            ) : (
              <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb]">
                Nenhuma atividade selecionada para correção.
              </div>
            )
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
                <button
                  onClick={async () => {
                    try {
                      if (!isSupabaseConfigured || !supabase) {
                        alert('Supabase não configurado.');
                        return;
                      }
                      
                      const payload: any = {
                        email: teacher.email,
                        name: teacher.name,
                        subject: teacher.subject,
                        avatar_url: teacher.avatarUrl,
                        phone: teacher.phone || null,
                        school: teacher.school || null,
                      };

                      if (teacher.id) {
                        payload.id = teacher.id;
                      }

                      if (teacher.email) {
                        try {
                          await supabase.auth.updateUser({ email: teacher.email });
                        } catch (e) {
                          console.log('Sincronização de e-mail de auth opcional:', e);
                        }
                      }

                      const { data: updatedData, error } = await supabase
                        .from('teachers')
                        .upsert(payload, { onConflict: teacher.id ? 'id' : 'email' })
                        .select('*')
                        .maybeSingle();

                      if (error) {
                        console.error('Erro ao salvar no Supabase:', error);
                        alert(`Erro ao salvar configurações no Supabase: ${error.message}`);
                      } else {
                        if (updatedData) {
                          setTeacher({
                            id: updatedData.id,
                            name: updatedData.name,
                            subject: updatedData.subject || 'Sociologia',
                            email: updatedData.email,
                            avatarUrl: updatedData.avatar_url || teacher.avatarUrl,
                            phone: updatedData.phone || '',
                            school: updatedData.school || '',
                          });
                        }
                        alert('Configurações salvas e sincronizadas com sucesso com a tabela teachers!');
                      }
                    } catch (err: any) {
                      console.error(err);
                      alert('Erro ao atualizar configurações: ' + (err?.message || ''));
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
