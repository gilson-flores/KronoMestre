import { getAdminDb } from '../lib/firebase-admin';

async function inspect() {
  const db = getAdminDb();
  const tenantId = '5IdpwffjnhewdZ5dONRB9QoIRBZ2';
  const actsSnap = await db.collection('tenants').doc(tenantId).collection('activities').get();
  const acts = actsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const studsSnap = await db.collection('tenants').doc(tenantId).collection('students').get();
  const studs = studsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log('Students count:', studs.length);
  const turmas = [...new Set(studs.map((s: any) => s.turma))];
  console.log('Turmas dos alunos:', turmas);

  console.log('Activities count:', acts.length);
  for (const a of acts as any[]) {
    const subs = a.submissions || [];
    console.log('Act:', a.title, '| Turma:', a.turma, '| Subs count:', subs.length);
    if (subs.length > 0) {
      console.log('   Sub statuses:', subs.map((s: any) => `${s.studentName || s.studentId}: ${s.status} (grade: obj=${s.objectiveScore}, ess=${s.essayScore})`));
    }
  }
}

inspect().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
