import { randomBytes } from 'node:crypto';
import config from './config.js';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const rooms = new Map();

const newCode = () => {
  let c;
  do c = config.codePrefix + '-' + Array.from(randomBytes(4), b => ALPHABET[b % ALPHABET.length]).join('');
  while (rooms.has(c));
  return c;
};

export const createRoom = () => {
  const room = { code: newCode(), peers: new Map(), ownerId: null, presenter: null };
  rooms.set(room.code, room);
  return room;
};
export const getRoom = c => rooms.get(String(c).toUpperCase());
export const byToken = (room, t) => [...room.peers.values()].find(p => p.token === t);

export const addPeer = (room, name) => {
  const peer = { id: randomBytes(6).toString('hex'), token: randomBytes(16).toString('hex'), name: name.slice(0, 24), mic: false, res: null };
  room.peers.set(peer.id, peer);
  if (!room.ownerId) room.ownerId = peer.id;
  return peer;
};

export const pub = peer => ({ id: peer.id, name: peer.name, mic: peer.mic });
export const send = (peer, event, data) => peer.res?.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
export const broadcast = (room, event, data, exceptId) =>
  room.peers.forEach(p => p.id !== exceptId && send(p, event, data));

export function removePeer(room, id) {
  if (!room.peers.delete(id)) return;
  if (room.presenter?.id === id) { room.presenter = null; broadcast(room, 'presenter', null); }
  broadcast(room, 'peer-left', { id });
  if (!room.peers.size) return void rooms.delete(room.code);
  if (room.ownerId === id) { room.ownerId = room.peers.keys().next().value; broadcast(room, 'owner', { id: room.ownerId }); }
}

export function closeRoom(room) {
  broadcast(room, 'closed', {});
  room.peers.forEach(p => p.res?.end());
  rooms.delete(room.code);
}

export function rotateCode(room) {
  rooms.delete(room.code);
  room.code = newCode();
  rooms.set(room.code, room);
  broadcast(room, 'rotated', { code: room.code });
}
