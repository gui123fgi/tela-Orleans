/** Malha WebRTC (um RTCPeerConnection por participante) usando "perfect negotiation". */
export class Mesh {
  constructor({ me, iceServers, send, onTrack }) {
    Object.assign(this, { me, iceServers, send, onTrack, pcs: new Map(), tracks: [] });
  }

  connect(id) {
    if (this.pcs.has(id)) return this.pcs.get(id);
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const s = { pc, polite: this.me > id, making: false, ignore: false };
    this.pcs.set(id, s);
    this.tracks.forEach(t => pc.addTrack(t.track, t.stream));
    pc.onnegotiationneeded = async () => {
      try { s.making = true; await pc.setLocalDescription(); this.send(id, { description: pc.localDescription }); }
      catch (e) { console.warn(e); } finally { s.making = false; }
    };
    pc.onicecandidate = e => e.candidate && this.send(id, { candidate: e.candidate });
    pc.ontrack = e => e.streams[0] && this.onTrack(id, e.track, e.streams[0]);
    return s;
  }

  async handle(from, { description, candidate }) {
    const s = this.connect(from), { pc } = s;
    try {
      if (description) {
        const collision = description.type === 'offer' && (s.making || pc.signalingState !== 'stable');
        s.ignore = !s.polite && collision;
        if (s.ignore) return;
        await pc.setRemoteDescription(description);
        if (description.type === 'offer') { await pc.setLocalDescription(); this.send(from, { description: pc.localDescription }); }
      } else if (candidate) {
        try { await pc.addIceCandidate(candidate); } catch (e) { if (!s.ignore) throw e; }
      }
    } catch (e) { console.warn(e); }
  }

  addStream(stream) {
    stream.getTracks().forEach(track => { this.tracks.push({ track, stream }); this.pcs.forEach(({ pc }) => pc.addTrack(track, stream)); });
  }

  removeStream(stream) {
    this.tracks = this.tracks.filter(t => t.stream !== stream);
    this.pcs.forEach(({ pc }) => pc.getSenders().forEach(s => s.track && stream.getTracks().includes(s.track) && pc.removeTrack(s)));
  }

  close(id) { this.pcs.get(id)?.pc.close(); this.pcs.delete(id); }
}
