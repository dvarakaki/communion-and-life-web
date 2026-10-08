<div align="center">

<img src="assets/logo.png" alt="Casa Comunhão e Vida" width="96">

# Casa Comunhão e Vida

**Site oficial da Igreja Casa Comunhão e Vida · Freguesia do Ó, São Paulo/SP**

*Uma igreja, uma família e pastores que amam a sua vida.*

![Site estático](https://img.shields.io/badge/site-est%C3%A1tico-0A0908?style=flat-square)
![Sem build](https://img.shields.io/badge/build-nenhum-E8590C?style=flat-square)
![Sem dependências](https://img.shields.io/badge/depend%C3%AAncias-0-2F9E44?style=flat-square)
![Licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-555?style=flat-square)

</div>

---

## Sobre

Site institucional da igreja: apresenta a comunidade, a programação semanal, as mensagens mais recentes, as redes sociais, a forma de contribuir por PIX e como chegar. Foi desenhado para abrir rápido no celular, funcionar sem JavaScript pesado e respeitar a privacidade de quem visita.

## Destaques

- **Próximo encontro e contagem regressiva** calculados no fuso de São Paulo, com a programação semanal marcando "hoje", "próximo" e "acontecendo agora".
- **Seção "Ao vivo"** que só aparece quando o canal do YouTube está transmitindo (detector gratuito em Cloudflare Workers).
- **Player de mensagens** na própria página, com a lista dos cultos recentes.
- **PIX com QR Code** gerado no navegador (BR Code estático) e botão de copiar a chave.
- **Privacidade por padrão:** YouTube, Facebook e Google Maps só carregam depois do consentimento do visitante (LGPD). Veja [privacidade.html](privacidade.html).
- **Acessível e responsivo:** respeita `prefers-reduced-motion`, contraste AA, alvos de toque de 44 px.
- **Design system próprio** com tokens em [design-system/](design-system/MASTER.md).

## Stack

| Camada | Tecnologia |
|---|---|
| Páginas | HTML5 semântico |
| Estilo | CSS puro + design tokens (`design-system/tokens.css`) |
| Comportamento | JavaScript puro (ES2020), sem framework e sem etapa de build |
| Detector de live | Cloudflare Worker (opcional) em [worker/](worker/README.md) |
| QR Code do PIX | [`qrcode-generator`](https://github.com/kazuhikoarase/qrcode-generator) via cdnjs, com SRI |

## Estrutura

```
.
├── index.html            Página principal
├── privacidade.html      Política de privacidade e cookies
├── css/site.css          Estilos do site
├── js/
│   ├── boot.js           Marca cedo JS ativo e preferência de movimento
│   ├── config.js         Configuração editável (canal, endpoint da live, Facebook)
│   └── site.js           Comportamento da página
├── design-system/        Tokens e guia visual (MASTER.md)
├── assets/               Logos, ícones e fotos otimizadas (WebP)
├── worker/               Detector de live (Cloudflare Workers)
├── _headers              Cabeçalhos de segurança e cache
├── .assetsignore         Arquivos que não vão ao ar no deploy
└── _source/              Originais de marca e fotos (não publicar)
```

## Rodando localmente

Não há nada para instalar. Qualquer servidor estático serve:

```bash
python -m http.server 5173
```

Abra `http://localhost:5173`. Para ver a seção "Ao vivo" sem estar transmitindo, use `?live=1` (ou `?live=ID_DO_VIDEO`) no final do endereço.

## Configuração

Tudo o que muda com frequência fica em [js/config.js](js/config.js):

| Chave | Para que serve |
|---|---|
| `youtubeChannelId` | Canal do YouTube da igreja |
| `liveEndpoint` | URL do Worker que informa se há live (vazio = seção "Ao vivo" escondida) |
| `facebookPage` | Página exibida na seção "Redes" |

Os horários dos encontros ficam na seção "Programação" de [js/site.js](js/site.js). Ao trocar CSS ou JS, atualize o `?v=` nas tags de `index.html` para limpar o cache dos visitantes.

### Atualizando as mensagens

Cada culto é um item `<li class="sermon-row">` em `index.html`, com `data-video` (ID do vídeo, 11 caracteres), `data-title`, `data-meta` e `data-poster`. Copie um item existente e ajuste.

## Publicação

O site é 100 % estático e pode ir para Cloudflare Pages / Workers Static Assets, Netlify, Vercel ou GitHub Pages.

1. Publique a raiz do repositório (sem comando de build).
2. Ative HTTPS e force o redirecionamento de HTTP para HTTPS.
3. Confirme que o host aplica o arquivo [`_headers`](_headers). Cloudflare e Netlify aplicam automaticamente. Em outros hosts, replique os cabeçalhos na configuração.
4. Não publique `_source/`, `worker/` nem os `.md` internos. O [`.assetsignore`](.assetsignore) cuida disso no Cloudflare Workers Static Assets. Nos demais hosts, publique a partir de uma pasta ou branch que não os contenha.
5. (Opcional) Publique o [detector de live](worker/README.md) e preencha `liveEndpoint`.

## Segurança

| Medida | Onde |
|---|---|
| Content-Security-Policy restritiva, sem `unsafe-inline` para scripts | [_headers](_headers) |
| HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy` | [_headers](_headers) |
| Subresource Integrity no script de terceiro | [index.html](index.html) |
| IDs de vídeo validados antes de montar URLs de player | [js/site.js](js/site.js) |
| Conteúdo externo inserido com `textContent`, nunca `innerHTML` | [js/site.js](js/site.js) |
| Worker com CORS por allowlist (falha fechada) e somente `GET` | [worker/live.js](worker/live.js) |
| Embeds de terceiros só após consentimento | [js/site.js](js/site.js) |

Depois de publicar, confira a nota em [securityheaders.com](https://securityheaders.com).

**Encontrou uma vulnerabilidade?** Avise de forma privada, pelo WhatsApp da igreja ou pelo recurso *Report a vulnerability* da aba Security do GitHub, antes de divulgar.

## Contribuindo

1. Crie um branch a partir de `main`.
2. Mantenha o padrão do código existente: HTML semântico, CSS por tokens, JS sem dependências.
3. Teste no celular e com `prefers-reduced-motion` ligado.
4. Abra um Pull Request descrevendo o que mudou e por quê.

## Créditos e licença

Código sob licença [MIT](LICENSE). **Logo, fotos e textos da igreja** são de uso exclusivo da Igreja Casa Comunhão e Vida e não estão cobertos pela licença do código.
