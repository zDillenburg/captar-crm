# Design Brief: Dashboard (dashboard.html)

## Problema

O corretor que assina o Grupo Captar entra no painel várias vezes por dia — pra ver leads novos, marcar uma visita, checar o financeiro, gerar uma descrição na Captar IA. Hoje esse painel funciona, mas parece uma ferramenta interna, não o produto de alto padrão que a landing e o link público já entregam: fonte diferente do resto da marca, quase nenhuma animação fora do widget da Captar IA, e uma navegação mobile que esconde 12 das 18 seções atrás de um hambúrguer que só reabre o menu inteiro do desktop. É o ambiente onde o corretor passa mais tempo dentro do produto, e é o que menos reflete o cuidado que o Grupo Captar quer transmitir.

## Solução

O painel passa a ser reconstruído em cima do mesmo sistema visual da landing e do link público — mesma tipografia, mesma paleta, mesmo vocabulário de movimento — mas isso acontece em fases, não de uma vez: primeiro a fundação (tokens, shell de navegação, componentes compartilhados) aplicada ao shell inteiro e a uma página piloto, depois o resto das páginas migra em grupos pequenos e revisáveis. Cada página que passa pela migração troca sua renderização de string HTML solta por componentes de verdade (card, tabela, estado vazio) — o resto do código continua como está até chegar sua vez. No mobile, a navegação deixa de depender de reabrir o menu inteiro do desktop: o caminho pras 12 seções que não cabem na barra fixa vira um destino organizado por conta própria, não um hambúrguer genérico.

## Experience Principles

1. **Fundação antes de fachada** — nenhuma página é "redesenhada" isoladamente sem antes existir um sistema (tokens, componentes, nav) que todas vão compartilhar. Resolve a tensão entre "quero ver resultado rápido" e "não quero 18 estilos ligeiramente diferentes depois".
2. **Migrar sem quebrar** — cada PR troca uma fatia pequena e testável do produto real (com dados reais de corretor), nunca uma reescrita de uma vez que arrisca o painel inteiro parar de funcionar no meio da migração.
3. **Denso, não decorado** — é uma ferramenta de trabalho usada várias vezes por dia; animação e refinamento visual servem pra deixar a informação mais fácil de escanear e a ação mais clara, nunca pra competir por atenção com os dados.

## Aesthetic Direction

- **Philosophy**: mesma linguagem "corporativo elegante, alto padrão" da landing e do link público — aqui aplicada a uma ferramenta de produtividade densa em dados, não a uma vitrine. Pensar em dashboards financeiros/B2B premium (Linear, Stripe Dashboard, Notion) mais do que em apps de consumo.
- **Tone**: eficiente e confiável. O corretor está trabalhando, não sendo vendido algo — cada tela deve deixar claro "onde estou, o que preciso fazer, o que aconteceu" o mais rápido possível.
- **Reference points**: o `index.html` e as páginas públicas pós-redesign (paleta, tipografia, tratamento de card, easing) como vocabulário visual; dashboards B2B densos (Linear, Stripe, Notion) como referência de como comunicar muita informação sem virar bagunça.
- **Anti-references**: o estado atual do próprio `dashboard.html` (utilitário demais, sem identidade própria); qualquer coisa que pareça um admin genérico de biblioteca de componentes sem curadoria.

## Existing Patterns

**Tokens atuais do dashboard** (a substituir pelo sistema unificado):
```css
--p:#850277;--pl:#a3039a;--pd:#620158;
--bg:#0f0d0b;--bg2:#161310;--bg3:#1c1916;--bg4:#221e1b;
--border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);
--t1:#fffdea;--t2:rgba(255,253,234,.65);--t3:#8a8070;
--green:#22c55e;--amber:#f59e0b;--red:#ef4444;--blue:#3b82f6;
--sw:260px;--th:64px;--r:8px;--r2:12px;
font-family: 'Inter', sans-serif;
```
Já é a mesma paleta roxa em espírito (`--p`≈`--purple`, `--pl`≈`--purple-light`), só com nomes e valores de opacidade diferentes dos tokens novos (`--purple`, `--purple-light`, `--base`, `--surface`, `--surface-2`, `--t-100/70/55/40/28`) usados no `index.html` e nas páginas públicas. **Decisão confirmada com o cliente**: unificar nos tokens novos, incluindo trocar `Inter` por `Manrope`. As cores semânticas (`--green/--amber/--red/--blue`) e a escala de raio (`--r/--r2`) não existem no sistema novo — precisam ser adicionadas a ele como extensão (não existiam porque a landing/páginas públicas não tinham necessidade de status semântico de dados).

