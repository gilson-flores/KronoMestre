'use client';

import React from 'react';
import { TeacherUser } from '@/lib/types';
import { Trophy, AlertTriangle } from 'lucide-react';

interface TeacherSettingsViewProps {
  teacher: TeacherUser;
  setTeacher: React.Dispatch<React.SetStateAction<TeacherUser>>;
  teacherSaveStatus: { type: 'success' | 'error'; message: string } | null;
  setTeacherSaveStatus: React.Dispatch<
    React.SetStateAction<{ type: 'success' | 'error'; message: string } | null>
  >;
  newTeacherPassword: string;
  setNewTeacherPassword: React.Dispatch<React.SetStateAction<string>>;
  themeMode: 'dark' | 'light';
  setThemeMode: React.Dispatch<React.SetStateAction<'dark' | 'light'>>;
  inactivityTimeoutEnabled: boolean;
  setInactivityTimeoutEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  onDeleteAllStudents: () => void;
}

export const TeacherSettingsView: React.FC<TeacherSettingsViewProps> = ({
  teacher,
  setTeacher,
  teacherSaveStatus,
  setTeacherSaveStatus,
  newTeacherPassword,
  setNewTeacherPassword,
  themeMode,
  setThemeMode,
  inactivityTimeoutEnabled,
  setInactivityTimeoutEnabled,
  onDeleteAllStudents,
}) => {
  return (
    <div className="glass-panel p-8 rounded-3xl border border-border max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Configurações da Conta</h1>

      {teacherSaveStatus && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between transition-all ${
            teacherSaveStatus.type === 'success'
              ? 'bg-primary/20 text-primary border border-primary/40'
              : 'bg-rose-100 text-rose-600 border border-rose-200'
          }`}
        >
          <span>{teacherSaveStatus.message}</span>
          <button
            onClick={() => setTeacherSaveStatus(null)}
            className="text-foreground hover:opacity-80 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      <div className="space-y-4 text-xs">
        <div>
          <label className="block text-muted font-semibold mb-1">
            URL da Imagem de Perfil (Avatar)
          </label>
          <input
            type="text"
            value={teacher.avatarUrl}
            onChange={(e) => setTeacher({ ...teacher, avatarUrl: e.target.value })}
            className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-muted font-semibold mb-1">Nome do Professor</label>
          <input
            type="text"
            value={teacher.name}
            onChange={(e) => setTeacher({ ...teacher, name: e.target.value })}
            className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-muted font-semibold mb-1">Disciplina</label>
          <input
            type="text"
            value={teacher.subject}
            onChange={(e) => setTeacher({ ...teacher, subject: e.target.value })}
            className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-muted font-semibold mb-1">E-mail</label>
          <input
            type="email"
            value={teacher.email}
            onChange={(e) => setTeacher({ ...teacher, email: e.target.value })}
            className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-muted font-semibold mb-1">Telefone</label>
          <input
            type="text"
            value={teacher.phone || ''}
            onChange={(e) => setTeacher({ ...teacher, phone: e.target.value })}
            className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
            placeholder="(00) 00000-0000"
          />
        </div>
        <div>
          <label className="block text-muted font-semibold mb-1">Escola / Instituição</label>
          <input
            type="text"
            value={teacher.school || ''}
            onChange={(e) => setTeacher({ ...teacher, school: e.target.value })}
            className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-muted font-semibold mb-1">
            Matrícula Funcional / Vínculo
          </label>
          <input
            type="text"
            value={teacher.matriculaFuncional || ''}
            onChange={(e) => setTeacher({ ...teacher, matriculaFuncional: e.target.value })}
            className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
            placeholder="Ex: 654.982-1"
          />
        </div>

        <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl relative overflow-hidden">
          <label className="block text-primary font-bold mb-1">
            CÓDIGO DE ACESSO DOS ALUNOS
          </label>
          <p className="text-[11px] text-muted mb-3 max-w-[90%]">
            Este é o código exclusivo do seu ambiente (Tenant). Forneça este código aos seus alunos.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              readOnly
              value={teacher.tenantCode || ''}
              className="w-40 bg-background/50 border border-primary/40 rounded-xl px-4 py-3 text-foreground font-mono text-lg font-bold tracking-widest text-center"
              placeholder="----"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-background border border-border">
          <div>
            <label className="block text-muted font-semibold mb-1">
              Início da Vigência do Contrato
            </label>
            <input
              type="date"
              value={teacher.contractStartDate || ''}
              onChange={(e) => setTeacher({ ...teacher, contractStartDate: e.target.value })}
              className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-muted font-semibold mb-1">
              Término / Encerramento do Contrato
            </label>
            <input
              type="date"
              value={teacher.contractEndDate || ''}
              onChange={(e) => setTeacher({ ...teacher, contractEndDate: e.target.value })}
              className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-muted font-semibold mb-1">
              Tipo de Vínculo Contratual
            </label>
            <select
              value={teacher.contractType || 'ACT / Contratado'}
              onChange={(e) => setTeacher({ ...teacher, contractType: e.target.value })}
              className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ACT / Contratado">ACT / Admitido em Caráter Temporário</option>
              <option value="Efetivo">Professor Efetivo / Concursado</option>
              <option value="Substituto">Professor Substituto</option>
              <option value="Outro">Outro Vínculo</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-muted font-semibold mb-1">Nova Senha de Acesso</label>
          <input
            type="password"
            value={newTeacherPassword}
            onChange={(e) => setNewTeacherPassword(e.target.value)}
            className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
            placeholder="Deixe em branco para não alterar"
          />
        </div>

        <div className="pt-4 border-t border-border space-y-2">
          <h3 className="text-sm font-bold text-foreground">Aparência e Contraste Visual</h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface rounded-2xl border border-border gap-3">
            <div>
              <p className="text-xs font-bold text-foreground">Modo de Cor da Plataforma</p>
              <p className="text-[11px] text-muted mt-0.5">
                Escolha entre o tema escuro de alto contraste ou o tema claro.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-primary text-white border border-primary'
                    : 'bg-surface-hover text-muted border border-border'
                }`}
              >
                🌙 Tema Escuro
              </button>
              <button
                type="button"
                onClick={() => setThemeMode('light')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  themeMode === 'light'
                    ? 'bg-primary text-white border border-primary'
                    : 'bg-surface-hover text-muted border border-border'
                }`}
              >
                ☀️ Tema Claro
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border space-y-2">
          <h3 className="text-sm font-bold text-foreground">Segurança da Sessão</h3>
          <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-border">
            <div>
              <p className="text-xs font-bold text-foreground">
                Deslogar por 8 minutos de inatividade
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                Encerra a sessão automaticamente após 8 minutos sem interação.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                checked={inactivityTimeoutEnabled}
                onChange={(e) => {
                  const val = e.target.checked;
                  setInactivityTimeoutEnabled(val);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('inactivity_timeout_enabled', String(val));
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-border space-y-2">
          <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span>Modo Platina (Gamificação Trimestral)</span>
          </h3>
          <div className="flex items-center justify-between p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20">
            <div>
              <p className="text-xs font-bold text-amber-500">Ativar Modo Platina para os Alunos</p>
              <p className="text-[11px] text-amber-500/80 mt-0.5 max-w-md">
                Habilita as missões trimestrais de bonificação por conclusão de AVs e RPs.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                checked={teacher.isPlatinumModeEnabled ?? true}
                onChange={(e) => setTeacher({ ...teacher, isPlatinumModeEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-border space-y-2">
          <h3 className="text-sm font-bold text-rose-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Zona de Perigo (Ações Irreversíveis)</span>
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-rose-500/5 rounded-2xl border border-rose-500/20 gap-3">
            <div>
              <p className="text-xs font-bold text-rose-500">Excluir Todos os Alunos Ativos</p>
              <p className="text-[11px] text-rose-400/80 mt-0.5 max-w-sm">
                Zera a base de alunos para nova importação limpa via CSV.
              </p>
            </div>
            <button
              type="button"
              onClick={onDeleteAllStudents}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
            >
              🗑️ Excluir Todos
            </button>
          </div>
        </div>

        <button
          onClick={async () => {
            try {
              const resFirestore = await fetch('/api/teacher/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  profile: {
                    name: teacher.name,
                    subject: teacher.subject,
                    email: teacher.email,
                    avatarUrl: teacher.avatarUrl,
                    phone: teacher.phone || '',
                    school: teacher.school || '',
                    driveFolderUrl: teacher.driveFolderUrl || '',
                    matriculaFuncional: teacher.matriculaFuncional || '',
                    contractStartDate: teacher.contractStartDate || '',
                    contractEndDate: teacher.contractEndDate || '',
                    contractType: teacher.contractType || 'ACT / Contratado',
                    contractStatus: teacher.contractStatus || 'ativo',
                    tenantCode: teacher.tenantCode || '',
                    escolas_vinculadas: teacher.escolas_vinculadas || [],
                    disciplinas: teacher.disciplinas || [],
                    isPlatinumModeEnabled: teacher.isPlatinumModeEnabled ?? true,
                  },
                }),
              });
              if (!resFirestore.ok) throw new Error('Falha ao salvar no Firestore');
              setTeacherSaveStatus({
                type: 'success',
                message: 'Perfil salvo com sucesso no Firestore (KronoMestre)!',
              });
              setTimeout(() => setTeacherSaveStatus(null), 5000);
            } catch (err: any) {
              setTeacherSaveStatus({
                type: 'error',
                message: `Erro ao salvar: ${err.message || String(err)}`,
              });
            }
          }}
          className="py-3 px-6 bg-primary text-white font-bold rounded-full cursor-pointer hover:bg-[#6bfb9a] transition-all"
        >
          Salvar Alterações
        </button>
      </div>
    </div>
  );
};
