# Auditoria de experiência e interface

## Regra editorial

Todas as cópias do produto usam pontuação natural sem travessão ou meia risca. A regra é validada por `npm run audit:ui` em código, estilos, testes, worker, scripts e migrações.

## Sistema visual administrativo

| Elemento | Regra |
|---|---|
| Texto auxiliar | 12 px, sem caixa alta automática |
| Corpo e tabelas | 14 px, entrelinha de 1,5 |
| Rótulos e controles | 14 px |
| Subtítulos | 16 px |
| Títulos de cartão | 20 px |
| Títulos de seção | 24 px |
| Título principal | 32 px no desktop e 28 px no mobile |
| Controles | Altura mínima de 42 px |
| Campos no mobile | 16 px para evitar zoom automático |
| Cartões | Raio de 14 px e espaçamento interno consistente |
| Foco | Contorno visível para teclado |
| Movimento | Animações reduzidas quando o sistema solicitar |

## Áreas verificadas

| Área | Pontos controlados |
|---|---|
| Entrada e autenticação | hierarquia, mensagens, foco e retorno seguro |
| Páginas | título campeão completo, métricas alinhadas, limite de etiquetas, busca e ações |
| Editor de página | abas sem corte, rolagem vertical correta, campos e seletores padronizados |
| Versões | cartões com mesma geometria, texto legível e ações consistentes |
| Testes | seleção completa pelo cartão, escolha de distribuição, percentuais e estados |
| Resultados | ranking direto, visitantes, leads, conversão e tráfego por versão |
| Analytics | métricas reais, comparação A e B, origem e mapa em coleta |
| Leads | filtros, detalhes, estados vazios e exportação |
| Integrações | cartões, estados, biblioteca de Pixels e mensagens de erro |
| Palestrantes | listagem, edição, imagens e exclusão |
| Equipe | funções, permissões, remoção e estado vazio |
| Histórico e lixeira | legibilidade, ações e confirmações |
| Páginas públicas | responsividade, campos de 16 px, foco, largura e conteúdo dinâmico |
| Páginas de confirmação | responsividade, CTA, evento e conteúdo dinâmico |

## Estados obrigatórios

Cada módulo deve tratar carregamento, ausência de dados, erro, sucesso, controle desabilitado, desktop, tablet e mobile. Dados ainda não coletados devem aparecer como `Sem dados`, `Em coleta` ou `Não integrado`, conforme o contexto. Números demonstrativos não podem ser usados como resultado real.

## Vocabulário de métricas de leads (convenção atual)

Padrão em uso no produto; convenção, não regra imutável. Em números, rótulos de métricas, colunas e badges de leads, a interface nomeia o dado pelo que ele significa para o gestor, não pelo mecanismo que o trouxe. "Importado", "sincronizado", "migrado" e "legado" descrevem processo e perdem sentido em semanas. Exceção: botões e ações continuam com o verbo natural ("Importar lista", "Sincronizar").

1. Leads que passaram pela página e contam na conversão: "pela página".
2. Leads que não passaram pela página: nome real da origem gravada em `import_source`, pelo mapa central de `lib/platform-label.ts` (hoje "GreatPages" e "Formulário do Meta"). Valor novo sem tradução cai em "Outra origem".
3. Agregado com um só rótulo: "outras origens" (ex.: "17 pela página · 165 de outras origens"). Quebra por origem fica no detalhe.
4. Onde só cabe um número: "Total", com a quebra no detalhe.
5. Linha, coluna, badge ou parcela de "outras origens" some quando o valor é zero, em todas as telas.
6. Tooltip, quando houver: "Não passaram pela página; fora da conversão." Uma linha.

## Régua única de conversão

Todos os números de conversão do painel saem de `lib/conversion-rules.ts`; nenhuma tela tem régua própria.

| Regra | Valor | Onde |
|---|---|---|
| Recorte temporal | campanha atual da página (`page_campaigns.ended_at IS NULL`), de `started_at` em diante; `lib/campaign-window.ts` | todas as telas |
| Acesso que conta | evento humano classificável (com UA, sem marca de robô); `lib/human-traffic.ts` | acessos, visitantes, conversão |
| Taxa de página | leads pela página ÷ acessos; abaixo de 10 acessos: "Em coleta" | Páginas, Analytics, cidade |
| Posição no ranking de cidades | a partir de 30 acessos; abaixo, "·" e "Em coleta" | Performance por cidade, Bento |
| Taxa de versão | inscritos ÷ visitantes que viram a versão; abaixo de 10: sem taxa | Versões, Teste por cidade |
| Líder de versão | base das regras da narrativa (padrão 100) em todas as versões e vantagem fora da margem; senão "Empate técnico" ou "À frente · em coleta" | pódio, painel de teste, Teste por cidade |
| Leads de outras origens | contam no total da cidade, nunca na conversão | todas as telas |

