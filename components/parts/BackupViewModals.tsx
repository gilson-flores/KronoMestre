'use client';

import React, { useState, useMemo } from 'react';
import {
  Database,
  Download,
  AlertTriangle,
  ShieldCheck,
  Archive,
  CheckCircle2,
  X,
  Layers,
  Search,
  Calendar,
  Eye,
  FileText,
  User,
  RotateCcw,
  BookOpen,
  Clock,
  Award,
  GraduationCap,
  Building2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FolderArchive,
  Check,
} from 'lucide-react';
import { Activity, StudentUser, TeacherUser, ArchivedVinculo } from '@/lib/types';
import { scrollToTop } from '@/lib/utils';

export const BackupViewModals: React.FC<any> = (props) => {
  const { activeStudentsCount, activeActivitiesCount, nextVinculoCodePreview, formatDateTime, formatDateOnly, studentArchivedSubmissions, handleCloseArchiveModal, handleConfirmArchive, handleCloseRestoreModal, handleConfirmRestore, isArchiveModalOpen, archiveSchool, setArchiveSchool, archiveReason, setArchiveReason, confirmWord, setConfirmWord, isSubmittingArchive, vinculoToRestore, isSubmittingRestore, viewingArchivedStudent, setViewingArchivedStudent, viewingArchivedActivity, setViewingArchivedActivity } = props;
  return (
    <>
      {/* MODAL: RESTAURAÇÃO SEGURA DO VÍNCULO */}
      {vinculoToRestore && (
        <div
          id="modal-restore-vinculo-overlay"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
        >
          <div
            id="modal-restore-vinculo-content"
            className="bg-surface border border-border rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative"
          >
            {/* CABEÇALHO */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Restaurar Vínculo Docente</h3>
                  <p className="text-xs text-text-muted mt-0.5">Reativação completa de dados</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseRestoreModal}
                disabled={isSubmittingRestore}
                className="p-2 text-text-muted hover:text-foreground rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DETALHES DO VÍNCULO A SER RESTAURADO */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-foreground space-y-2 text-sm leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>{vinculoToRestore.vinculoCode} • {vinculoToRestore.school}</span>
              </div>
              <p className="text-xs text-text-muted">
                Esta ação reativará <strong className="text-foreground">{vinculoToRestore.totalStudents} alunos</strong> e{' '}
                <strong className="text-foreground">{vinculoToRestore.totalActivities} atividades</strong> deste vínculo histórico, disponibilizando-os imediatamente nas suas turmas ativas.
              </p>
              {vinculoToRestore.turmas.length > 0 && (
                <div className="text-xs text-text-muted">
                  Turmas que serão reativadas: <strong className="text-foreground">{vinculoToRestore.turmas.join(', ')}</strong>
                </div>
              )}
            </div>

            {/* AVISO DE SEGURANÇA */}
            <div className="p-3 rounded-xl bg-background border border-border text-xs text-text-muted space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Integridade Preservada
              </div>
              <p>
                Todas as notas, submissões e anotações pedagógicas registradas neste vínculo continuam 100% preservadas.
              </p>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-end">
              <button
                type="button"
                onClick={handleCloseRestoreModal}
                disabled={isSubmittingRestore}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-border hover:bg-surface-hover text-foreground font-semibold text-sm transition-colors cursor-pointer min-h-[44px]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isSubmittingRestore}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                {isSubmittingRestore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Restaurando vínculo...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirmar Restauração</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CONSULTA DE ALUNO ARQUIVADO (MODO SOMENTE LEITURA E AUDITORIA) */}
      {viewingArchivedStudent && (
        <div
          id="modal-view-archived-student-overlay"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
        >
          <div
            id="modal-view-archived-student-content"
            className="bg-surface border border-border rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8"
          >
            {/* CABEÇALHO */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Archive className="w-3 h-3" /> Arquivado (Somente Leitura)
                  </span>
                  <span className="text-xs text-text-muted">
                    Arquivado em: {formatDateTime(viewingArchivedStudent.archivedAt)}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground mt-1">
                  {viewingArchivedStudent.fullName}
                </h3>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>Turma: <strong>{viewingArchivedStudent.turma}</strong></span>
                  <span>•</span>
                  <span>Matrícula: <strong>{viewingArchivedStudent.matricula}</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingArchivedStudent(null)}
                className="p-2 text-text-muted hover:text-foreground rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DADOS DE CONTEXTO DO ARQUIVAMENTO */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground space-y-1.5">
              <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Registro Histórico Preservado
              </div>
              <p className="text-text-muted">
                Motivo registrado: <strong className="text-foreground">{viewingArchivedStudent.archivedReason || 'Troca de vínculo'}</strong>
              </p>
              {viewingArchivedStudent.secondTeacherName && (
                <p className="text-text-muted">
                  2º Professor vinculado no período: <strong className="text-foreground">{viewingArchivedStudent.secondTeacherName}</strong>
                </p>
              )}
            </div>

            {/* NOTAS PEDAGÓGICAS (SE HOUVER) */}
            {viewingArchivedStudent.pedagogicalNotes && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Anotações Pedagógicas Registradas:
                </h4>
                <div className="p-4 rounded-2xl bg-background border border-border text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {viewingArchivedStudent.pedagogicalNotes}
                </div>
              </div>
            )}

            {/* HISTÓRICO DE SUBMISSÕES E NOTAS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Histórico de Atividades e Avaliações:
                </h4>
                <span className="text-xs text-text-muted font-medium">
                  {studentArchivedSubmissions.length} registro(s)
                </span>
              </div>

              {studentArchivedSubmissions.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-background border border-border text-xs text-text-muted">
                  Nenhuma entrega ou nota registrada para este aluno nas atividades disponíveis.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {studentArchivedSubmissions.map(({ activity, submission }: any, idx: any) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground">{activity.title}</div>
                        <div className="text-[11px] text-text-muted">
                          Prazo: {formatDateOnly(activity.dueDate || activity.deadline)} • Tipo: {activity.type}
                        </div>
                        {submission.teacherFeedback && (
                          <div className="text-[11px] text-primary mt-1 italic">
                            &quot;{submission.teacherFeedback}&quot;
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <div className="font-bold text-foreground text-sm flex items-center gap-1 justify-end">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>
                            {typeof submission.essayScore === 'number'
                              ? (submission.objectiveScore || 0) + submission.essayScore
                              : submission.objectiveScore ?? '-'}
                            {' / '}
                            {(activity.maxGrade || 10).toFixed(1)}
                          </span>
                        </div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            submission.status === 'graded'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {submission.status === 'graded' ? 'Nota Atribuída' : 'Submetido'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BOTÃO DE FECHAR */}
            <div className="pt-3 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setViewingArchivedStudent(null)}
                className="px-6 py-2.5 rounded-xl bg-surface hover:bg-surface-hover text-foreground font-semibold text-xs border border-border transition-colors cursor-pointer min-h-[40px]"
              >
                Fechar Consulta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONSULTA DE ATIVIDADE ARQUIVADA (MODO SOMENTE LEITURA E AUDITORIA) */}
      {viewingArchivedActivity && (
        <div
          id="modal-view-archived-activity-overlay"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
        >
          <div
            id="modal-view-archived-activity-content"
            className="bg-surface border border-border rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8"
          >
            {/* CABEÇALHO */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Archive className="w-3 h-3" /> Arquivado (Somente Leitura)
                  </span>
                  <span className="text-xs text-text-muted">
                    Arquivado em: {formatDateTime(viewingArchivedActivity.archivedAt)}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground mt-1">
                  {viewingArchivedActivity.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>Turma: <strong>{viewingArchivedActivity.turma}</strong></span>
                  <span>•</span>
                  <span>Tipo: <strong>{viewingArchivedActivity.type}</strong></span>
                  <span>•</span>
                  <span>Disciplina: <strong>{viewingArchivedActivity.subject || 'Geral'}</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingArchivedActivity(null)}
                className="p-2 text-text-muted hover:text-foreground rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DADOS DE CONTEXTO */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground space-y-1.5">
              <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Atividade Histórica Preservada
              </div>
              <p className="text-text-muted">
                Motivo do arquivamento: <strong className="text-foreground">{viewingArchivedActivity.archivedReason || 'Troca de vínculo'}</strong>
              </p>
              <p className="text-text-muted">
                Nota Máxima: <strong className="text-foreground">{(viewingArchivedActivity.maxGrade || 10).toFixed(1)}</strong>
              </p>
            </div>

            {/* DESCRIÇÃO DA ATIVIDADE */}
            {viewingArchivedActivity.description && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Descrição e Instruções:
                </h4>
                <div className="p-4 rounded-2xl bg-background border border-border text-xs text-foreground leading-relaxed">
                  {viewingArchivedActivity.description}
                </div>
              </div>
            )}

            {/* QUESTÕES REGISTRADAS */}
            {viewingArchivedActivity.questions && viewingArchivedActivity.questions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Enunciados das Questões ({viewingArchivedActivity.questions.length}):
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {viewingArchivedActivity.questions.map((q: any, qIndex: any) => (
                    <div key={q.id || qIndex} className="p-3.5 rounded-xl bg-background border border-border text-xs space-y-1.5">
                      <div className="font-bold text-foreground">
                        Questão {qIndex + 1} ({q.type === 'multiple_choice' ? 'Múltipla Escolha' : 'Dissertativa'}):
                      </div>
                      <p className="text-text-muted">{q.statement}</p>
                      {q.type === 'multiple_choice' && (
                        <div className="pl-2 space-y-0.5 text-[11px] text-text-muted">
                          {q.options.map((opt: any, optIdx: any) => (
                            <div key={optIdx} className={optIdx === q.correctOptionIndex ? 'font-bold text-emerald-400' : ''}>
                              {String.fromCharCode(65 + optIdx)}) {opt} {optIdx === q.correctOptionIndex && '✓'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ENTREGAS / SUBMISSÕES */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Submissões e Avaliações de Alunos ({viewingArchivedActivity.submissions?.length || 0}):
                </h4>
              </div>

              {!viewingArchivedActivity.submissions || viewingArchivedActivity.submissions.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-background border border-border text-xs text-text-muted">
                  Nenhuma submissão registrada para esta atividade.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {viewingArchivedActivity.submissions.map((sub: any, sIdx: any) => (
                    <div
                      key={sIdx}
                      className="p-3 rounded-xl bg-background border border-border flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{sub.studentName}</div>
                        <div className="text-[11px] text-text-muted">Matrícula: {sub.matricula}</div>
                        {sub.teacherFeedback && (
                          <div className="text-[11px] text-primary mt-0.5 italic">
                            &quot;{sub.teacherFeedback}&quot;
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-foreground">
                          Nota:{' '}
                          {typeof sub.essayScore === 'number'
                            ? (sub.objectiveScore || 0) + sub.essayScore
                            : sub.objectiveScore ?? '-'}
                        </div>
                        <span className="text-[10px] text-text-muted uppercase font-bold">
                          {sub.status === 'graded' ? 'Concluída' : sub.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BOTÃO DE FECHAR */}
            <div className="pt-3 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setViewingArchivedActivity(null)}
                className="px-6 py-2.5 rounded-xl bg-surface hover:bg-surface-hover text-foreground font-semibold text-xs border border-border transition-colors cursor-pointer min-h-[40px]"
              >
                Fechar Consulta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE ARQUIVAMENTO */}
      {isArchiveModalOpen && (
        <div
          id="modal-archive-vinculo-overlay"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
        >
          <div
            id="modal-archive-vinculo-content"
            className="bg-surface border border-border rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative"
          >
            {/* CABEÇALHO DO MODAL */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Arquivar Vínculo Atual</h3>
                  <p className="text-xs text-text-muted mt-0.5">Encerramento de ciclo e vinculação por Escola e Mês/Ano</p>
                </div>
              </div>

              <button
                id="btn-close-archive-modal"
                onClick={handleCloseArchiveModal}
                disabled={isSubmittingArchive}
                className="p-2 text-text-muted hover:text-foreground rounded-xl hover:bg-surface-hover transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AVISO EM LINGUAGEM CLARA */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-foreground space-y-2 text-sm leading-relaxed">
              <p className="font-semibold text-amber-400">
                Isso vai arquivar {activeStudentsCount} alunos e {activeActivitiesCount} atividades sob o identificador <span className="underline font-black">{nextVinculoCodePreview}</span>.
              </p>
              <p className="text-xs text-text-muted">
                Os dados deixam de aparecer nas turmas ativas, mas ficam salvos permanentemente e podem ser restaurados a qualquer momento quando você voltar a lecionar nesta escola.
              </p>
            </div>

            {/* FORMULÁRIO DE ARQUIVAMENTO */}
            <div className="space-y-4">
              {/* CAMPO 1: ESCOLA DO VÍNCULO */}
              <div>
                <label
                  htmlFor="archive-school-input"
                  className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2"
                >
                  Escola de Vinculação:
                </label>
                <input
                  id="archive-school-input"
                  type="text"
                  value={archiveSchool}
                  onChange={(e: any) => setArchiveSchool(e.target.value)}
                  disabled={isSubmittingArchive}
                  placeholder="Nome da escola (ex: E.E.B. Professor...)"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* IDENTIFICADOR AUTOMÁTICO DO VÍNCULO */}
              <div className="p-3 rounded-xl bg-background border border-border flex items-center justify-between text-xs">
                <span className="text-text-muted font-medium">Identificador gerado (Mês/Ano):</span>
                <span className="font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  {nextVinculoCodePreview}
                </span>
              </div>

              {/* CAMPO 2: MOTIVO DO ARQUIVAMENTO */}
              <div>
                <label
                  htmlFor="archive-reason-input"
                  className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2"
                >
                  Motivo do encerramento:
                </label>
                <input
                  id="archive-reason-input"
                  type="text"
                  value={archiveReason}
                  onChange={(e: any) => setArchiveReason(e.target.value)}
                  disabled={isSubmittingArchive}
                  placeholder="Ex.: Troca de vínculo ACT, Fim de Contrato, Fim do Ano Letivo..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* CAMPO 3: PALAVRA DE CONFIRMAÇÃO */}
              <div>
                <label
                  htmlFor="archive-confirm-word-input"
                  className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2"
                >
                  Digite <span className="text-amber-400 font-black underline">ARQUIVAR</span> para confirmar:
                </label>
                <input
                  id="archive-confirm-word-input"
                  type="text"
                  value={confirmWord}
                  onChange={(e: any) => setConfirmWord(e.target.value)}
                  disabled={isSubmittingArchive}
                  placeholder="Digite ARQUIVAR"
                  autoComplete="off"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono tracking-wider text-foreground uppercase placeholder:normal-case placeholder:font-sans focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-end">
              <button
                id="btn-cancel-archive"
                type="button"
                onClick={handleCloseArchiveModal}
                disabled={isSubmittingArchive}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-border hover:bg-surface-hover text-foreground font-semibold text-sm transition-colors cursor-pointer min-h-[44px]"
              >
                Cancelar
              </button>

              <button
                id="btn-confirm-archive-action"
                type="button"
                onClick={handleConfirmArchive}
                disabled={confirmWord.trim().toUpperCase() !== 'ARQUIVAR' || isSubmittingArchive}
                className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                {isSubmittingArchive ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Arquivando vínculo...</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    <span>Confirmar Arquivamento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};
