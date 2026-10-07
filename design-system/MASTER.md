# Casa Comunhão e Vida — Design System (MASTER)

Fonte da verdade visual do site. Tokens em `tokens.json` → gerados em `tokens.css`:

```bash
node ~/.claude/skills/design-system/scripts/generate-tokens.cjs --config design-system/tokens.json -o design-system/tokens.css
```

## De onde vem a identidade

Pesquisa feita em outubro de 2026 no Instagram (@casacomunhaoevida), no Linktree e na página do Facebook.

| Fonte | O que foi extraído |
|---|---|
| Logo (perfil e destaques) | Casa em traço arredondado + chama de duas línguas (Espírito Santo). **Preto e branco puros.** |
| Posts de culto/série | Fundo de **fogo**: âmbar → laranja → marrom-brasa → preto. Títulos em **sans condensada, caixa alta, peso alto**, misturada com **serifa/script itálica** ("Novo *tempo*", "Batalhando *pela fé*"). Pequena cruz ✝ como ornamento. |
| Destaques | Conf 2022–2025, Min. infantil ("Kids" em laranja), Encontro de Casais, YouTube, Agenda, Oferta, Jovens |
| Encontro de Mulheres | Rosa suave e florais (sub-marca) |
| Bio | Terça 9h Oração · Quarta 20h Culto Profético · Domingo 9h Discipulado / 10h Celebração |
| Post institucional | 25 anos, começo como célula na casa da Pra. Marli, Freguesia do Ó; valores: Oração, Acolhimento, Família; Palavra profética; Espírito Santo é a fonte de vida; Jesus é o Centro; Reino em primeiro lugar. Pr. Luís Fernando e Pra. Patrícia |
| Linktree | Slogan "Aqui você tem uma igreja, uma família e pastores que amam a sua vida." + YouTube, WhatsApp, Facebook |

> A busca automática do ui-ux-pro-max sugeriu "roxo espiritual + Fredoka" (padrão genérico para igrejas). Essa sugestão foi **descartada** porque contradiz a marca real; ficaram só as regras de UX (contraste, alvos de 44px, motion 150–300ms, reduced-motion).

## Cores

| Papel | Token | Valor | Uso |
|---|---|---|---|
| Marca / tinta | `--color-primary` | `#0A0908` | Hero, seções escuras, botões secundários |
| Fundo | `--color-background` | `#FAF7F2` | Off-white quente (não branco frio) |
| Acento | `--color-accent` | `#D9480F` | CTA, eyebrows, destaques (4.6:1 sobre branco) |
| Acento vivo | `--color-accent-bright` | `#F26B1D` | Brilhos, ícones sobre fundo escuro |
| Acento suave | `--color-accent-soft` | `#FDBA74` | Itálicos sobre fundo escuro |
| Brilho | `--color-glow` | `#FBBF24` | Topo do gradiente de fogo |
| Texto secundário | `--color-muted` | `#6B645C` | 5.5:1 sobre o fundo |

**Gradiente de fogo** (`--fire-gradient` em `site.css`): radial do âmbar → fire-500 → fire-800 → ink-950. Usado em cards de mensagem, Culto de Celebração, Conferência e Ofertas — com moderação (no máximo 1–2 por dobra).

Sub-marcas: **Kids** = laranja sólido + amarelo; **Mulheres** = rosa `#F2B8C6`/`#C2456A`.

## Tipografia

| Papel | Fonte | Regras |
|---|---|---|
| Display | **Archivo** (eixo `wdth`) | `font-stretch: 68–80%`, peso 800–900, CAIXA ALTA, tracking negativo. Ecoa os títulos dos posts. |
| Acento | **Instrument Serif** itálico | Apenas em 1–3 palavras emocionais por título (*amam a sua vida*, *Palavra*, *incendeia*). Nunca em caixa alta. |
| Corpo | **Inter** 400–700 | 16px mínimo, line-height 1.6. |

## Componentes-chave

