import { site } from '../config/site.js';
import { $, applyBrand } from '../ui/dom.js';
import { api } from '../core/api.js';

applyBrand();
const name = $('#name'), code = $('#code'), err = $('#error'), avatar = $('#avatar');
const params = new URLSearchParams(location.search);
const MSG = { notfound: 'Sala não encontrada.', encerrada: 'A sala foi encerrada.' };

code.placeholder = site.home.codePlaceholder;
name.value = localStorage.getItem('tv:name') || '';
if (params.get('sala')) code.value = params.get('sala');

const show = m => { err.textContent = m || ''; err.hidden = !m; };
const initials = v => (v.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || '?').toUpperCase();
const sync = () => (avatar.textContent = initials(name.value));
name.addEventListener('input', sync); sync();
show(MSG[params.get('erro')]);

function requireName() {
  const v = name.value.trim();
  if (!v) { show('Digite seu nome para continuar.'); name.focus(); return false; }
  localStorage.setItem('tv:name', v); return true;
}

$('#create').onclick = async () => {
  if (!requireName()) return;
  try { location.href = '/sala/' + (await api('rooms', {})).code; } catch (e) { show(e.message); }
};

$('#joinForm').onsubmit = async e => {
  e.preventDefault();
  if (!requireName()) return;
  const m = code.value.toUpperCase().match(/[A-Z0-9]{2,6}-[A-Z0-9]{4}/);
  if (!m) return show('Código ou link inválido.');
  try { await api('rooms/' + m[0]); location.href = '/sala/' + m[0]; } catch (e) { show(e.message); }
};
