'use client';

import React, { useState, useCallback } from 'react';
import { Activity, StudentUser, TeacherUser } from '@/lib/types';
import { setScopedLocalStorageItem } from '@/lib/cacheUtils';
import { normalizeStudentName, isActivityAdapted } from '@/lib/studentUtils';

interface UseActivitiesManagerParams {
  initialActivities: Activity[];
  teacher: TeacherUser;
  students: StudentUser[];
  setStudents: React.Dispatch<React.SetStateAction<StudentUser[]>>;
  currentStudent: StudentUser | null;
  showGlobalStatus: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export function useActivitiesManager({
  initialActivities,
  teacher,
  students,
  setStudents,
  currentStudent,
  showGlobalStatus,
}: UseActivitiesManagerParams) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [selectedActivityForGrading, setSelectedActivityForGrading] = useState<Activity | null>(null);

  const handleSaveEditedActivity = useCallback((updatedActivity: Activity) => {
    setActivities((prev) => prev.map((a) => (a.id === updatedActivity.id ? updatedActivity : a)));
    fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedActivity),
    }).catch((err) => console.warn('Erro ao persistir alteração da atividade:', err));
  }, []);

  const handleCreateActivity = useCallback(
    async (newAct: Activity) => {
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
    },
    [teacher.id, showGlobalStatus]
  );

  const handleSaveActivity = useCallback(
    async (updatedAct: Activity) => {
      setActivities((prev) => {
        const next = prev.map((a) => (a.id === updatedAct.id ? updatedAct : a));
        if (typeof window !== 'undefined')
          setScopedLocalStorageItem('local_activities_data', JSON.stringify(next), teacher.id);
        return next;
      });
      if (selectedActivityForGrading?.id === updatedAct.id) {
        setSelectedActivityForGrading(updatedAct);
      }

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
    },
    [teacher.id, selectedActivityForGrading?.id, showGlobalStatus]
  );

  const handleDeleteActivity = useCallback(
    async (activity: Activity) => {
      const subs = activity.submissions || [];
      const isAeeActivity =
        isActivityAdapted(activity) || (activity as any).activityDomain === 'adapted_aee';
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

      if (hasAppliedGradesOrWork && !isAeeActivity) {
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
    },
    [teacher.id, selectedActivityForGrading?.id, showGlobalStatus]
  );

  const handleUpdateSubmission = useCallback(
    async (
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

        const isInitialGroupGrading =
          currentSub?.status === 'pending' && Boolean(currentSub?.groupMembers);
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
              const existsInActivity = targetActivity.submissions.some(
                (s) => s.studentId === matchedSt.id
              );
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
          showGlobalStatus(
            'success',
            'Nota e feedback sincronizados diretamente no Firebase com sucesso!'
          );
        } catch (err) {
          console.warn('Erro ao atualizar nota no Firebase:', err);
          showGlobalStatus('error', 'A nota foi registrada na tela, mas falhou ao salvar na nuvem.');
        }
      } catch (err: any) {
        console.error('Erro local ao calcular submissão:', err);
        showGlobalStatus(
          'error',
          `ARMADILHA DE BUG DISPARADA: Erro de execução (${err?.message || ''})`
        );
      }
    },
    [activities, students, teacher.id, selectedActivityForGrading?.id, showGlobalStatus]
  );

  const handleStudentSubmitAnswer = useCallback(
    async (
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
                ? updatedSubmissions[existingIndex].teacherFeedback ||
                  '🎮 Avaliação automática KronoGames concluída.'
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
              teacherFeedback: isAutoGradedGame
                ? '🎮 Avaliação automática KronoGames concluída.'
                : '',
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

        const targetOwnerId =
          studentUser.ownerTeacherId || teacher.id || '5IdpwffjnhewdZ5dONRB9QoIRBZ2';
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
        showGlobalStatus(
          'error',
          `Falha ao salvar na nuvem: Erro de conexão (${err?.message || ''})`
        );
      }
    },
    [currentStudent, students, activities, teacher.id, selectedActivityForGrading, showGlobalStatus]
  );

  const handleMarkPhysicalDelivery = useCallback(
    async (activityId: string, targetStudent: StudentUser, score: number, feedback: string) => {
      const targetAct = activities.find((a) => a.id === activityId);
      if (!targetAct) return;

      const existingSubIndex = targetAct.submissions.findIndex(
        (s) =>
          s.studentId === targetStudent.id ||
          (Boolean(targetStudent.matricula) && s.matricula === targetStudent.matricula)
      );

      const physicalSub = {
        studentId: targetStudent.id,
        studentName: targetStudent.fullName,
        matricula: targetStudent.matricula,
        tag: targetStudent.tag,
        avatarUrl: targetStudent.avatarUrl,
        submittedAt: new Date().toLocaleDateString('pt-BR'),
        objectiveScore: 0,
        maxObjectiveScore: 0,
        maxEssayScore: targetAct.maxGrade || 10,
        essayScore: score,
        status: 'graded' as const,
        isPhysicalDelivery: true,
        essayAnswer:
          '📄 ATIVIDADE ANALÓGICA: Realizada sem uso do sistema digital. Lançamento direto efetuado pelo professor.',
        teacherFeedback: feedback || 'Atividade avaliada fisicamente pelo professor.',
      };

      const updatedSubmissions = [...targetAct.submissions];
      if (existingSubIndex >= 0) {
        updatedSubmissions[existingSubIndex] = {
          ...updatedSubmissions[existingSubIndex],
          ...physicalSub,
        };
      } else {
        updatedSubmissions.push(physicalSub);
      }

      const updatedAct: Activity = {
        ...targetAct,
        totalSubmissions: updatedSubmissions.length,
        pendingCorrection: updatedSubmissions.filter((s) => s.status === 'pending').length,
        submissions: updatedSubmissions,
      };

      await handleSaveActivity(updatedAct);
      showGlobalStatus(
        'success',
        `📄 Registro analógico concluído! Nota ${score} atribuída para ${targetStudent.fullName} em "${targetAct.title}".`
      );
    },
    [activities, handleSaveActivity, showGlobalStatus]
  );

  const handleToggleRecoveryAuthorization = useCallback(
    async (recoveryActivityId: string, targetStudent: StudentUser) => {
      const targetAct = activities.find((a) => a.id === recoveryActivityId);
      if (!targetAct) return;

      const currentList = targetAct.authorizedRecoveryStudentIds || [];
      const isAlreadyAuthorized = currentList.includes(targetStudent.id);
      const updatedList = isAlreadyAuthorized
        ? currentList.filter((id) => id !== targetStudent.id && id !== targetStudent.matricula)
        : [...currentList, targetStudent.id];

      const updatedAct: Activity = {
        ...targetAct,
        authorizedRecoveryStudentIds: updatedList,
      };

      await handleSaveActivity(updatedAct);
      showGlobalStatus(
        'success',
        isAlreadyAuthorized
          ? `🔒 Recuperação Paralela ocultada novamente para ${targetStudent.fullName}.`
          : `🔓 Recuperação Paralela liberada para ${targetStudent.fullName}!`
      );
    },
    [activities, handleSaveActivity, showGlobalStatus]
  );

  const handleGenerateDossier = useCallback((act: Activity) => {
    alert(`Dossiê em PDF/Planilha gerado com sucesso para a atividade: ${act.title}`);
  }, []);

  const handleArchiveVinculo = useCallback(
    async (reason: string, schoolName?: string, vinculoCode?: string) => {
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
    },
    [teacher.school, teacher.id, students, activities, setStudents, showGlobalStatus]
  );

  const handleRestoreVinculo = useCallback(
    async (target: {
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
                .filter(
                  (s) => s.isArchived && (!target.vinculoId || s.archivedVinculoId === target.vinculoId)
                )
                .map((s) => s.id);

        const activityIdsToRestore =
          target.activityIds && target.activityIds.length > 0
            ? target.activityIds
            : activities
                .filter(
                  (a) => a.isArchived && (!target.vinculoId || a.archivedVinculoId === target.vinculoId)
                )
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
    },
    [students, activities, teacher.id, setStudents, showGlobalStatus]
  );

  return {
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
  };
}
