import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { hashPasswordBcrypt } from '@/lib/crypto';
import { getSessionFromRequest } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/second-teachers
 * Lista os 2º professores vinculados ao tenant no Firestore.
 */
export async function GET(req: NextRequest) {
  try {
    let ownerTeacherId: string | null = null;

    // 1. Verificar cookie 'session' do Firebase Auth (Professor Titular)
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('session')?.value;
      if (sessionCookie) {
        const auth = getAdminAuth();
        const decoded = await auth.verifySessionCookie(sessionCookie, true);
        if (decoded?.uid) {
          ownerTeacherId = decoded.uid;
        }
      }
    } catch {}

    // 2. Fallback JWT (Aluno ou 2º Professor)
    if (!ownerTeacherId) {
      const session = await getSessionFromRequest(req);
      ownerTeacherId = session?.ownerTeacherId || session?.sub || null;
    }

    let teachers: any[] = [];

    if (ownerTeacherId) {
      const cacheKey = `second_teachers_${ownerTeacherId}`;
      teachers = await serverCache.getOrSet(cacheKey, 180, async () => {
        try {
          const db = getAdminDb();
          const snap = await db
            .collection('tenants')
            .doc(ownerTeacherId!)
            .collection('second_teachers')
            .orderBy('name')
            .get();

          return snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        } catch (dbErr: any) {
          console.warn('Aviso ao consultar 2º professores do tenant:', dbErr?.message);
          return [];
        }
      });
    }

    return NextResponse.json({ teachers, secondTeachers: teachers }, { status: 200 });
  } catch (err: any) {
    console.warn('Aviso GET /api/second-teachers no Firestore:', err?.message);
    return NextResponse.json({ teachers: [], secondTeachers: [] }, { status: 200 });
  }
}

