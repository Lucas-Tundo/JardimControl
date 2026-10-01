# Design System · base estratégica IAM

Documento para levar a mesma linguagem visual e as mesmas decisões de produto para **outros projetos**. A fonte canônica dos tokens do painel é `app/admin/design-system.css`. As regras operacionais do dia a dia (listas, métricas, modais) ficam em `docs/UX-AUDIT.md`.

Este arquivo responde a três perguntas:

1. **Qual é a filosofia** (o que nunca muda entre produtos).
2. **Quais tokens** copiar como fundação.
3. **Como adaptar a marca** sem quebrar hierarquia, acessibilidade e ritmo.

---

## 1. Filosofia (HIG aplicada a produto B2B)

Três princípios, nesta ordem:

| Princípio | Significado na prática |
|---|---|
| **Clareza** | Texto legível, hierarquia evidente, um cartão = uma resposta. Números com figuras tabulares. Sem decoração que compete com o dado. |
| **Deferência** | A interface serve o conteúdo. Sidebar escura, superfície clara, cor de marca em tint/CTA — não em paredes de gradiente. |
| **Profundidade** | Camadas explicam o que mudou: scrim → modal/drawer, sticky só quando ajuda, movimento curto (120–320 ms) e desligado com `prefers-reduced-motion`. |

### Decisões estratégicas que se repetem

- **Um vocabulário de tokens** (`--ds-*`). Módulos antigos (`--admin-*`, `--crm-*`) **apontam** para esses tokens; não inventam paletas paralelas.
- **Cor de marca = tint**, não tema inteiro. Trocar o produto (IAM azul → Legacy marrom) muda `--ds-brand` / `--ds-tint`; o resto do sistema permanece.
- **Dois esquemas**: claro (padrão do painel) e escuro (CRM/dash via `[data-ds-scheme="dark"]` ou `[data-crm-dark]`).
- **Superfícies públicas ≠ painel**. Landing/captura têm tokens próprios (`--navy`, `--blue`, ou `--asm-*` de vendas). Não force o cinza de sistema da Apple numa LP de conversão.
- **Editorial**: pontuação natural, **sem travessão** (`—` / `–`). Validado por `npm run audit:ui`.
- **Acessibilidade mínima**: contraste AA em texto; anel de foco opaco ≥ 3:1; campos mobile ≥ 16 px; alvo de toque ≥ 44 px.

---

## 2. Arquitetura de superfícies

```text
┌─────────────────────────────────────────────────────────┐
│  Fundação --ds-*   (design-system.css)                  │
│  Tipografia · espaço · raio · movimento · semântica     │
└───────────────┬─────────────────────────┬───────────────┘
                │                         │
     ┌──────────▼──────────┐   ┌──────────▼──────────┐
     │ Painel / CRM        │   │ Marketing / LP      │
     │ data-ds + shell     │   │ globals / ASM / IE  │
     │ --admin-* → --ds-*  │   │ --blue / --asm-*    │
     └─────────────────────┘   └─────────────────────┘
```

| Superfície | Arquivo | Quando usar |
|---|---|---|
| Fundação do painel | `app/admin/design-system.css` | Qualquer app interno, CRM, dashboard |
| Shell do admin | `app/admin/admin.module.css` | Layout sidebar + main |
| Modal/drawer | `app/admin/modal.tsx` + `modal.module.css` | Única camada sobreposta permitida |
| Captura Mente Próspera | `app/globals.css` (`--navy`, `--blue`, `--sky`) | LP de inscrição “clássica” |
| Vendas Acorde Sua Mente | `app/sales/brand-tokens.module.css` (`--asm-*`) | LP de vendas dark/light |
| Inteligência Emocional | `app/inteligencia-emocional.module.css` | Narrativa com IDV própria |
| Catálogo shadcn (opcional) | `app/starter-ui.css` | Só no painel; **não** nas páginas públicas |

Escopo do painel: o layout admin envolve filhos em `<div data-ds>`. Regras de foco, placeholder, scrollbar e reduced-motion valem só dentro de `[data-ds]`.

---

## 3. Tokens da fundação (copiar para outro projeto)

Prefixo obrigatório: `--ds-`. Não misture com nomes de produto no mesmo nível.