O "melhor" de qualquer lista é sempre o primeiro pela mesma régua; "Média de conversão" é o agregado de todas as cidades sobre a mesma base (leads pela página ÷ acessos), nunca a média das taxas.

### Regras do teste por narrativa

O que antes era número fixo no código vive em `lib/experiment-rules.ts` e é editado pelo botão "Regras do teste" no cabeçalho do Teste por cidade (abre um popup centrado de 520px, mesmo fundo desfocado da gaveta do admin), uma linha por narrativa em `experiment_rules`. Sem linha valem os padrões ("Padrões da plataforma"); com linha, "Alteradas em …". Não há resumo em números fora do painel: rótulos como "Líder com 100" ao lado de "À melhor 70%" liam-se como metas de conversão. No popup, cada número tem a sua linha: rótulo à esquerda, caixa do valor à direita numa coluna fixa de 150px, agrupadas em Otimizar / Decidir / Versão ruim / Revisar. Um valor fora do limite é recusado com a frase da regra, sem gravar nada.

| Regra | Padrão | Quem usa |
|---|---|---|
| Fatia da melhor | 70% (51 a 100) | ação em massa "Dar X% à melhor" e modo automático da rodada |
| Base para decidir (líder) | 100 visitantes por versão | pódio, painel de teste, Teste por cidade, modo automático |
| Conversão baixa | abaixo de 15% com 50+ visitantes, sempre por cidade (a comparação "% da melhor" existe mas vem desligada: marcava como ruim versões boas só porque a melhor da cidade era excepcional) | classificação Boa/Ruim/Em coleta |
| Revisar a cada | 3 dias | recomendação de próxima otimização |

O editor são quatro frases ("Dar [70]% dos próximos visitantes à melhor versão…") onde só o número é editável, sem legendas: lê-se como regra, não como formulário.

Cada versão recebe uma etiqueta **Boa**, **Ruim** ou **Em coleta** (`classifyVariant`) **por cidade**, nunca na média: uma versão ruim no total pode ser a melhor de uma cidade. No pódio, cada linha da lista de todas as versões tem colunas fixas (taxa · N viram · lidera em N · "boa em 3 · ruim em 1"), sem a margem "±" (lia-se como mais/menos), e abre ao clique mostrando cidade a cidade (taxa, base, etiqueta; "Melhor" onde lidera); no Teste por cidade, na coluna "Ruins" (código e taxa de cada ruim daquela cidade, "—" quando nenhuma). A seta no fim da linha abre a cidade: uma linha por versão com barra na escala da meta, taxa, base, fatia dos próximos visitantes e etiqueta ("Melhor" na que lidera). A melhor nunca entra em "Ruins" da cidade. O bloco "Por que a Vx está em 1º" fica recolhido por padrão.

No topo do Teste por cidade, uma linha diz quando foi a última otimização (qualquer mexida em distribuição ou versões, manual ou automática; criar/iniciar/pausar/encerrar não contam) e o que fazer: **Otimizar agora** (cadência vencida e há cidades com líder sem a fatia ou com versão ruim no ar, contadas ao lado), **Próxima em N dias** (há o que fazer, mas a cadência ainda não venceu) ou **Nada a otimizar agora**.

## Um cartão, uma resposta

Cada cartão ou linha responde a uma pergunta e um número não aparece duas vezes na mesma tela. Onde dois cartões respondiam à mesma coisa com bases diferentes (ex.: "Melhor página" 25,7% ao lado de "Melhor versão" 12,7%), um dos dois sai. Ao lado de cada taxa vai a base ("9 inscrições em 35 acessos"), para a leitura não depender de tooltip.

## Listas longas

Padrão de `app/admin/paged.tsx`, igual em todas as listas do painel:

| Tamanho | Comportamento |
|---|---|
| até 10 itens | todos visíveis |
| 11 a 30 | 10 visíveis e "Ver as outras N"; depois "Ver menos" |
| mais de 30 | páginas de 30 (ou 10 nas listas de cartões) com "Anterior · 1 a 30 de N · Próxima"; ao mudar de página a seção volta ao topo |

Sem rolagem interna em contêiner no desktop: a página rola inteira e o cabeçalho da lista fica preso ao topo (`app/admin/use-stuck.ts`, `position: sticky`, sombra só enquanto preso, sem ouvir o scroll). Rolagem lateral (`overflow-x: auto`) só no mobile e só em tabelas que não cabem em 390px.

## Ações em massa

