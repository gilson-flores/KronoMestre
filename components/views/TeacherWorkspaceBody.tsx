'use client';
import React from 'react';
import { DashboardView } from '@/components/views/DashboardView';
import { DashboardCentralView } from '@/components/views/DashboardCentralView';
import { PostagemRcoView } from '@/components/views/PostagemRcoView';
import { CorrectionsView } from '@/components/views/CorrectionsView';
import { StudentsView } from '@/components/views/StudentsView';
import { LibraryView } from '@/components/views/LibraryView';
import { MessagesView } from '@/components/views/MessagesView';
import { SecondTeachersView } from '@/components/views/SecondTeachersView';
import { SecondTeacherDashboardView } from '@/components/views/SecondTeacherDashboardView';
import { AtestadosRadView } from '@/components/views/AtestadosRadView';
import { BackupView } from '@/components/views/BackupView';
import { AdaptedActivitiesView } from '@/components/views/AdaptedActivitiesView';
import { InteractiveActivitiesView } from '@/components/views/InteractiveActivitiesView';
import { TeacherSettingsView } from '@/components/views/TeacherSettingsView';
import { CronogramaView } from '@/components/views/CronogramaView';
import { isolateActivitiesForStudentTurma } from '@/lib/groupActivityUtils';

export const TeacherWorkspaceBody: React.FC<any> = (props) => {
  const { activeTeacherTab, role, teacher, visibleStudentsForRole, activities, currentStudent, activeActivities, isDataLoading, dataLoadError, setLoadDataTrigger, handleTeacherTabChange, setIsNewActivityModalOpen, setIsNewStudentModalOpen, handleSelectActivityForGrading, setParallelRecoveryParentActivity, setViewingActivity, setEditingActivity, setIsEditActivityModalOpen, handleGenerateDossier, handleDeleteActivity, handleSaveActivity, handleCreateActivity, handleSaveEditedActivity, handleUpdateSubmission, selectedActivityForGrading, chatMessages, isAiAutoReplyEnabled, handleToggleAiAutoReply, handleSendMessage, handleMarkThreadAsRead, setEditingStudent, handleDeleteStudent, handleSuperviseStudent, handleImportStudents, activeStudents, handleStudentSubmitAnswer, handleSaveStudent, handleLoginSecondTeacher, showGlobalStatus, students, handleArchiveVinculo, handleRestoreVinculo, setCurrentTab, library, handleSaveDriveFolderUrl, handleAddLibraryFile, handleDeleteLibraryFile, setTeacher, teacherSaveStatus, setTeacherSaveStatus, newTeacherPassword, setNewTeacherPassword, themeMode, setThemeMode, inactivityTimeoutEnabled, setInactivityTimeoutEnabled, handleDeleteAllStudents } = props;
  return (
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
                onRetry={() => setLoadDataTrigger((prev: number) => prev + 1)}
                onNavigateToTab={handleTeacherTabChange}
                onOpenNewActivityModal={() => setIsNewActivityModalOpen(true)}
                onOpenNewStudentModal={() => setIsNewStudentModalOpen(true)}
                onSelectActivityForGrading={handleSelectActivityForGrading}
                onOpenParallelRecoveryModal={(act: any) => setParallelRecoveryParentActivity(act)}
                onViewActivity={(act: any) => setViewingActivity(act)}
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
              onEditActivity={(act: any) => {
                setEditingActivity(act);
                setIsEditActivityModalOpen(true);
              }}
              onViewActivity={(act: any) => setViewingActivity(act)}
              onGenerateDossier={handleGenerateDossier}
              onDeleteActivity={handleDeleteActivity}
              onSaveActivity={handleSaveActivity}
              onCreateAdaptedActivity={handleCreateActivity}
              onOpenParallelRecoveryModal={(act: any) => setParallelRecoveryParentActivity(act)}
            />
          )}

          {activeTeacherTab === 'atividades_interativas' && role !== 'second_teacher' && (
            <InteractiveActivitiesView
              activities={activeActivities}
              students={visibleStudentsForRole}
              teacher={teacher}
              onOpenNewActivityModal={() => setIsNewActivityModalOpen(true)}
              onDeleteActivity={(actId: string) => {
                const target = activities.find((a: any) => a.id === actId);
                if (target) handleDeleteActivity(target);
              }}
              onSaveCreatedActivity={async (act: any) => {
                await handleCreateActivity(act);
              }}
              onPlayGamePreview={(act: any) => {
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
              onDeleteActivity={(actId: string) => {
                const target = activities.find((a: any) => a.id === actId);
                if (target) handleDeleteActivity(target);
              }}
              onSaveCreatedActivity={async (act: any) => {
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
                onRetry={() => setLoadDataTrigger((prev: number) => prev + 1)}
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
              onEditStudent={(s: any) => setEditingStudent(s)}
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
              onSimulateSecondTeacher={(st: any) => {
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
  );
};