**Componentes a preservar/estender** (existem, mas com estilos ad hoc — viram componentes de verdade nas páginas migradas): `.card`/variantes de KPI e lead card, `.modal-overlay/.modal-box` etc., `.slide-over` (painel lateral), `.toast/.toast-container`, `.status-badge`/`.badge-actv/.badge-block`, `.btn-add/.btn-submit/.btn-cancel/.btn-del/.btn-danger`, `.chip/.chip-pop`, `.form-input/.config-select`, `.avatar`.

**Não existem hoje e precisam ser criados como parte da fundação**: um componente de **tabela** genérico (hoje cada tabela é HTML solto por página) e um componente de **estado vazio** genérico (hoje "Nenhum lead cadastrado" etc. são blocos inline duplicados). Esses dois são provavelmente o maior ganho de consistência pro esforço, porque aparecem em quase toda página.

**Animação já existente** (base real a estender, não reinventar): 13 `@keyframes` (`fadeUp`, `slideUp/Down`, `chipPop`, e o vocabulário todo do widget da Captar IA — `captarIaFabIn/FadeUp/MsgIn/Dot/OrbSpin/TabIn`, `aiOrbPulse`, `aiSkeletonShimmer`). O widget da Captar IA já é, de longe, a parte mais polida do dashboard hoje — é a melhor referência interna de "como deveria ser o resto".

**Preservar sem alteração** (lógica de negócio, fora de escopo de design): toda a integração Supabase (81 `_sb.from(...)` espalhados), RLS/permissões, lógica de cada página (CRM, financeiro, contratos etc.) — o brief cobre a camada visual/estrutural, não a lógica de dados por trás dela.

## Component Inventory

| Componente | Status | Notas |
|---|---|---|
| Sidebar (desktop) | Modificar | Novo visual; repensar agrupamento dos 17 itens (hoje é uma lista plana) — considerar seções (Operacional / Financeiro / Ferramentas / Config) pra escanear mais rápido. |
| Topbar + hambúrguer (mobile) | Modificar | Ver "Key Interactions" — o destino do hambúrguer muda, não só o visual do botão. |
| Bottom nav mobile (5 itens fixos) | Modificar | Mesmo princípio de hoje (5 fixos + acesso ao resto), com o "resto" reorganizado — ver Key Interactions. |
| AI FAB (atalho pra Captar IA) | Existe | Manter — já funciona bem, só herda o novo tratamento visual. |
| KPI card | Modificar | Base visual nova; usado em Dashboard, Financeiro, Relatórios. |
| Lead card (CRM) | Modificar | Base visual nova; card mais denso de informação do produto. |
| Modal (`.modal-overlay/.modal-box`) | Modificar | Reskin — estrutura/comportamento atual preservados. |
| Slide-over (painel lateral) | Modificar | Reskin — usado pra detalhe de item sem sair da lista. |
| Toast | Modificar | Reskin rápido — feedback de ação (salvo, erro, etc.). |
| Badge de status | Modificar | Cores semânticas (`--green/--amber/--red`) migram pro sistema novo como extensão. |
| Chip de filtro | Modificar | Mesmo padrão já usado no filtro novo do link público — reaproveitar o CSS de lá como ponto de partida. |
| **Tabela genérica** | **Novo** | Substituir HTML solto por linha; usada em várias páginas (contratos, pagamentos, corretores etc.) — criar uma vez, aplicar às páginas migradas. |
| **Estado vazio genérico** | **Novo** | Ícone + mensagem + ação, consistente em toda página que hoje tem uma versão inline própria. |
| Widget Captar IA | Preservar | Já é o mais polido — herda pequenos ajustes de token, não uma reconstrução. |

## Key Interactions

