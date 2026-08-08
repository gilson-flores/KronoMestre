# 🤖 Robô de Migrations Automáticas do GitHub

Este projeto possui uma esteira automatizada no GitHub Actions (`.github/workflows/supabase-migrations.yml`) para executar migrations no banco de dados Supabase de forma segura, ordenada e com verificação de versionamento único.

---

## 📌 Como funciona o Versionamento Único

Para evitar qualquer risco de falha ou repetição de comandos SQL, o sistema exige que **cada arquivo de migration possua um identificador/data único no prefixo do nome**:

Exemplos de nomes padronizados:
- `20260807_initial_schema.sql`
- `20260808_sync_teachers_and_clean_data.sql`
- `20260809_clean_ghost_teacher_and_fix_sync.sql`
- `20260810_add_cascade_delete_activities.sql`

O robô valida que não existem prefixos repetidos antes de prosseguir com a aplicação.

---

## 🔐 Controle de Aprovação Manual (Sob Aprovação)

As migrations não sobem "às cegas". O robô funciona sob duas camadas de segurança e aprovação:

1. **Aprovação Manual por Trigger (`workflow_dispatch`)**:
   - Acesse a aba **Actions** no repositório do GitHub.
   - Selecione o workflow **Supabase Migrations Bot**.
   - Clique em **Run workflow**, escolha o ambiente (`production` ou `staging`) e confirme a execução.

2. **Aprovação por Ambiente do GitHub (`Environment Protection Rules`)**:
   - No GitHub em **Settings** -> **Environments** -> **production**:
   - Ative a opção **Required reviewers** e adicione seu usuário ou time responsável.
   - Sempre que um disparo for acionado ou uma PR/Push for aprovada na branch `main`, o GitHub fará uma pausa e solicitará o seu clique explícito de **"Approve and deploy"** antes de executar qualquer instrução SQL no banco.

---

## 🔑 Secrets Necessárias no GitHub

No seu repositório GitHub, navegue em **Settings** -> **Secrets and variables** -> **Actions** e configure:

### Opção A (Supabase CLI):
- `SUPABASE_ACCESS_TOKEN`: Seu Token de Acesso gerado em *Supabase -> Account -> Access Tokens*.
- `SUPABASE_PROJECT_ID`: O ID/Reference do seu projeto Supabase (ex: `kdmt6fezwf3m7coo4isn7r`).
- `SUPABASE_DB_PASSWORD`: A senha do seu banco de dados PostgreSQL do Supabase.

### Opção B (Conexão Direta PostgreSQL):
- `DATABASE_URL`: A URI de conexão direta PostgreSQL (ex: `postgres://postgres.ref:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`).
