# Orleans — transmissão de tela no navegador

Salas por código/link, compartilhamento de tela (com áudio do sistema), voz e lista de participantes.
Servidor Node **sem dependências** (HTTP + SSE para sinalização) e WebRTC P2P no navegador.

## Como rodar
```bash
npm start          # Node 18+  →  http://localhost:3000
```
> Compartilhar tela/microfone exige **HTTPS** (ou localhost). Em produção, use um proxy com certificado (Caddy, Nginx, Cloudflare).

## Estrutura
```
server/                 Backend
  index.js              Servidor HTTP, rotas da API e arquivos estáticos
  rooms.js              Estado das salas, participantes e eventos
  config.js             Porta, prefixo do código da sala, servidores STUN/TURN
public/                 Frontend
  index.html            Tela inicial (nome, criar sala, entrar por código)
  sala.html             Sala (participantes, palco, controles)
  assets/
    css/                base.css · home.css · room.css
    img/                logo.svg · hero.svg   ← troque pelos seus
    js/
      config/site.js    ✏️ Nome, textos, cores e imagens do site
      core/             api.js (requisições) · rtc.js (WebRTC)
      ui/dom.js         Ícones, tema e aplicação dos textos
      pages/            home.js · room.js
```

## Como personalizar tudo
1. **Nome, textos, cores, logo e fundo:** `public/assets/js/config/site.js`
2. **Imagens:** substitua `public/assets/img/logo.svg` e `hero.svg`
3. **Prefixo do código (ex.: ABCD-X7K2):** `server/config.js` → `codePrefix`
4. **Rede restritiva / mais de ~6 pessoas:** adicione um servidor TURN em `server/config.js`.