### 3.1 Tipografia

Stack (SF Pro no Apple via sistema; fallback Inter / Segoe / Roboto):

```css
--ds-font:
  -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro",
  system-ui, "Helvetica Neue", Inter, "Segoe UI", Roboto, sans-serif;
--ds-font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
```

| Token de texto | Uso | Valor típico |
|---|---|---|
| `--ds-text-large-title` | Saudação / hero interno | 700 34px/1.15 |
| `--ds-text-display` | Título de página | 600 28px/1.2 |
| `--ds-text-title` | Título de seção | 700 22px/1.25 |
| `--ds-text-title-sm` | Card header | 600 17px/1.3 |
| `--ds-text-headline` | Subtítulo denso | 600 15px/1.35 |
| `--ds-text-body` | Corpo / tabela | 400 14px/1.45 |
| `--ds-text-body-strong` | Ênfase | 600 14px/1.45 |
| `--ds-text-callout` | Apoio | 400 13px/1.4 |
| `--ds-text-footnote` | Meta / ajuda | 400 12px/1.4 |
| `--ds-text-caption` | Kicker / chip | 500 11px/1.35 |

Tracking: negativo nos grandes (`-0.022em` → `-0.003em` no body); kicker **sem caixa alta** (`--ds-tracking-kicker: 0.012em`).

**Régua editorial do painel** (também em UX-AUDIT): auxiliar ≥ 12 px; corpo 14 px; controles ≥ 40–42 px de altura; título principal ~32/28 px desktop/mobile.

### 3.2 Espaço (base 4)

```text
1=4  2=8  3=12  4=16  5=20  6=24  8=32  10=40  12=48
```

Irmãos lado a lado: **10 px** entre controles. Blocos: `--ds-space-4` / `--ds-space-6`. Nenhum texto colado na borda.

### 3.3 Raios

| Token | px | Uso |
|---|---|---|
| `--ds-radius-xs` | 6 | Chip miúdo |
| `--ds-radius-sm` | 8 | Input compacto |
| `--ds-radius-md` | 10 | Botão / select |
| `--ds-radius-lg` | 14 | Card |
| `--ds-radius-xl` | 18 | Modal |
| `--ds-radius-2xl` | 22 | Sheet grande |
| `--ds-radius-pill` | 999 | Badge / pill |

### 3.4 Controles e hit target

```text
--ds-control-h: 40px
--ds-control-h-sm: 32px
--ds-control-h-lg: 44px
--ds-hit-min: 44px
```

Exceção: botão de ícone **dentro** de texto (16–28 px). X fechar / voltar: **36 × 36**, raio 9 px, canto superior direito do header do modal.

### 3.5 Movimento

```text
--ds-ease / --ds-ease-out / --ds-ease-spring
--ds-dur-1: 120ms   --ds-dur-2: 200ms   --ds-dur-3: 320ms
```

Modal: fade + 8 px para cima. Drawer: 12 px da direita. Sem bounce exagerado em dados.

### 3.6 Cor — claro

| Papel | Token | Hex / valor |
|---|---|---|
| Fundo app | `--ds-bg` | `#f2f2f7` |
| Superfície | `--ds-surface` | `#ffffff` |
| Elevações | `--ds-surface-1…3` | cinzas HIG |
| Texto | `--ds-label` | `#1d1d1f` |
| Texto 2/3/4 | `--ds-label-2…4` | opacidades sobre cinza |
| Separador | `--ds-separator` | rgba |
| Marca / tint | `--ds-brand` / `--ds-tint` | `#0034b8` |
| Tint profundo | `--ds-tint-deep` | `#002a96` |
| Tint suave | `--ds-tint-soft` | rgba azul 10–16% |
| Sobre tint | `--ds-on-tint` | `#ffffff` |
| Scrim | `--ds-scrim` | rgba(0,0,0,.32) |
| Sucesso | `--ds-green` | `#34c759` |
| Perigo | `--ds-red` | `#ff3b30` |
| Atenção | `--ds-orange` | `#ff9500` |
| WhatsApp | `--ds-wa` | `#25d366` |

Gradiente de título (só large title / login):