Uma ação em massa lista o que vai fazer antes de fazer (cidade → resultado), roda item a item e nomeia o que falhou, sem desfazer o que já passou. Em uso: publicar, despublicar, alterar data e excluir páginas; dar 100% à melhor versão (o antigo "fixar", só que a rodada segue editável), dar a fatia das regras (padrão 70%) à melhor versão, **desativar ruins** (as versões ruins ficam na rodada com peso zero, para quem já foi sorteado continuar vendo a sua; a fatia delas passa às que ficam na proporção que já tinham) e **substituir ruins** (as ruins saem e a versão escolhida herda exatamente a fatia delas). Em nenhum caso a fatia de quem fica muda: a melhor com 70% continua com 70%, senão uma ação desfazia a outra. A principal da rodada não pode ser desativada, só substituída: "Desativar" pula-a e diz isso na lista. Os dois botões só ativam quando alguma cidade marcada tem versão ruim no ar (aba Versões, Teste por cidade). "Fixar" foi descontinuado: rodadas fixas do modelo antigo reabrem como ativas ao receber qualquer distribuição. Encerrar uma rodada em que uma versão está a 100% grava essa versão como promessa da página; ao substituir uma versão ruim, a lista sugere as melhores da narrativa (conversão, expostos, cidades no ar).

## Modais, drawers e botões

Toda camada sobre o admin nasce de `app/admin/modal.tsx` (`<Modal>`): fundo escuro, cartão com cabeçalho (kicker, título, descrição opcional, X de 36 × 36 no canto superior direito), corpo que rola sozinho e rodapé com as ações separadas por 10 px. Três formas: `variant="dialog"` centralizado (`size` sm 460, md 680, lg 1050 ou `width` em px), `variant="drawer"` encostado à direita (sm 520, md 640) e `align="center"` para confirmação (ícone em cima, texto centralizado, `role="alertdialog"`). Esc fecha, clique no fundo fecha (`closeOnBackdrop={false}` enquanto salva), o foco entra no cartão e volta ao fechar. Conteúdo interno continua com as classes de sempre via `bodyClassName`. A única camada fora do padrão é a área de trabalho da página (`.overlay` + `.pageWorkspace`: abas, rodapé fixo e regras próprias); ela segue as mesmas medidas de X e voltar.

`npm run audit:ui` recusa qualquer `position: fixed` cobrindo a tela em outro CSS Module do admin e qualquer `aria-modal`/`role="dialog"` escrito à mão fora de `modal.tsx`. O `design-audit.mjs` abre cada modal e drawer pelos botões reais (novo membro, palestrante, conexões, remarketing, data em massa, exclusões), mede X, rodapé e estouro, e confere que Esc fecha.

X de fechar e botão voltar com 36 × 36 px, raio 9 px, sempre na mesma posição (canto superior direito do cabeçalho). Botões de 42 px de altura; ícones de 15 a 18 px dentro deles. Texto cortado por reticências só com o texto inteiro no `title`. Nenhum texto encostado em borda; blocos irmãos com o mesmo respiro (`--space-block`).

Exceção à altura de 42 px: botão de ícone dentro de texto (o X de um chip de filtro, o "i" ao lado de um número, o remover de um rótulo) acompanha a linha, com 16 a 28 px; a regra geral em `admin.module.css` já trata `span/small/b/p/h1-h4 > button`. Controles lado a lado (botão, select, campo) sempre com 10 px entre eles; nenhum elemento encosta no outro. Listas de itens escolhíveis (versões da narrativa) deitam em fileira na largura toda no desktop, em vez de coluna estreita com rolagem. Cabeçalho fixo de tabela dentro de área com rolagem própria (editor de página) encosta na borda da rolagem, descontando o respiro do contêiner.

## Mobile

Uso mínimo; a revisão a 390px corrige o que quebra, sem redesenhar: filtros em faixa que rola de lado, rótulo sobre o campo em selects longos, tabelas com cinco colunas rolando dentro do bloco, cabeçalhos com botão empilhados. Sem `position: sticky` abaixo de 1180px.

## Proteções automáticas

O comando `npm run audit:ui` falha quando encontra:

- travessão ou meia risca;
- fonte CSS menor que 12 px;
- classe de CSS Module usada sem definição.

E apenas avisa (sem falhar) quando encontra "importado", "próprio", "legado", "sincronizado" ou "migrado" em texto visível de `app/`, para revisar se é rótulo de métrica de leads.

O `scripts/design-audit.mjs` (Playwright, com o dev server em 5173) percorre todas as abas, as quatro abas do editor de página e o estado do filtro de remarketing em Leads, a 1440, 1280 e 390 px, e aponta: estouro horizontal, texto cortado, selo descentralizado, espaçamento desigual entre irmãos, elemento encostado no outro (`touching-x/y`), botão de ícone inflado dentro de texto (`inflated-inline-button`) e filho saindo da borda do pai (`outside-parent`). Menu lateral, células de tabela e controles segmentados ficam fora da checagem de encosto por encostarem de propósito.

O comando `npm test` valida o ciclo das versões (inclusive distribuição com rodada ativa, reabertura de rodada fixa e encerrar com uma versão a 100% gravando a promessa da página), a régua de conversão (`rankVariants`, pisos, pesos da ação em massa), repetição de webhook, permissões, origem das requisições, WhatsApp, rota raiz e componentes compartilhados.
