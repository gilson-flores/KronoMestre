import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getAdminDb } from "./firebase-admin";

const ALLOWED_COLLECTIONS = [
  "students",
  "second_teachers",
  "activities",
  "atestados_rad",
  "rco_emissions",
  "messages",
  "library_files",
] as const;

const SENSITIVE_FIELDS = ["passwordHash", "password_hash", "fullSnapshotGz"];

function getTenantId(): string {
  const id = process.env.MCP_TENANT_ID || process.env.FIREBASE_TENANT_ID;
  if (!id) {
    throw new Error("Defina MCP_TENANT_ID (UID do professor titular no Firebase) nas variáveis de ambiente.");
  }
  return id;
}

function scrub(data: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { ...data };
  for (const f of SENSITIVE_FIELDS) delete out[f];
  return out;
}

export const mcpServer = new Server(
  {
    name: "mapa-rco-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_tables",
        description: "Lista as coleções disponíveis no banco de dados Firestore.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_table_data",
        description: "Busca dados de uma coleção específica no Firestore.",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Nome da coleção (ex: students, activities, atestados_rad, rco_emissions)",
            },
            limit: {
              type: "number",
              description: "Limite de registros a retornar (padrão: 50, máximo: 500)",
            },
          },
          required: ["table"],
        },
      },
      {
        name: "get_student_by_matricula",
        description: "Busca um estudante específico pela matrícula.",
        inputSchema: {
          type: "object",
          properties: {
            matricula: {
              type: "string",
              description: "Matrícula do estudante",
            },
          },
          required: ["matricula"],
        },
      }
    ],
  };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "list_tables") {
    return {
      content: [{ type: "text", text: JSON.stringify(ALLOWED_COLLECTIONS, null, 2) }],
    };
  }

  const db = getAdminDb();
  const tenantRef = db.collection("tenants").doc(getTenantId());

  if (name === "get_table_data") {
    const table = String(args?.table);
    const limit = Math.min(Math.max(Number(args?.limit) || 50, 1), 500);

    if (!(ALLOWED_COLLECTIONS as readonly string[]).includes(table)) {
      return {
        content: [{ type: "text", text: `Coleção não permitida: ${table}. Use list_tables.` }],
        isError: true,
      };
    }

    try {
      const snap = await tenantRef.collection(table).limit(limit).get();
      const data = snap.docs.map((d) => ({ id: d.id, ...scrub(d.data()) }));
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err: any) {
      return {
        content: [{ type: "text", text: `Erro ao buscar coleção ${table}: ${err?.message || err}` }],
        isError: true,
      };
    }
  }

  if (name === "get_student_by_matricula") {
    const matricula = String(args?.matricula);
    try {
      const snap = await tenantRef.collection("students").where("matricula", "==", matricula).limit(1).get();
      if (snap.empty) {
        return {
          content: [{ type: "text", text: `Nenhum estudante encontrado com a matrícula ${matricula}.` }],
          isError: true,
        };
      }
      const d = snap.docs[0];
      return {
        content: [{ type: "text", text: JSON.stringify({ id: d.id, ...scrub(d.data()) }, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text", text: `Erro ao buscar estudante: ${err?.message || err}` }],
        isError: true,
      };
    }
  }

  throw new Error(`Tool not found: ${name}`);
});