```css
--ds-gradient-title: linear-gradient(100deg, var(--ds-brand) 0%, var(--ds-brand-bright) 58%, #6a9bff 100%);
```

Classe utilitária: `.ds-gradient-title` (mask com `background-clip: text`).

### 3.7 Cor — escuro

Ativar com `[data-ds-scheme="dark"]` ou `[data-crm-dark]`. Fundo `#000`, surface `#1c1c1e`, tint mais luminoso `#2a62f5`, texto de tint `#7ea2ff`. Semântica Apple Dark: green/red/orange ajustados.

### 3.8 Elevação e foco

```text
--ds-shadow-1 | --ds-shadow-2 | --ds-shadow-3
--ds-focus: var(--ds-brand)   /* no escuro: #7ea2ff */
```

Foco: `outline: 3px solid var(--ds-focus); outline-offset: 2px` só em `:focus-visible`. Sidebar escura: outline branco.

---

## 4. Como trocar a marca em outro produto

1. Copie `design-system.css` (ou o bloco `:root` + `[data-ds-scheme="dark"]` + `[data-ds]`).
2. Altere **só** o bloco de marca:

```css
--ds-brand: #SEU_HEX;
--ds-brand-bright: #TOM_MAIS_CLARO;
--ds-tint: var(--ds-brand);
--ds-tint-deep: #TOM_MAIS_ESCURO;
--ds-tint-soft: color-mix(in srgb, var(--ds-brand) 10%, transparent);
--ds-tint-soft-2: color-mix(in srgb, var(--ds-brand) 16%, transparent);
--ds-gradient-title: linear-gradient(100deg, var(--ds-brand) 0%, var(--ds-brand-bright) 60%, #TOM_CLARO 100%);
```

3. No shell, mapeie alias do produto:

```css
.shell {
  --admin-accent: var(--ds-tint);
  --admin-sidebar-bg: linear-gradient(180deg, var(--ds-brand) 0%, var(--ds-tint-deep) 100%);
}
```

Referência no repo: variante Legacy Coffee (`.shellLegacy`) troca azul por marrom `#4d3626` sem reescrever componentes.

Para **landing de conversão**, crie um segundo arquivo de tokens de marca (como `--asm-*`) e **não** force `--ds-bg` cinza em hero full-bleed.

### Marca IAM (referência)

| Nome | Hex | Uso |
|---|---|---|
| Azul IAM | `#0034B8` / `#0035B9` (ASM) | Tint, CTA, sidebar |
| Azul luminoso | `#2F6BFF` | Gradiente / dark tint |
| Marinho | `#000428` / `#07143E` | Fundos escuros de LP |
| Verde ação | `#2FBF62` / `#34C759` | Só CTA de ação (nunca identidade) |

---

## 5. Padrões de composição (reutilizar)

### Layout do painel

- Grid: sidebar ~245 px + main.
- Sidebar: gradiente da marca, item ativo = fill branco translúcido (~18%), **nunca** bloco sólido de cor.
- Main: `--ds-bg`; cards em `--ds-surface` com `--ds-radius-lg` e `--ds-shadow-1/2`.

### Um cartão, uma resposta

Não mostre o mesmo KPI duas vezes com bases diferentes na mesma tela. Taxa sempre com base (“9 em 35”).

### Listas longas

Até 10: tudo. 11–30: “Ver as outras N”. >30: paginação. Ver `app/admin/paged.tsx`.

### Camadas

Somente `Modal` (`dialog` | `drawer` | confirmação centrada). Esc fecha; foco preso; `closeOnBackdrop={false}` enquanto salva.

### Estados obrigatórios

Carregando · vazio · erro · sucesso · desabilitado · desktop/tablet/mobile. Sem número fake: use “Sem dados”, “Em coleta”, “Não integrado”.

### Vocabulário de dados (leads)

Métricas pelo significado (“pela página”, “outras origens”), não pelo mecanismo (“importado”, “legado”). Detalhe em UX-AUDIT.

---

## 6. Landing / marketing (estratégia separada)

