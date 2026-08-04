# Design Brief: Link Público do Corretor (corretor-publico.html + imovel-publico.html)

## Problema

Um cliente final recebe um link no WhatsApp — a página do corretor, ou de um imóvel específico — e abre no celular, muitas vezes com conexão fraca, sem contexto prévio do Grupo Captar. Hoje essa página funciona, mas parece um formulário preenchido: uma foto, um nome, uma grade de cards, sem nenhuma sensação de movimento ou cuidado. Se o corretor investe numa apresentação de alto padrão em todo o resto (landing, painel), esse link — que é literalmente o que o cliente final dele vê — não pode ser o elo mais fraco da cadeia. E quando o corretor tem muitos imóveis publicados, o cliente não tem nenhuma forma de restringir a lista: rola uma grade inteira até achar o que interessa, ou desiste.

## Solução

As duas páginas passam a carregar como uma vitrine de alto padrão, não como uma lista de banco de dados renderizada. Entrada de conteúdo em camadas (perfil, depois estatísticas, depois grade), cards de imóvel com profundidade e resposta ao toque, e uma área de filtro na página do corretor que deixa o cliente final reduzir a lista por tipo, status, preço e quartos — ou buscar direto por endereço/bairro — sem sair da página nem esperar uma nova consulta ao banco (os dados já estão todos carregados). Tudo isso correndo no vocabulário visual novo da landing (roxo, `--t-100`/`--surface`, Manrope), mas com peso de carregamento mínimo: nada de cena 3D aqui, essa página tem que abrir rápido no 4G do cliente do corretor.

## Experience Principles

1. **Rápido primeiro, bonito depois** — nenhuma animação pode atrasar o cliente enxergar preço, endereço e o botão de WhatsApp. Se a escolha for entre um efeito legal e 300ms a mais de carregamento numa conexão fraca, o efeito perde.
2. **Reduzir antes de rolar** — com uma lista de imóveis grande, a prioridade é deixar o cliente final chegar no que interessa com filtro/busca, não obrigar scroll infinito.
3. **A mesma marca em todo lugar** — quem viu a landing e depois abre esse link não pode sentir que caiu num site diferente. Cor, tipografia e sensação de acabamento seguem o sistema novo do `index.html`.

## Aesthetic Direction

- **Philosophy**: Extensão direta da linguagem "corporativo elegante, prédio de alto padrão" já validada na landing — aqui aplicada a um contexto de produto/vitrine, não de marketing. Menos espetáculo, mesma qualidade de acabamento.
- **Tone**: Confiante e prático. É o momento em que o cliente final decide se vale a pena mandar mensagem — o tom é "aqui está tudo que você precisa saber, claro e rápido", não "olha que incrível somos".
- **Reference points**: O próprio `index.html` pós-redesign (paleta, tipografia, tratamento de card); apps de portfólio imobiliário premium (Zillow "premier agent" pages, sites de arquitetura) pela limpeza e hierarquia de card.
- **Anti-references**: Estado atual das duas páginas (plano demais, sem hierarquia de entrada); a landing antiga rejeitada ("jornal", "vazio"); qualquer coisa que pareça um formulário de admin renderizado pro público.

## Existing Patterns

Devem ser **adotados e estendidos** (troca de sistema de tokens, decisão já confirmada com o cliente):

