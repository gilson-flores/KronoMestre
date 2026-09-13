# Integração MCP (Model Context Protocol) - Mapa RCO

Esta aplicação possui um servidor MCP embutido, pronto para ser integrado ao seu **Spark**, **Claude Desktop** ou qualquer outro assistente de IA que suporte o protocolo MCP.

O servidor permite que o assistente de IA consulte diretamente os dados do seu sistema (Estudantes, Atestados, Atividades, Lançamentos RCO) usando a conexão do banco de dados (Supabase).

## Como funciona?

O servidor foi construído usando a biblioteca oficial `@modelcontextprotocol/sdk` e roda via `stdio`. Ele expõe ferramentas (Tools) seguras para que a IA possa ler dados do seu Supabase sem precisar expor a chave de API diretamente no prompt.

**Ferramentas Disponíveis para a IA:**
- `list_tables`: Retorna a lista de tabelas disponíveis.
- `get_table_data`: Retorna os registros de uma tabela específica (ex: `students`).
- `get_student_by_matricula`: Busca os dados completos de um aluno através da matrícula.

## Como integrar ao Spark / Claude Desktop

Se você estiver rodando o seu "Spark" ou "Claude Desktop" localmente, você pode configurá-lo para iniciar este servidor MCP.

Adicione o seguinte no seu arquivo de configuração MCP (ex: `claude_desktop_config.json` ou arquivo equivalente do Spark):

```json
{
  "mcpServers": {
    "mapa_rco": {
      "command": "npx",
      "args": ["tsx", "mcp-server.ts"],
      "env": {
        "NEXT_PUBLIC_SUPABASE_URL": "COLOQUE_SUA_URL_AQUI",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": "COLOQUE_SUA_KEY_AQUI"
      }
    }
  }
}
```

*Nota: Se o Spark rodar na mesma pasta do projeto, ele vai ler automaticamente o seu arquivo `.env` ou `.env.local`, não sendo estritamente necessário colocar no JSON dependendo do cliente.*

## Como testar o servidor localmente

Você pode iniciar o servidor manualmente pelo terminal para ver se ele sobe sem erros:

```bash
npm run mcp
```
*(Ele ficará esperando conexões via `stdio`. Você não verá nenhuma saída visual, exceto mensagens de erro se houver problemas de conexão).*
