import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { supabase } from "./supabase";

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
        description: "Lista as tabelas disponíveis no banco de dados Supabase.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_table_data",
        description: "Busca dados de uma tabela específica no Supabase.",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Nome da tabela (ex: students, activities, submissions, atestados_rad)",
            },
            limit: {
              type: "number",
              description: "Limite de registros a retornar (padrão: 50)",
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
  if (!supabase) {
    throw new Error("Supabase não está configurado. Verifique as variáveis de ambiente.");
  }

  const { name, arguments: args } = request.params;

  if (name === "list_tables") {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify([
            "students",
            "teachers",
            "second_teachers",
            "activities",
            "submissions",
            "atestados_rad",
            "rco_emissions"
          ], null, 2),
        },
      ],
    };
  }

  if (name === "get_table_data") {
    const table = String(args?.table);
    const limit = Number(args?.limit) || 50;

    const { data, error } = await supabase.from(table).select('*').limit(limit);

    if (error) {
      return {
        content: [{ type: "text", text: `Erro ao buscar tabela ${table}: ${error.message}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }

  if (name === "get_student_by_matricula") {
    const matricula = String(args?.matricula);
    
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('matricula', matricula)
      .single();

    if (error) {
      return {
        content: [{ type: "text", text: `Erro ao buscar estudante: ${error.message}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }

  throw new Error(`Tool not found: ${name}`);
});