- **Tipografia**: trocar Inter (atual destas páginas) por Manrope (`font-family: 'Manrope', ...`), igual ao `index.html`.
- **Cores**: trocar `--p:#850277 / --pl:#a3039a / --bg:#000000 / --bg2:#111111 / --t1:#f5f5f7` (sistema atual, só destas duas páginas) pelo sistema do `index.html`: `--purple:#850277`, `--purple-light:#a3039a`, `--purple-dark:#620158`, `--black:#100e0d`, `--ink:#0a0908`, `--base:#100e0d`, `--surface:#17140f`, `--surface-2:#1d1916`, `--t-100:#fffdea`, `--t-70/--t-55/--t-40/--t-28` (opacidades sobre `#fffdea`), `--line/--line-mid/--line-strong`. **Atenção**: `perfil.cor_destaque` (cor customizada por corretor, salva no Supabase) hoje sobrescreve `--p`/`--pl` em runtime — ao trocar de token, o mesmo mecanismo de override tem que continuar funcionando em cima de `--purple`/`--purple-light`.
- **Modo claro**: manter o toggle de tema já existente (`body.light-mode`, `localStorage`) — é uma funcionalidade real, não descartar. Só precisa dos equivalentes light dos novos tokens (o `index.html` hoje é dark-only, então essa parte é nova — ver Componente Inventory).
- **Raio/sombra/spacing**: pode adotar `--r-xs/--r-sm/--r/--r-lg` e o ritmo de espaçamento do `index.html` no lugar dos valores soltos atuais (`border-radius:18px`, `22px` etc. hardcoded).
- **Easing**: usar `--ease: cubic-bezier(.16,1,.3,1)` (já usado em ambos os sistemas, coincidência feliz) para consistência de movimento com a landing.

Devem ser **preservados sem alteração** (lógica de dados/negócio, não é escopo deste brief):

- Toda a lógica de fetch Supabase (`_sb.from('perfil_publico')`, `_sb.from('imoveis')`, resolução de slug via `/c/:slug` rewrite, fallback pra `?id=`).
- As chamadas de analytics (`registrar_evento_imovel_publico` para `view` e `whatsapp`).
- A geração dos links de WhatsApp (`waPhoneBR`, texto pré-preenchido).
- `escHtml()` em todo conteúdo vindo do banco — nenhuma mudança visual pode reintroduzir um vetor de XSS.
- Fallbacks de avatar/logo (iniciais quando não há foto) e emoji fallback nos cards de imóvel sem foto.

## Component Inventory

| Componente | Status | Notas |
|---|---|---|
| Header + logo + toggle de tema | Existe | Portar pro novo token system; manter função. |
| Banner + avatar do corretor | Existe | Adicionar entrada em camadas (banner → avatar → nome → stats), não só fade único. |
| Stat row (imóveis / CRECI / especialidade) | Existe | Estética nova; considerar leve destaque numérico como no `index.html`. |
| **Barra de filtro/busca** | **Novo** | O pedido central do cliente. Ver "Key Interactions" abaixo pro comportamento. |
| Grade de cards de imóvel (`im-grid`) | Modificar | Cards com mais profundidade (hover/tap response), animação de entrada escalonada, e devem reagir ao filtro em tempo real. |
| Card de imóvel individual | Modificar | Manter dados (preço, endereço, quartos, área, status, destaque) — só o tratamento visual/animação muda. |
| Estado vazio (sem imóveis / filtro sem resultado) | Modificar | Hoje só existe "nenhum imóvel público" — precisa também de um estado "nenhum resultado pro filtro atual", com ação de limpar filtro. |
| Sticky CTA WhatsApp | Existe | Manter comportamento e prioridade visual — é a conversão principal da página. |
| Galeria + lightbox (`imovel-publico.html`) | Existe | Já é o componente mais elaborado das duas páginas — só precisa do novo token system, manter toda a lógica de teclado/navegação. |
| Card do corretor dentro do imóvel | Existe | Portar visual; manter link pro perfil. |
| Specs grid, features/diferenciais | Existe | Portar visual. |
| Skeleton de carregamento | Modificar | Hoje é um ícone estático + "Carregando…"; trocar por um skeleton que já sugere o layout final (evita "pulo" de conteúdo ao carregar). |

## Key Interactions

