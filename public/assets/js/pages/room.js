import { $, applyBrand, setIcon } from '../ui/dom.js';
import { api } from '../core/api.js';
import { Mesh } from '../core/rtc.js';

applyBrand();
let code = decodeURIComponent(location.pathname.split('/').pop()).toUpperCase();
const myName = localStorage.getItem('tv:name');
if (!myName) location.replace('/?sala=' + code);

const S = { me: null, token: null, owner: null, presenter: null, peers: new Map(), streams: new Map(), micStream: null, mic: false, deaf: false, screen: null };
const el = Object.fromEntries(['code', 'status', 'count', 'peers', 'screen', 'empty', 'live', 'liveText', 'alert', 'voices', 'modal', 'btnMic', 'btnDeaf', 'btnShare', 'btnCopy', 'btnRotate', 'btnClose'].map(id => [id, $('#' + id)]));
const post = (action, body = {}) => api(`rooms/${code}/${action}`, { token: S.token, ...body });

function alertMsg(m) { el.alert.textContent = m; el.alert.hidden = !m; if (m) setTimeout(() => (el.alert.hidden = true), 6000); }

async function init() {
  let j, cfg;
  try { cfg = await api('config'); j = await api(`rooms/${code}/join`, { name: myName }); }
  catch { return location.replace('/?erro=notfound'); }
  Object.assign(S, { me: j.me, token: j.token, owner: j.ownerId, presenter: j.presenter });
  j.peers.forEach(p => S.peers.set(p.id, p));

  S.mesh = new Mesh({
    me: S.me, iceServers: cfg.iceServers,
    send: (to, data) => post('signal', { to, data }).catch(() => {}),
    onTrack: (peerId, _t, stream) => { S.streams.set(stream.id, { stream, peerId }); render(); },
  });
  S.peers.forEach((_, id) => id !== S.me && S.mesh.connect(id));

  const es = new EventSource(`/api/rooms/${code}/events?token=${S.token}`);
  const on = (ev, fn) => es.addEventListener(ev, e => fn(JSON.parse(e.data)));
  es.onopen = () => { el.status.textContent = 'Conectado'; el.status.className = 'status ok'; };
  es.onerror = () => { el.status.textContent = 'Reconectando…'; el.status.className = 'status'; };
  on('peer-joined', p => { S.peers.set(p.id, p); S.mesh.connect(p.id); render(); });
  on('peer-left', ({ id }) => { S.peers.delete(id); S.mesh.close(id); S.streams.forEach((v, k) => v.peerId === id && S.streams.delete(k)); render(); });
  on('peer-update', p => { S.peers.set(p.id, { ...S.peers.get(p.id), ...p }); render(); });
  on('presenter', p => { S.presenter = p; render(); });
  on('owner', ({ id }) => { S.owner = id; render(); });
  on('signal', ({ from, data }) => S.mesh.handle(from, data));
  on('rotated', ({ code: c }) => { code = c; history.replaceState(null, '', '/sala/' + c); render(); });
  on('closed', () => location.replace('/?erro=encerrada'));
  render();
}

