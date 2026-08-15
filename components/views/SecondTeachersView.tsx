import React, { useState, useEffect } from 'react';
import { HeartHandshake, UserPlus, Trash2, ShieldCheck, Mail, Phone, BookOpen, School } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TeacherUser } from '@/lib/types';
import { NewSecondTeacherModal } from '@/components/modals/NewSecondTeacherModal';

interface SecondTeachersViewProps {
  teacher: TeacherUser;
}

export const SecondTeachersView: React.FC<SecondTeachersViewProps> = ({ teacher }) => {
  const [secondTeachers, setSecondTeachers] = useState<TeacherUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchSecondTeachers = async () => {
    setIsLoading(true);
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('second_teachers')
        .select('*')
        .order('name');
        
      if (error) {
        console.error('Erro ao buscar 2º professores:', error);
        setErrorMsg('Erro ao carregar lista de professores de apoio.');
      } else if (data) {
        const formatted: TeacherUser[] = data.map(d => ({
          id: d.id,
          name: d.name,
          email: d.email,
          subject: d.subject || 'AEE / Inclusão Escolar',
          avatarUrl: d.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
          phone: d.phone || '',
          school: d.school || ''
        }));
        setSecondTeachers(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSecondTeachers();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o acesso de ${name}?`)) return;
    
    if (!supabase) return;
    
    try {
      const { error } = await supabase
        .from('second_teachers')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccessMsg(`Professor ${name} removido com sucesso.`);
      fetchSecondTeachers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao remover professor: ' + err.message);
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-400 tracking-widest uppercase flex items-center gap-1.5">
            <HeartHandshake className="w-4 h-4" />
            Inclusão e AEE
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-1">
            2º Professores
          </h1>
        </div>
        
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="py-3 px-6 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer text-sm"
        >
          <UserPlus className="w-5 h-5 stroke-[2.5]" />
          <span>Cadastrar 2º Professor</span>
        </button>
      </div>
      
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-sm font-medium">
          {errorMsg}
        </div>
      )}
      
      {successMsg && (
        <div className="p-4 bg-[#4ade80]/20 border border-[#4ade80]/40 text-[#4ade80] rounded-2xl text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-[#bccabb]">Carregando profissionais...</div>
        ) : secondTeachers.length === 0 ? (
          <div className="col-span-full glass-panel p-8 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
              <HeartHandshake className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Nenhum 2º Professor Cadastrado</h3>
            <p className="text-sm text-[#bccabb] max-w-md mx-auto mb-6">
              Adicione profissionais de Atendimento Educacional Especializado (AEE) para auxiliarem no acompanhamento de alunos de inclusão.
            </p>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="py-2.5 px-6 bg-white/5 hover:bg-white/10 text-white font-bold rounded-full border border-white/10 transition-all text-sm"
            >
              Cadastrar Agora
            </button>
          </div>
        ) : (
          secondTeachers.map(st => (
            <div key={st.id} className="glass-panel p-5 rounded-3xl border border-white/10 flex flex-col justify-between group">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500/30 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={st.avatarUrl} alt={st.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-500/20">
                    <ShieldCheck className="w-3 h-3" /> AEE
                  </span>
                </div>
                <h3 className="font-bold text-white text-lg mb-1 truncate">{st.name}</h3>
                
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-xs text-[#bccabb]">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{st.email}</span>
                  </div>
                  {st.phone && (
                    <div className="flex items-center gap-2 text-xs text-[#bccabb]">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{st.phone}</span>
                    </div>
                  )}
                  {st.subject && (
                    <div className="flex items-center gap-2 text-xs text-[#bccabb]">
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{st.subject}</span>
                    </div>
                  )}
                  {st.school && (
                    <div className="flex items-center gap-2 text-xs text-[#bccabb]">
                      <School className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{st.school}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => handleDelete(st.id, st.name)}
                  className="p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl transition-all"
                  title="Remover acesso"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <NewSecondTeacherModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        defaultSchool={teacher.school}
        onCreateSecondTeacher={() => {
          setSuccessMsg('Professor cadastrado com sucesso!');
          fetchSecondTeachers();
          setTimeout(() => setSuccessMsg(''), 3000);
        }}
      />
    </div>
  );
};
