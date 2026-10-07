# Detector de live (opcional, gratuito)

O site mostra a seção **"Ao vivo"** só quando o canal do YouTube está transmitindo. Como um site estático não consegue
perguntar isso ao YouTube diretamente (bloqueio de CORS), usamos um mini-endpoint no Cloudflare Workers (plano gratuito).

## Publicar

1. Crie uma conta gratuita em https://dash.cloudflare.com e abra **Workers & Pages → Create → Create Worker**.
2. Cole o conteúdo de `live.js` e clique em **Deploy**.
3. Copie a URL gerada (algo como `https://ccv-live.seu-usuario.workers.dev`).
4. Em `js/config.js`, preencha: `liveEndpoint: 'https://ccv-live.seu-usuario.workers.dev'`.
5. (Recomendado) Em `live.js`, troque `ALLOWED_ORIGIN` pelo domínio real do site.

O site consulta o endpoint ao abrir a página e a cada 90 segundos enquanto ela estiver aberta.

## Testar o visual sem estar ao vivo

- `index.html?live=1` — mostra a seção com o player do canal.
- `index.html?live=ID_DO_VIDEO` — mostra a seção com um vídeo específico (útil para conferir o layout).

## Observações

- Foi testado que, com o canal fora do ar, o YouTube devolve a página do canal (resultado `live:false`). O caso
  "ao vivo" segue o comportamento documentado acima, mas só pode ser confirmado numa transmissão real.
- Se o YouTube mudar o HTML, o detector pode parar de identificar a live; a alternativa é a YouTube Data API v3
  (`search.list` com `eventType=live`), que exige uma chave de API.