/**
 * POST /api/second-teachers
 * Cadastra um novo 2º professor no Firestore (e Firebase Auth).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    const ownerTeacherId = session?.ownerTeacherId || session?.sub || 'default-teacher';
    const body = await req.json();
    const { name, email, password, subject, phone, school, avatarUrl } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, e-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const hashedPassword = await hashPasswordBcrypt(password.trim());
    const db = getAdminDb();

    // 1. Tentar criar no Firebase Auth se aplicável
    let firebaseUid = '';
    try {
      const adminAuth = getAdminAuth();
      const existingUser = await adminAuth.getUserByEmail(cleanEmail).catch(() => null);
      if (!existingUser) {
        const createdAuth = await adminAuth.createUser({
          email: cleanEmail,
          password: password.trim(),
          displayName: cleanName,
        });
        firebaseUid = createdAuth.uid;
      } else {
        firebaseUid = existingUser.uid;
      }
    } catch (authErr) {
      console.warn('Aviso ao criar usuário no Firebase Auth admin:', authErr);
    }

    const teacherId = firebaseUid || `st_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const teacherData = {
      id: teacherId,
      name: cleanName,
      email: cleanEmail,
      passwordHash: hashedPassword,
      subject: subject?.trim() || 'AEE / Inclusão Escolar',
      phone: phone?.trim() || '',
      school: school?.trim() || '',
      avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
      mustChangePassword: true,
      ownerTeacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await db
      .collection('tenants')
      .doc(ownerTeacherId)
      .collection('second_teachers')
      .doc(teacherId)
      .set(teacherData, { merge: true });

    serverCache.delete(`second_teachers_${ownerTeacherId}`);

    return NextResponse.json({ success: true, teacher: teacherData }, { status: 201 });
  } catch (err: any) {
    console.error('Erro interno POST /api/second-teachers no Firestore:', err);
    return NextResponse.json({ error: 'Erro interno ao criar professor' }, { status: 500 });
  }
}

/**
 * PUT /api/second-teachers
 * Atualiza os dados do 2º professor no Firestore e sincroniza o nome nas tutelas dos alunos.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    const ownerTeacherId = session?.ownerTeacherId || session?.sub || 'default-teacher';
    const body = await req.json();
    const { id, name, email, subject, phone, school, avatarUrl } = body;

    if (!id && !email) {
      return NextResponse.json({ error: 'ID ou e-mail é obrigatório para edição.' }, { status: 400 });
    }

    const db = getAdminDb();
    const nowIso = new Date().toISOString();
    let targetDocRef = id
      ? db.collection('tenants').doc(ownerTeacherId).collection('second_teachers').doc(id)
      : null;

    if (!targetDocRef || !(await targetDocRef.get()).exists) {
      const snap = await db
        .collection('tenants')
        .doc(ownerTeacherId)
        .collection('second_teachers')
        .where('email', '==', email?.trim().toLowerCase())
        .get();

      if (!snap.empty) {
        targetDocRef = snap.docs[0].ref as any;
      }
    }

    if (!targetDocRef) {
      return NextResponse.json({ error: 'Professor não encontrado.' }, { status: 404 });
    }

    const updatePayload: Record<string, any> = { updatedAt: nowIso };
    if (name) updatePayload.name = name.trim();
    if (subject !== undefined) updatePayload.subject = subject.trim();
    if (phone !== undefined) updatePayload.phone = phone.trim();
    if (school !== undefined) updatePayload.school = school.trim();
    if (avatarUrl) updatePayload.avatarUrl = avatarUrl;

    await targetDocRef.set(updatePayload, { merge: true });

    // Sincronizar nome alterado na subcoleção de alunos do mesmo tenant
    if (name) {
      try {
        const studentsSnap = await db
          .collection('tenants')
          .doc(ownerTeacherId)
          .collection('students')
          .where('secondTeacherId', '==', targetDocRef.id)
          .get();

        if (!studentsSnap.empty) {
          const batch = db.batch();
          studentsSnap.docs.forEach((doc) => {
            batch.set(
              doc.ref,
              { secondTeacherName: name.trim(), updatedAt: nowIso },
              { merge: true }
            );
          });
          await batch.commit();
        }
      } catch (syncErr) {
        console.warn('Aviso ao sincronizar nome nas tutelas:', syncErr);
      }
    }

    const updatedSnap = await targetDocRef.get();
    serverCache.delete(`second_teachers_${ownerTeacherId}`);
    return NextResponse.json({ success: true, teacher: updatedSnap.data() }, { status: 200 });
  } catch (err: any) {
    console.error('Erro interno PUT /api/second-teachers no Firestore:', err);
    return NextResponse.json({ error: 'Erro interno ao atualizar professor' }, { status: 500 });
  }
}

/**
 * DELETE /api/second-teachers
 * Remove o 2º professor no Firestore e desvincula tutelas de alunos associados.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    const ownerTeacherId = session?.ownerTeacherId || session?.sub || 'default-teacher';

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const email = url.searchParams.get('email');

    if (!id && !email) {
      return NextResponse.json(
        { error: 'ID ou e-mail do 2º professor é obrigatório para exclusão.' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const nowIso = new Date().toISOString();
    const teacherId = id;

    // 1. Desvincular alunos que estavam sob a tutela desse 2º professor
    try {
      const studentsSnap = await db
        .collection('tenants')
        .doc(ownerTeacherId)
        .collection('students')
        .get();

      const batch = db.batch();
      let hasUpdates = false;

      studentsSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (
          (teacherId && data.secondTeacherId === teacherId) ||
          (email && data.secondTeacherEmail === email)
        ) {
          batch.set(
            doc.ref,
            {
              secondTeacherId: null,
              secondTeacherName: null,
              updatedAt: nowIso,
            },
            { merge: true }
          );
          hasUpdates = true;
        }
      });

      if (hasUpdates) {
        await batch.commit();
      }
    } catch (unassignErr) {
      console.warn('Aviso ao desvincular alunos no Firestore:', unassignErr);
    }

    // 2. Excluir o documento do 2º professor no Firestore
    if (teacherId) {
      await db
        .collection('tenants')
        .doc(ownerTeacherId)
        .collection('second_teachers')
        .doc(teacherId)
        .delete();
    } else if (email) {
      const snap = await db
        .collection('tenants')
        .doc(ownerTeacherId)
        .collection('second_teachers')
        .where('email', '==', email.trim().toLowerCase())
        .get();

      const batch = db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    serverCache.delete(`second_teachers_${ownerTeacherId}`);

    return NextResponse.json(
      { success: true, message: '2º Professor removido com sucesso e tutelas desvinculadas no Firestore.' },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Erro interno DELETE /api/second-teachers no Firestore:', err);
    return NextResponse.json({ error: 'Erro interno ao excluir professor' }, { status: 500 });
  }
}