| Família | Tokens | Personalidade |
|---|---|---|
| Captura clássica | `--navy #07143e`, `--blue #144ae0`, `--sky #308dfc`, `--paper #f5f7fb` | Azul operacional, formulário na dobra |
| ASM vendas | `--asm-blue #0035b9`, `--asm-navy #000428`, superfícies `#050a1f` / light | Escuro cinematográfico; verde só no botão |
| Login Growth | `--lg-blue #0034b8`, hero full-bleed, título com gradiente on-dark | Uma tela, um CTA (Google) |

Regras de LP (alinhadas ao Criador):

- Mobile first; viewport; CTAs com `href`.
- No máximo **2 famílias / 3 pesos** de fonte (Google Fonts com `display=swap` + preconnect).
- Material real (logo, foto) antes de imagem gerada.
- Sem card no hero só por estética; hero full-bleed quando for página promocional.
- Formulário: campos ≥ 16 px no mobile.

Biblioteca de direções de arte do builder: `lib/ai/design-references.ts` (editorial, cinema, cinética…). Use como **inspiração estratégica**, não como CSS obrigatório do painel.

---

## 7. Starter mínimo para um projeto novo

1. Cole o conteúdo de `app/admin/design-system.css`.
2. No root do app:

```tsx
<div data-ds="" className="app-shell">
  {/* … */}
</div>
```

3. CSS do shell:

```css
.app-shell {
  min-height: 100vh;
  background: var(--ds-bg);
  color: var(--ds-label);
  font: var(--ds-text-body);
  font-family: var(--ds-font);
}
.app-shell h1 { font: var(--ds-text-display); letter-spacing: var(--ds-tracking-display); }
.app-shell .card {
  background: var(--ds-surface);
  border-radius: var(--ds-radius-lg);
  box-shadow: var(--ds-shadow-1);
  padding: var(--ds-space-5);
}
.app-shell .btn-primary {
  height: var(--ds-control-h);
  border-radius: var(--ds-radius-md);
  background: var(--ds-tint);
  color: var(--ds-on-tint);
  border: 0;
  padding: 0 var(--ds-space-4);
  font: var(--ds-text-body-strong);
}
```

4. Defina a marca (seção 4) e **pare**. Só então acrescente componentes.

Checklist do primeiro PR visual:

- [ ] Só tokens `--ds-*` (sem hex solto em componentes)
- [ ] Foco `:focus-visible` ok
- [ ] `prefers-reduced-motion` ok
- [ ] Contraste AA nos textos principais
- [ ] Sem travessão na cópia
- [ ] Controles ≥ 40 px; toque ≥ 44 px

---

## 8. O que não fazer (vieses a evitar)

- Tema roxo/indigo genérico de “AI SaaS”.
- Fundo cream + serif terracotta de “template editorial”.
- Layout broadsheet (filetes, zero radius, colunas densas) no painel operacional.
- Glow / multi-shadow / pill excessivo como identidade.
- Dark mode em **tudo** por padrão (escuro é opt-in, CRM).
- Cards no hero de marketing sem necessidade de interação.
- Segunda paleta completa sem mapear para `--ds-tint`.

---

## 9. Mapa de arquivos neste repositório

| Arquivo | Papel |
|---|---|
| `app/admin/design-system.css` | **Fonte da verdade** dos tokens do painel |
| `app/admin/layout.tsx` | Injeta `data-ds` |
| `app/admin/admin.module.css` | Shell, sidebar, tipografia de tela |
| `app/admin/modal.module.css` | Camada única |
| `docs/UX-AUDIT.md` | Regras de UX, métricas, listas, auditoria |
| `app/globals.css` | Reset + captura pública |
| `app/sales/brand-tokens.module.css` | IDV ASM vendas |
| `scripts/audit-ui.mjs` / `design-audit.mjs` | Guardrails |

---

## 10. Evolução

- Novo produto: fork dos tokens + seção 4; mantenha escala tipográfica e espaço.
- Nova narrativa de LP: arquivo `*-tokens` próprio; reutilize princípios da seção 6.
- Mudança global de marca IAM: edite `--ds-brand*` em `design-system.css` e os aliases `--asm-*` / login se a IDV pública acompanhar.

Quando em dúvida: **clareza > novidade**. Se o ajuste não melhora leitura, hierarquia ou decisão do operador, não entra no sistema.
