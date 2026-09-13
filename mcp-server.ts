import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import fs from "fs";

// Carregar variáveis de ambiente
dotenv.config();
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}

// Importar o servidor já configurado com as tools
import { mcpServer } from "./lib/mcp.js";

// Iniciar o servidor com STDIO
async function run() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("MCP Server 'mapa-rco-mcp' running on stdio");
}

run().catch((error) => {
  console.error("Erro fatal no servidor MCP:", error);
  process.exit(1);
});
