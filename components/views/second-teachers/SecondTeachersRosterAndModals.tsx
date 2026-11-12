'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  HeartHandshake,
  UserPlus, Users,
  Trash2,
  ShieldCheck,
  Mail,
  Phone,
  BookOpen,
  School,
  Smartphone,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  PenTool,
  Gamepad2,
  Star,
  Check,
  HelpCircle,
  ArrowLeft,
  GraduationCap,
  KeyRound,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  ChevronRight,
  Info,
  MessageSquare,
  Pencil,
  Loader2
} from 'lucide-react';
import { hashPassword } from '@/lib/crypto';
import {
  TeacherUser,
  StudentUser,
  Activity,
  UserRole,
  ActivityQuestion,
  MultipleChoiceQuestion,
  EssayQuestion,
  ChatMessage
} from '@/lib/types';
import { NewSecondTeacherModal } from '@/components/modals/NewSecondTeacherModal';
import { EditSecondTeacherModal } from '@/components/modals/EditSecondTeacherModal';
import { ManageTutelageModal } from '@/components/modals/ManageTutelageModal';
import { SecondTeacherMessagesModal } from '@/components/modals/SecondTeacherMessagesModal';
import { ResetPasswordByTeacherModal } from '@/components/modals/ResetPasswordByTeacherModal';
import {
  canStudentAccessActivity,
  getActivityGradeDistribution,
  isStudentPNE
} from '@/lib/studentUtils';
import { extractCleanHtml } from '@/lib/adaptationUtils';
import { scrollToTop } from '@/lib/utils';
import { getScopedLocalStorageItem, setScopedLocalStorageItem } from '@/lib/cacheUtils';

