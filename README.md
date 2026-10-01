# 🌿 Jardim Control

Sistema web responsivo (mobile-first) para organizar, distribuir, executar e acompanhar as tarefas de jardinagem e manutenção das áreas verdes da empresa.

- **Liderança / Administrador:** painel consolidado, Ronda de Jardinagem, tarefas, aprovações, cronograma com arrastar e soltar, manutenções recorrentes, áreas/locais com QR Code, planta da empresa, ocorrências, relatórios (PDF e Excel), checklists padrão, equipe e rastreabilidade.
- **Jardineiro:** interface simplificada "MINHAS TAREFAS" com botões grandes, execução passo a passo (foto do local → instruções → checklist → observações → câmera → finalizar), agenda, registro de problemas e leitor de QR Code.

## Requisitos

- Node.js 20 ou superior
- Nenhum banco externo: usa SQLite (arquivo `prisma/dev.db`)

## Instalação

```bash
npm install
npm run setup     # cria o banco e carrega os dados de demonstração
npm run dev       # http://localhost:3000
```

Para produção:

```bash
npm run build
npm start
```

Para apagar tudo e recriar os dados de demonstração: `npm run db:reset`.

## Acessos de demonstração

| Perfil | Usuário | Senha |
| --- | --- | --- |
| Administrador | `admin` | `admin123` |
| Liderança | `lider` | `lider123` |
| Jardineiros | `joao`, `carlos`, `maria`, `pedro` | `123456` |

Troque as senhas em **Equipe e usuários** antes de usar em produção.

## Configuração (`.env`)

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | Caminho do banco SQLite (`file:./dev.db`). |
| `SESSION_SECRET` | Chave usada para assinar a sessão. **Troque por um valor longo e aleatório.** |
| `APP_URL` | Endereço público usado dentro dos QR Codes (ex.: `http://192.168.0.10:3000` ou `https://jardim.suaempresa.com.br`). Se vazio, usa o endereço pelo qual a página foi acessada. |

## Uso no celular e QR Codes

- O servidor escuta em todas as interfaces (`0.0.0.0`). Na rede da empresa, acesse pelo IP do computador, por exemplo `http://192.168.0.10:3000`.
- Defina `APP_URL` com esse endereço **antes de imprimir** as etiquetas em **Áreas, locais e QR → Imprimir QR Codes**, para que o QR aponte para o servidor correto.
- Ao escanear, o jardineiro vê as tarefas pendentes daquele local, o checklist, as fotos de referência e o botão **INICIAR MANUTENÇÃO**; a liderança vê histórico, antes/depois, ocorrências e **REGISTRAR NOVA MANUTENÇÃO**.
- A câmera ao vivo do leitor exige HTTPS (ou `localhost`). Em HTTP na rede local, use **TIRAR FOTO DO QR CODE** (funciona em qualquer celular) ou digite o código do local. A câmera nativa do celular também abre o link do QR diretamente.
- As fotos são comprimidas no próprio aparelho antes do envio e ficam na pasta `uploads/` (faça backup dela junto com `prisma/dev.db`).

## Regras de negócio principais

- **Status:** 🔵 Programada, 🟡 Pendente, 🟠 Em andamento, 🟢 Concluída, 🔴 Atrasada, 🟣 Aguardando aprovação, ⚫ Cancelada. Tarefas passam de Programada para Pendente no dia agendado e para Atrasada quando o prazo vence (rotina automática).
- **Finalização:** o jardineiro só envia para aprovação com todos os itens obrigatórios do checklist marcados e ao menos uma foto "depois". A liderança aprova (conclui) ou devolve para correção com motivo.
- **Tempo:** início e fim são registrados automaticamente; correções somam novas sessões ao tempo total.
- **Recorrências:** geram as tarefas automaticamente com 30 dias de antecedência.
- **Exclusão:** tarefas não concluídas são arquivadas (exclusão lógica). Manutenções **concluídas** só podem ser excluídas por um **administrador**, confirmando a senha e informando o motivo; um resumo completo fica registrado na rastreabilidade.
- **Rastreabilidade:** toda criação, alteração, execução, aprovação, devolução, exclusão e exportação de relatório fica registrada com usuário, data e horário.

## Tecnologias

Next.js 16 (App Router, Server Actions), React 19, Tailwind CSS 4, Prisma 6 + SQLite, @dnd-kit (cronograma), qrcode + jsQR (QR Codes), jsPDF + jspdf-autotable (PDF) e ExcelJS (Excel).

## Estrutura

```
prisma/            schema do banco e dados de demonstração
src/app/(lideranca) telas da liderança
src/app/(jardineiro) telas do jardineiro
src/app/(comum)     QR Code do local, leitor de QR e notificações
src/app/actions     regras de negócio (server actions)
src/app/api         arquivos de fotos e exportação de relatórios
src/components      componentes de interface
src/lib             sessão, permissões, datas, recorrências, relatórios, auditoria
```
