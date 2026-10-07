// Cloudflare Worker: informa se o canal do YouTube está ao vivo.
// Resposta: { "live": true|false, "videoId": "...", "title": "..." }
//
// Como funciona: o YouTube redireciona /channel/<ID>/live para o vídeo da transmissão
// quando o canal está ao vivo (a página passa a ter "isLiveNow":true e o canonical vira
// watch?v=<ID>). Não precisa de chave de API.

const CHANNEL_ID = 'UC_sjEfh6Hs3HuULlfOvLpEw';
const ALLOWED_ORIGIN = '*'; // em produção, troque pelo domínio do site, ex.: 'https://casacomunhaoevida.com.br'

const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, max-age=30',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    let body = { live: false };
    try {
      const res = await fetch(`https://www.youtube.com/channel/${CHANNEL_ID}/live`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          Cookie: 'CONSENT=YES+1; SOCS=CAI',
        },
        cf: { cacheTtl: 30, cacheEverything: true },
      });
      const html = await res.text();
      const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '';
      const videoId = (canonical.match(/watch\?v=([\w-]{11})/) || [])[1];
      const isLive = /"isLiveNow":true/.test(html);
      if (videoId && isLive) {
        const title = (html.match(/<meta property="og:title" content="([^"]*)"/) || [])[1] || '';
        body = { live: true, videoId, title: decodeEntities(title) };
      }
    } catch (e) {
      body = { live: false, error: true };
    }
    return new Response(JSON.stringify(body), { headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
  },
};

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
