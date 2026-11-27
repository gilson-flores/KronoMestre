'use client';

import React, { useMemo, useState } from 'react';
import { Users, Crown, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { ActivityGroup, StudentUser } from '@/lib/types';
import { isSameStudentTurma } from '@/lib/groupActivityUtils';

interface ActivityGroupManagerProps {
  students: StudentUser[];
  selectedTurmas: string[];
  groups: ActivityGroup[];
  onChange: (nextGroups: ActivityGroup[]) => void;
}

export const ActivityGroupManager: React.FC<ActivityGroupManagerProps> = ({
  students = [],
  selectedTurmas = [],
  groups = [],
  onChange,
}) => {
  const availableTurmas = useMemo(() => {
    if (selectedTurmas.length > 0) return selectedTurmas;
    const set = new Set<string>();
    students.forEach((s) => {
      if (!s.isArchived && s.turma) set.add(s.turma);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [selectedTurmas, students]);

  const [activeTurma, setActiveTurma] = useState<string>('');
  const resolvedTurma = availableTurmas.includes(activeTurma)
    ? activeTurma
    : availableTurmas[0] || '';

  const [newGroupName, setNewGroupName] = useState('');
  const [selectedNewMemberIds, setSelectedNewMemberIds] = useState<string[]>([]);
  const [selectedNewLeaderId, setSelectedNewLeaderId] = useState<string>('');

  const turmaStudents = useMemo(() => {
    if (!resolvedTurma) return [];
    return students
      .filter((s) => !s.isArchived && isSameStudentTurma(s.turma, resolvedTurma))
      .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'pt-BR'));
  }, [students, resolvedTurma]);

  const turmaGroups = useMemo(() => {
    if (!resolvedTurma) return groups;
    return groups.filter((g) => isSameStudentTurma(g.turma, resolvedTurma));
  }, [groups, resolvedTurma]);

  const assignedStudentIdsInTurma = useMemo(() => {
    const set = new Set<string>();
    turmaGroups.forEach((g) => {
      if (g.leaderId) set.add(g.leaderId);
      (g.memberIds || []).forEach((id) => set.add(id));
    });
    return set;
  }, [turmaGroups]);

  const unassignedStudents = useMemo(() => {
    return turmaStudents.filter((s) => !assignedStudentIdsInTurma.has(s.id));
  }, [turmaStudents, assignedStudentIdsInTurma]);

  const toggleNewMember = (studentId: string) => {
    setSelectedNewMemberIds((prev) => {
      const exists = prev.includes(studentId);
      const next = exists ? prev.filter((id) => id !== studentId) : [...prev, studentId];
      if (!exists && !selectedNewLeaderId) {
        setSelectedNewLeaderId(studentId);
      } else if (exists && selectedNewLeaderId === studentId) {
        setSelectedNewLeaderId(next[0] || '');
      }
      return next;
    });
  };

  const handleCreateGroup = () => {
    if (!resolvedTurma || selectedNewMemberIds.length === 0) return;
    const leaderId = selectedNewMemberIds.includes(selectedNewLeaderId)
      ? selectedNewLeaderId
      : selectedNewMemberIds[0];
    const groupNumber = turmaGroups.length + 1;
    const finalName = newGroupName.trim() || ('Grupo ' + groupNumber);

    const newGroup: ActivityGroup = {
      id: 'grp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: finalName,
      turma: resolvedTurma,
      leaderId,
      memberIds: Array.from(new Set([leaderId, ...selectedNewMemberIds])),
    };

    onChange([...groups, newGroup]);
    setNewGroupName('');
    setSelectedNewMemberIds([]);
    setSelectedNewLeaderId('');
  };

  const handleSetLeader = (groupId: string, newLeaderId: string) => {
    onChange(
      groups.map((g) =>
        g.id === groupId
          ? { ...g, leaderId: newLeaderId, memberIds: Array.from(new Set([newLeaderId, ...g.memberIds])) }
          : g
      )
    );
  };

  const handleRemoveMember = (groupId: string, memberId: string) => {
    const next = groups
      .map((g) => {
        if (g.id !== groupId) return g;
        const remaining = g.memberIds.filter((id) => id !== memberId);
        if (remaining.length === 0) return null;
        return {
          ...g,
          leaderId: g.leaderId === memberId ? remaining[0] : g.leaderId,
          memberIds: remaining,
        };
      })
      .filter(Boolean) as ActivityGroup[];
    onChange(next);
  };

  const handleAddMemberToExistingGroup = (groupId: string, studentId: string) => {
    if (!studentId) return;
    onChange(
      groups.map((g) =>
        g.id === groupId
          ? { ...g, memberIds: Array.from(new Set([...g.memberIds, studentId])) }
          : g
      )
    );
  };

  const handleDeleteGroup = (groupId: string) => {
    onChange(groups.filter((g) => g.id !== groupId));
  };

  const getStudentName = (id: string) =>
    students.find((s) => s.id === id)?.fullName || 'Aluno (' + id.slice(0, 6) + ')';

  if (availableTurmas.length === 0) {
    return (
      <div className="p-3.5 rounded-xl bg-background/60 border border-border text-xs text-muted">
        Selecione pelo menos uma turma acima para cadastrar os grupos e definir o Líder de cada equipe.
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-background/70 border border-emerald-500/30 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>Cadastro de Grupos & Líder (Governança do Professor)</span>
          </h4>
          <p className="text-[11px] text-muted mt-0.5">
            Somente o <strong>Líder (👑)</strong> poderá responder/enviar pela equipe. A nota lançada ao líder replica automaticamente para todo o grupo.
          </p>
        </div>

        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          {groups.length} grupo(s) cadastrado(s)
        </span>
      </div>

      {/* Seletor de Turma para montar os grupos */}
      {availableTurmas.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {availableTurmas.map((t) => {
            const count = groups.filter((g) => isSameStudentTurma(g.turma, t)).length;
            const isSel = t === resolvedTurma;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setActiveTurma(t);
                  setSelectedNewMemberIds([]);
                  setSelectedNewLeaderId('');
                }}
                className={
                  'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ' +
                  (isSel
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-surface border-border text-muted hover:text-foreground')
                }
              >
                Turma {t} {count > 0 ? '(' + count + ')' : ''}
              </button>
            );
          })}
        </div>
      )}

      {/* Formulário rápido para montar um novo grupo na turma selecionada */}
      <div className="p-3 rounded-xl bg-surface border border-border space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder={'Nome do grupo (ex: Grupo ' + (turmaGroups.length + 1) + ')'}
            className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            disabled={selectedNewMemberIds.length === 0}
            onClick={handleCreateGroup}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Salvar Grupo ({selectedNewMemberIds.length})</span>
          </button>
        </div>

        {unassignedStudents.length === 0 ? (
          <p className="text-[11px] text-emerald-400 font-semibold">
            ✓ Todos os alunos da Turma {resolvedTurma} já estão alocados em grupos.
          </p>
        ) : (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
              Clique nos alunos da Turma {resolvedTurma} para montar a equipe (clique na 👑 para escolher o Líder):
            </span>
            <div className="max-h-36 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
              {unassignedStudents.map((st) => {
                const isSelected = selectedNewMemberIds.includes(st.id);
                const isLeader = selectedNewLeaderId === st.id;
                return (
                  <div
                    key={st.id}
                    className={
                      'flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ' +
                      (isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-foreground font-semibold'
                        : 'bg-background border-border text-muted hover:text-foreground')
                    }
                  >
                    <button
                      type="button"
                      onClick={() => toggleNewMember(st.id)}
                      className="flex-1 text-left truncate cursor-pointer"
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {st.fullName}
                    </button>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={() => setSelectedNewLeaderId(st.id)}
                        title={isLeader ? 'Líder do grupo' : 'Definir como Líder'}
                        className={
                          'p-1 rounded-md cursor-pointer shrink-0 transition-colors ' +
                          (isLeader
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50'
                            : 'text-muted hover:text-amber-300')
                        }
                      >
                        <Crown className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Lista de grupos já cadastrados na turma selecionada */}
      {turmaGroups.length > 0 && (
        <div className="space-y-2">
          {turmaGroups.map((g) => (
            <div key={g.id} className="p-3 rounded-xl bg-surface border border-border space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-black text-foreground truncate">{g.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    Turma {g.turma}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteGroup(g.id)}
                  className="p-1 text-rose-400 hover:bg-rose-500/15 rounded-lg cursor-pointer"
                  title="Remover grupo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {g.memberIds.map((mId) => {
                  const isLeader = g.leaderId === mId;
                  return (
                    <span
                      key={mId}
                      className={
                        'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold border ' +
                        (isLeader
                          ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                          : 'bg-background border-border text-foreground')
                      }
                    >
                      <button
                        type="button"
                        onClick={() => handleSetLeader(g.id, mId)}
                        title={isLeader ? 'Líder atual' : 'Tornar Líder deste grupo'}
                        className={
                          'cursor-pointer ' +
                          (isLeader ? 'text-amber-300' : 'text-muted hover:text-amber-300')
                        }
                      >
                        <Crown className="w-3 h-3" />
                      </button>
                      <span>{getStudentName(mId)}</span>
                      {isLeader && (
                        <span className="text-[9px] font-black uppercase text-amber-300">Líder</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(g.id, mId)}
                        className="text-muted hover:text-rose-400 cursor-pointer ml-0.5"
                        title="Remover integrante"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>

              {unassignedStudents.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1">
                  <UserPlus className="w-3.5 h-3.5 text-muted shrink-0" />
                  <select
                    value=""
                    onChange={(e) => handleAddMemberToExistingGroup(g.id, e.target.value)}
                    className="bg-background border border-border rounded-lg px-2 py-1 text-[11px] text-foreground focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">+ Adicionar aluno disponível neste grupo...</option>
                    {unassignedStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
