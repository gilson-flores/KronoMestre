import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  // Segurança: Proteção básica para evitar acesso público indesejado
  const token = req.nextUrl.searchParams.get('token');
  if (token !== 'BACKUP_SEGURO_2026') {
    return NextResponse.json({ error: 'Acesso negado. Token de segurança inválido.' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client not configured' }, { status: 500 });
  }

  try {
    const [
      { data: students },
      { data: activities },
      { data: submissions },
      { data: atestados_rad },
      { data: teachers },
      { data: second_teachers },
      { data: study_files },
      { data: chat_messages }
    ] = await Promise.all([
      supabase.from('students').select('*').limit(10000),
      supabase.from('activities').select('*').limit(10000),
      supabase.from('submissions').select('*').limit(10000),
      supabase.from('atestados_rad').select('*').limit(10000),
      supabase.from('teachers').select('*').limit(10000),
      supabase.from('second_teachers').select('*').limit(10000),
      supabase.from('study_files').select('*').limit(10000),
      supabase.from('chat_messages').select('*').limit(10000)
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      metadata: {
        students_count: students?.length || 0,
        activities_count: activities?.length || 0,
        submissions_count: submissions?.length || 0,
        atestados_rad_count: atestados_rad?.length || 0,
        teachers_count: teachers?.length || 0,
        second_teachers_count: second_teachers?.length || 0,
        study_files_count: study_files?.length || 0,
        chat_messages_count: chat_messages?.length || 0,
      },
      data: {
        students,
        activities,
        submissions,
        atestados_rad,
        teachers,
        second_teachers,
        study_files,
        chat_messages
      }
    };

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup_sociologia_online_${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao gerar backup', details: err.message }, { status: 500 });
  }
}