export const SecondTeachersRosterAndModals: React.FC<any> = (props) => {
  const { activeTab, changePasswordConfirmPass, changePasswordLoading, changePasswordMsg, changePasswordNewPass, fetchSecondTeachers, handleChangePassword, handleDelete, handleResetTeacherPassword, handleSaveTutelage, isChangePasswordOpen, isDeleting, isLoadingTeachers, isNewModalOpen, isSecondTeacher, onSimulateSecondTeacher, resetRequests, secondTeachers, setChangePasswordConfirmPass, setChangePasswordNewPass, setHistoryModalTeacher, setIsChangePasswordOpen, setIsNewModalOpen, setSuccessMsg, setTeacherToDelete, setTeacherToEdit, setTeacherToResetPassword, setTutelageModalTeacher, students, teacher, teacherToDelete, teacherToEdit, teacherToResetPassword, tutelageModalTeacher } = props;
  return (
    <>
      {/* TAB 2: CADASTRO DE 2º PROFESSORES (REGENTE / ADMIN) */}
      {activeTab === 'professores_apoio' && !isSecondTeacher && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Professores de Apoio (AEE) Cadastrados</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoadingTeachers ? (
              <div className="col-span-full py-8 text-center text-muted">Carregando profissionais...</div>
            ) : secondTeachers.length === 0 ? (
              <div className="col-span-full glass-panel p-8 rounded-3xl border border-border text-center flex flex-col items-center justify-center">
                <HeartHandshake className="w-8 h-8 text-amber-400 mb-2" />
                <h3 className="text-base font-bold text-foreground mb-1">Nenhum 2º Professor Cadastrado</h3>
                <p className="text-xs text-muted max-w-md mx-auto mb-4">
                  Cadastre profissionais de Atendimento Educacional Especializado (AEE) para auxiliarem no acompanhamento de alunos de inclusão.
                </p>
                <button
                  onClick={() => setIsNewModalOpen(true)}
                  className="py-2 px-5 bg-amber-400 text-black font-bold rounded-xl text-xs cursor-pointer shadow"
                >
                  Cadastrar Agora
                </button>
              </div>
            ) : (
              secondTeachers.map((st: any) => {
                const isPendingReset =
                  st.email && resetRequests.some((e: any) => e.toLowerCase() === st.email?.toLowerCase());

                return (
                  <div
                    key={st.id}
                    className="glass-panel p-4 rounded-3xl border border-border bg-surface flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={st.avatarUrl}
                          alt={st.name}
                          loading="lazy"
                          decoding="async"
                          className="w-10 h-10 rounded-full object-cover border border-amber-400"
                        />
                        <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full text-[9px] font-bold border border-amber-500/20">
                          <ShieldCheck className="w-3 h-3" /> AEE
                        </span>
                      </div>
                      <h3 className="font-bold text-foreground text-sm mb-1 truncate">{st.name}</h3>

                      {isPendingReset && (
                        <div className="mt-1 text-[10px] font-bold text-amber-600 bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg flex items-center gap-1">
                          <KeyRound className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Solicitação de Redefinição de Senha</span>
                        </div>
                      )}

                      <div className="space-y-1 mt-3 text-xs text-muted">
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{st.email}</span>
                        </div>
                        {st.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span>{st.phone}</span>
                          </div>
                        )}
                        {st.subject && (
                          <div className="flex items-center gap-1.5 truncate">
                            <BookOpen className="w-3 h-3 shrink-0" />
                            <span className="truncate">{st.subject}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      <button
                        onClick={() => setTutelageModalTeacher(st)}
                        className="w-full py-1.5 px-3 bg-amber-400 hover:bg-amber-300 border-none text-black shadow-md rounded-xl text-xs font-bold transition-all cursor-pointer flex justify-center items-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>
                          Gerenciar Tutela (
                          {students.filter((s: any) => 
                            (s.secondTeacherId && s.secondTeacherId === st.id) || 
                            (s.secondTeacherName && s.secondTeacherName.toLowerCase() === st.name?.toLowerCase())
                          ).length} alunos)
                        </span>
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-1.5">
                      {(teacher.is_admin || teacher.isAdmin) && onSimulateSecondTeacher && (
                        <button
                          onClick={() => onSimulateSecondTeacher(st)}
                          className="py-1.5 px-2.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30 shadow-sm cursor-pointer"
                          title="Simular ambiente do 2º Professor (Admin Supremo)"
                        >
                          <Smartphone className="w-3 h-3" />
                          <span>Simular</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleResetTeacherPassword(st)}
                        className="py-1.5 px-2.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 bg-primary hover:bg-primary/90 text-white border-none shadow-sm cursor-pointer"
                        title="Redefinir Senha do 2º Professor"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Resetar</span>
                      </button>

                      <button
                        onClick={() => setTeacherToEdit(st)}
                        className="py-1.5 px-2.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 bg-surface border-border hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 cursor-pointer shadow-sm"
                        title="Editar Informações do 2º Professor"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => setHistoryModalTeacher(st)}
                        className="p-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 bg-surface border-border hover:bg-surface-hover text-foreground cursor-pointer shadow-sm"
                        title="Ver Histórico de Conversas"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setTeacherToDelete(st)}
                        className="p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl transition-all cursor-pointer border border-rose-500/20 bg-rose-500/5"
                        title="Excluir 2º Professor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal Novo 2º Professor */}
      <NewSecondTeacherModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        defaultSchool={teacher.school}
        onCreateSecondTeacher={() => {
          scrollToTop();
          setSuccessMsg('Professor cadastrado com sucesso!');
          fetchSecondTeachers();
          setTimeout(() => setSuccessMsg(''), 3000);
        }}
      />

      {/* Modal Trocar Senha */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-panel w-full max-w-md p-5 sm:p-6 rounded-3xl border border-border space-y-4 bg-surface shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <KeyRound className="w-4 h-4" />
                <span>Trocar Minha Senha de Acesso</span>
              </div>
              <button
                onClick={() => setIsChangePasswordOpen(false)}
                className="text-muted hover:text-foreground p-1 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {changePasswordMsg && (
              <div
                className={`p-3 rounded-2xl text-xs font-semibold ${
                  changePasswordMsg.type === 'success'
                    ? 'bg-emerald-100 border border-emerald-200 text-emerald-600'
                    : 'bg-rose-100 border border-rose-200 text-rose-600'
                }`}
              >
                {changePasswordMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-muted font-semibold mb-1">E-mail Cadastrado</label>
                <input
                  type="email"
                  disabled
                  value={teacher.email || ''}
                  className="w-full bg-surface/60 border border-border rounded-2xl px-4 py-2.5 text-foreground/70 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-muted font-semibold mb-1">Nova Senha (Mínimo 4 caracteres)</label>
                <input
                  type="password"
                  required
                  value={changePasswordNewPass}
                  onChange={(e: any) => setChangePasswordNewPass(e.target.value)}
                  className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-foreground focus:outline-none focus:border-amber-400"
                  placeholder="Digite sua nova senha"
                />
              </div>

              <div>
                <label className="block text-muted font-semibold mb-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  required
                  value={changePasswordConfirmPass}
                  onChange={(e: any) => setChangePasswordConfirmPass(e.target.value)}
                  className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-foreground focus:outline-none focus:border-amber-400"
                  placeholder="Repita a nova senha"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="flex-1 py-2.5 bg-surface hover:bg-[#1a243b] text-muted font-bold rounded-2xl border border-border transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={changePasswordLoading}
                  className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-2xl transition-all shadow-md cursor-pointer"
                >
                  {changePasswordLoading ? 'Salvando...' : 'Atualizar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-border rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-rose-500/10 rounded-full border border-rose-500/20 text-rose-500">
                <Trash2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Remover Acesso</h3>
                <p className="text-sm text-text-muted mt-2">
                  Deseja realmente remover o acesso de <strong className="text-foreground">{teacherToDelete.name}</strong>?
                  Esse professor não poderá mais visualizar ou corrigir as atividades dos alunos PNE sob sua tutela.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                disabled={isDeleting}
                onClick={() => {
                  handleDelete(teacherToDelete);
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors cursor-pointer min-h-[44px] flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Removendo...</span>
                  </>
                ) : (
                  <span>Sim, Remover Acesso</span>
                )}
              </button>
              <button
                disabled={isDeleting}
                onClick={() => setTeacherToDelete(null)}
                className="w-full py-3 bg-transparent border border-border hover:bg-surface-hover text-foreground font-bold rounded-xl transition-colors cursor-pointer min-h-[44px]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de 2º Professor */}
      {teacherToEdit && (
        <EditSecondTeacherModal
          isOpen={Boolean(teacherToEdit)}
          onClose={() => setTeacherToEdit(null)}
          teacherToEdit={teacherToEdit}
          onSaveTeacher={(updatedTeacher: any) => {
            scrollToTop();
            setSuccessMsg(`Professor ${updatedTeacher.name} atualizado com sucesso!`);
            fetchSecondTeachers();
            setTimeout(() => setSuccessMsg(''), 4000);
          }}
        />
      )}

      {/* Modal de Gestão de Tutela */}
      {tutelageModalTeacher && (
        <ManageTutelageModal
          isOpen={true}
          onClose={() => setTutelageModalTeacher(null)}
          secondTeacher={tutelageModalTeacher}
          allStudents={students}
          onSaveTutelage={handleSaveTutelage}
        />
      )}

      {/* Modal Redefinir Senha do 2º Professor com Bcrypt e Flag Obrigatório */}
      {teacherToResetPassword && (
        <ResetPasswordByTeacherModal
          isOpen={Boolean(teacherToResetPassword)}
          onClose={() => setTeacherToResetPassword(null)}
          targetType="second_teacher"
          targetId={teacherToResetPassword.id}
          targetName={teacherToResetPassword.name}
          targetDetail={teacherToResetPassword.email}
          onSuccess={(msg: any) => {
            setSuccessMsg(msg);
            fetchSecondTeachers();
            setTimeout(() => setSuccessMsg(''), 4000);
          }}
        />
      )}
    </>
  );
};