- **Botão primário**: pílula laranja (`--button-*`), 48px de altura, sombra de brilho, reflexo que atravessa no hover, efeito magnético (só mouse).
- **Card de mensagem**: a própria arte do post (proporção original, alinhada pela base), inclinação 3D + brilho seguindo o cursor, rail arrastável com barra de progresso.
- **Card de próximo encontro**: vidro escuro, contagem regressiva no fuso de São Paulo (dígitos "caem" a cada troca), vira "Acontecendo agora" durante o culto. No desktop, pilha de 3 fotos "distribuídas" atrás dele.
- **Foto** (`.photo`, `.tile__photo`, `.shot`): WebP em `assets/photos/` (`-sm` = 480px, sem sufixo = 960px). Originais em `_source/instagram/` (fora do site).
- **Botão Topo**: anel = progresso da página; quando a rolagem para por 1,2s ele expande com o rótulo "Topo" (no mobile só muda de cor e pulsa).
- **Barra de ações mobile** (< 768px): Horários · Visite · WhatsApp, flutuante, aparece após metade da primeira tela.

## Motion

| Efeito | Onde | Detalhe |
|---|---|---|
| Títulos palavra a palavra | todos os `h2[data-split]` e o h1 | máscara + subida, 55ms entre palavras |
| Reveal ao rolar | `.reveal` | 800ms, `cubic-bezier(.22,1,.36,1)`, stagger 70ms |
| Foto que se abre | `.reveal-img` | `clip-path` de baixo para cima + zoom-out |
| Parallax | hero (texto sobe e some), pilha de fotos, foto dos pastores | `transform` apenas |
| Parágrafo que acende | "Nossa história" | palavras ganham opacidade conforme a rolagem |
| Linha do tempo | "Nossa história" | linha laranja preenche e marca cada etapa |
| Marquees com inércia | faixa de valores + 2 fileiras da galeria | aceleram e inclinam (skew) com a velocidade da rolagem; galeria desacelera no hover |
| Menu inteligente | nav | some ao descer, volta ao subir |
| Barra de progresso | topo da página | gradiente fogo |
| Menu mobile | drawer | abre em círculo a partir do botão, links em cascata |
| Brasas | hero (canvas) | sobem mais rápido quando se rola |

O loop de animação só roda enquanto há rolagem ou um marquee visível (economia de bateria). Tudo é desligado com `prefers-reduced-motion` (galeria vira carrossel estático).

## Novidades desta versão

- **Ao vivo**: seção que só aparece quando o canal do YouTube está transmitindo (botão "Ao vivo" no menu, cartão do hero vira "Ao vivo agora"). Precisa do endpoint em `worker/` (ver `worker/README.md`) preenchido em `js/config.js`. Teste visual: `?live=1`.
- **Redes**: feed da página do Facebook embutido (carrega só quando chega perto) + cartões de YouTube, Instagram, Facebook e WhatsApp.
- **Abertura** com o logo se desenhando (1x por sessão), **faixa gigante** ligada à rolagem, **menu com pílula deslizante**, **ondas nos botões**, **inclinação 3D** nos cards, **scroll suave** com easing próprio, **ticker de palavras** no hero (acelera com a rolagem).
- **Animações**: o site respeita "reduzir movimento" do sistema, mas mostra um aviso com botão "Ativar" e há um alternador no rodapé (preferência salva no navegador).

## Pendências para produção

1. Pedir à igreja os originais das fotos e autorização de uso de imagem (as atuais vieram do Instagram, em até 1254px).
2. Publicar o detector de live (`worker/live.js`) e preencher `liveEndpoint` em `js/config.js`.
2b. Endereço completo (não está público em nenhuma das fontes) e o pino do mapa.
3. ~~Chave PIX oficial~~ (CNPJ 05.136.068/0001-16, Caixa — já aplicada no site).
4. Links diretos para as playlists/vídeos de cada série no YouTube.
5. Arte oficial do logo em SVG (o atual foi redesenhado a partir da foto de perfil).