**Navegação mobile** (resolve a dor identificada: 12 de 18 seções só via hambúrguer reabrindo o menu desktop inteiro)
- O hambúrguer deixa de abrir uma cópia da sidebar de desktop e passa a abrir um destino próprio pra mobile: menu organizado por grupo (ex: Operacional, Financeiro, Ferramentas, Configurações), com alvos de toque do tamanho certo pra mobile — não uma sidebar de 260px espremida.
- Os 5 itens fixos da barra inferior continuam sendo os de maior frequência de uso — a lista atual (Dashboard, CRM, Imóveis, Calendário, Financeiro) é o ponto de partida; ajustar essa lista, se fizer sentido, é uma decisão a confirmar com o cliente durante a implementação, não algo a travar aqui no brief.
- Captar IA continua com atalho direto (FAB), fora da disputa por uma das 5 vagas fixas — já resolvido hoje, só preservar.

**Migração de página (fundação → piloto → resto)**
- Fase 1 (fundação): tokens novos, shell (sidebar + topbar + nav mobile), e os dois componentes novos (tabela, estado vazio) aplicados a **uma página piloto** — a página `Dashboard` (overview) é a candidata natural: é a primeira tela que todo corretor vê, e já reúne KPI cards, agenda e o widget da Captar IA, então valida o essencial do sistema novo num escopo controlado.
- Fases seguintes: páginas migram em grupos pequenos (2-3 por PR), cada uma trocando sua renderização ad hoc pelos componentes novos — ordem de prioridade a definir com o cliente por PR, mas páginas de alto tráfego (CRM, Financeiro, Calendário) fazem sentido vir logo depois do piloto.

**Cards e tabelas**
- Cards ganham a mesma resposta a hover/tap com profundidade real já estabelecida no link público (sombra que cresce, leve translação) — consistência de "toque" entre as duas partes do produto.
- Tabelas novas: cabeçalho fixo em listas longas, linha com feedback de hover, ação primária sempre visível sem exigir hover (o painel também é usado em tablet/touch).

## Responsive Behavior

- Desktop: sidebar fixa (260px), como hoje — só o visual muda.
- Tablet: sidebar provavelmente colapsa pra ícones-only com tooltip (comportamento a validar durante o piloto — hoje o breakpoint tablet não é tratado como caso distinto, só desktop e mobile).
- Mobile: barra inferior de 5 + hambúrguer redesenhado (ver Key Interactions) — nenhuma tabela ou modal pode quebrar layout abaixo de ~375px de largura.

## Accessibility Requirements

- Contraste mínimo AA (4.5:1) em ambos os temas (dark/light) — o dashboard já tem `body.light-mode`, então essa base existe; validar os novos valores de token nos dois modos, mesmo cuidado já aplicado no `index.html` e nas páginas públicas.
- Todo modal e slide-over precisa de foco preso (focus trap) e fechar com Escape — validar se já existe; se não, é parte da modificação, não um "bônus".
- Tabela nova: navegável por teclado, cabeçalhos de coluna com semântica correta (`<th scope="col">`).
- Toda animação nova respeita `prefers-reduced-motion`, mesmo padrão já usado no resto do produto.

## Rollout Plan (fases)

1. **Fundação**: tokens unificados (+ extensão de cores semânticas e escala de raio), shell de navegação (sidebar, topbar, nav mobile redesenhada), componentes de Tabela e Estado Vazio, aplicados à página **Dashboard (overview)** como piloto.
2. **Validação do piloto**: revisar com dados reais de corretor, em desktop e mobile, luz e escuro, antes de seguir — é o ponto de checar se o sistema novo aguenta a densidade de dados real do produto.
3. **Migração em grupos**: páginas restantes migram 2-3 por PR, cada uma revisável e testável isoladamente, em ordem de prioridade a definir com o cliente (alto tráfego primeiro é a recomendação, mas a decisão final é dele por PR).
4. Cada PR desta fase segue o mesmo padrão já validado nas páginas públicas: teste com dados reais do Supabase antes de mergear, não só inspeção visual do código.

## Out of Scope

- Qualquer mudança de schema no Supabase, RLS ou lógica de negócio das páginas (CRM, financeiro, contratos etc.) — este brief é sobre a camada visual/estrutural.
- Reescrever a arquitetura de dados/estado do dashboard (segue single-file, sem build step, mesmo padrão do resto do projeto).
- Migrar todas as 18 páginas num único esforço — está explicitamente faseado (ver Rollout Plan).
- Página `page-admin` (painel administrativo interno) — só entra na fila de migração como as demais páginas, sem tratamento especial neste brief.
- Landing page e páginas públicas do corretor — já redesenhadas, fora de escopo aqui.