function render() {
  const isOwner = S.owner === S.me, pres = S.presenter;
  el.code.textContent = code;
  el.count.textContent = S.peers.size;
  el.btnClose.hidden = el.btnRotate.hidden = !isOwner;

  el.peers.replaceChildren(...[...S.peers.values()].map(p => {
    const li = document.createElement('li');
    li.className = 'peer' + (pres?.id === p.id ? ' peer--live' : '');
    li.innerHTML = '<span class="avatar"></span><span class="peer__name"></span><span class="tag">DONO</span><span class="tag tag--live">AO VIVO</span><i class="peer__mic"></i>';
    const [av, nm, own, live, mic] = li.children;
    av.textContent = (p.name[0] || '?').toUpperCase();
    nm.textContent = p.name + (p.id === S.me ? ' (você)' : '');
    own.hidden = p.id !== S.owner; live.hidden = pres?.id !== p.id;
    setIcon(mic, p.mic ? 'mic' : 'micOff'); mic.classList.toggle('on', !!p.mic);
    return li;
  }));

  const screen = pres && (pres.id === S.me ? S.screen : S.streams.get(pres.streamId)?.stream);
  el.empty.hidden = !!screen; el.screen.hidden = el.live.hidden = !screen;
  if (screen) {
    if (el.screen.srcObject !== screen) el.screen.srcObject = screen;
    el.screen.muted = pres.id === S.me || S.deaf;
    el.liveText.textContent = `${S.peers.get(pres.id)?.name ?? ''} está compartilhando`;
  } else el.screen.srcObject = null;

  // áudio de voz dos outros participantes (tudo que não é a tela compartilhada)
  const voices = new Set();
  S.streams.forEach(({ stream }, id) => {
    if (id === pres?.streamId) return;
    voices.add(id);
    let a = el.voices.querySelector(`[data-id="${id}"]`);
    if (!a) { a = new Audio(); a.autoplay = true; a.dataset.id = id; a.srcObject = stream; el.voices.append(a); }
    a.muted = S.deaf;
  });
  el.voices.querySelectorAll('audio').forEach(a => !voices.has(a.dataset.id) && a.remove());

  setIcon(el.btnMic.firstElementChild, S.mic ? 'mic' : 'micOff'); el.btnMic.classList.toggle('active', S.mic);
  setIcon(el.btnDeaf.firstElementChild, S.deaf ? 'volumeOff' : 'volume'); el.btnDeaf.classList.toggle('active', !S.deaf);
  el.btnShare.classList.toggle('active', !!S.screen);
}

async function toggleMic() {
  try {
    if (!S.micStream) {
      S.micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      S.mesh.addStream(S.micStream); S.mic = true;
    } else { S.mic = !S.mic; S.micStream.getAudioTracks().forEach(t => (t.enabled = S.mic)); }
    await post('mic', { mic: S.mic });
    S.peers.get(S.me).mic = S.mic; render();
  } catch { alertMsg('Não foi possível acessar seu microfone. Verifique as permissões do navegador.'); }
}

async function stopShare() {
  if (!S.screen) return;
  const s = S.screen; S.screen = null;
  s.getTracks().forEach(t => t.stop()); S.mesh.removeStream(s);
  await post('share', { on: false }).catch(() => {}); render();
}

async function toggleShare() {
  if (S.screen) return stopShare();
  try {
    const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    try { await post('share', { on: true, streamId: s.id }); }
    catch (e) { s.getTracks().forEach(t => t.stop()); throw e; }
    S.screen = s; S.presenter = { id: S.me, streamId: s.id };
    s.getVideoTracks()[0].onended = stopShare;
    S.mesh.addStream(s); render();
  } catch (e) {
    if (e.status === 409) alertMsg(e.message);
    else if (e.name !== 'NotAllowedError') alertMsg('Não foi possível iniciar o compartilhamento.');
  }
}

async function leave() { await post('leave').catch(() => {}); location.href = '/'; }

el.btnMic.onclick = toggleMic;
el.btnDeaf.onclick = () => { S.deaf = !S.deaf; render(); };
el.btnShare.onclick = toggleShare;
$('#btnLeave').onclick = $('#dockLeave').onclick = leave;
el.btnClose.onclick = () => (el.modal.hidden = false);
$('#modalCancel').onclick = () => (el.modal.hidden = true);
$('#modalConfirm').onclick = () => post('close').catch(e => alertMsg(e.message));
el.btnRotate.onclick = () => post('rotate').catch(e => alertMsg(e.message));
$('#btnFull').onclick = () => el.screen.requestFullscreen?.();
el.btnCopy.onclick = async () => {
  await navigator.clipboard.writeText(`${location.origin}/sala/${code}`);
  const t = el.btnCopy.lastChild, old = t.textContent; t.textContent = ' Link copiado'; setTimeout(() => (t.textContent = old), 1500);
};
addEventListener('pagehide', () => navigator.sendBeacon?.(`/api/rooms/${code}/leave`, new Blob([JSON.stringify({ token: S.token })], { type: 'application/json' })));

init();