**Filtro/busca (corretor-publico.html)**
- Barra de filtro aparece só quando há imóveis suficientes pra justificar (ex: acima de ~4-6 itens) — com poucos imóveis, filtro é ruído.
- Filtros: tipo de imóvel, status (à venda / alugado / vendido — usar os valores reais já salvos em `im.status`), faixa de preço (min/max), quartos mínimos, e um campo de busca livre (endereço/bairro/título).
- Tudo client-side: a lista completa já está em memória (`lista`), então cada mudança de filtro re-renderiza a grade na hora, sem chamada de rede — deve parecer instantâneo.
- Contagem de resultados visível ("8 de 14 imóveis") e forma clara de limpar todos os filtros de uma vez.
- Estado vazio de filtro (zero resultados) é diferente do estado vazio "sem imóveis publicados" — precisa de mensagem e CTA de limpar filtro específicos.

**Entrada de conteúdo (ambas as páginas)**
- Substituir o fade único atual por uma sequência em camadas com leve atraso entre grupos (banner/hero → identidade → stats → conteúdo principal) — já existe uma base disso (`.fade-up.d1/.d2/.d3`), a ideia é estender esse padrão com mais refinamento, não reinventar do zero.
- Cards da grade entram com stagger sutil (cada card um pouco atrás do anterior) na carga inicial e ao aplicar/limpar um filtro.

**Cards de imóvel**
- Resposta a hover (desktop) e a toque (mobile) mais expressiva que o `translateY(-4px)` atual — profundidade real (sombra que cresce, leve escala na imagem), consistente com o tratamento de card do `index.html`.

**Galeria (imovel-publico.html)**
- Manter toda a interação atual (thumbs, lightbox com teclado, swipe seria um bônus se comportar bem em mobile, mas não é obrigatório pro escopo).

## Responsive Behavior

- Mobile-first de verdade — a maioria dos cliques em links de WhatsApp abre no celular. Todo layout, incluindo a barra de filtro, tem que funcionar primeiro em ~375-430px de largura antes de escalar pra desktop.
- Barra de filtro em mobile: provavelmente colapsa pra um botão "Filtrar" que abre um painel/bottom-sheet, em vez de ocupar espaço permanente no topo da grade — evita empurrar o conteúdo principal pra baixo da dobra.
- Sticky CTA de WhatsApp continua fixo no rodapé em todas as larguras — não pode ser coberto por nenhum elemento novo (painel de filtro, etc.).
- Grade de imóveis: 1 coluna em mobile, 2+ em tablet/desktop (como já é hoje via `auto-fill`), sem alteração no princípio, só no polish visual.

## Accessibility Requirements

- Contraste mínimo AA (4.5:1) pra texto normal em ambos os temas (dark/light) — mesmo cuidado que já foi aplicado no `index.html` (`--t-40`/`--t-28` foram ajustados lá justamente por isso).
- Barra de filtro: todos os controles alcançáveis por teclado, `aria-label` nos campos, e o resultado da filtragem anunciado de forma que não dependa só de cor/posição.
- Lightbox: manter navegação por teclado já existente (Escape, setas) — não regredir.
- Nenhuma animação de entrada deve ignorar `prefers-reduced-motion` — o padrão atual (`@media(prefers-reduced-motion:no-preference)`) já faz isso corretamente e deve ser mantido/estendido pras novas animações.

## Out of Scope

- Qualquer alteração de schema no Supabase ou nova tabela/coluna — o filtro é 100% sobre os campos que já existem em `imoveis`.
- Busca/filtro no lado do servidor, paginação ou lazy-loading da lista de imóveis — a lista inteira já vem de uma vez e continua assim.
- Fundo 3D/WebGL ou qualquer dependência pesada nova nestas páginas (decisão confirmada com o cliente: leve e rápido).
- Mudanças na página de edição do perfil público dentro do dashboard (`dashboard.html`) — esse brief cobre só as páginas públicas que o cliente final vê.
- SEO/Open Graph avançado (as páginas já têm `robots: noindex`, então não são indexadas por design — isso não muda aqui).
- Página do dashboard em geral — é um brief separado.
