// Configurações do servidor. Troque o prefixo dos códigos (ex.: ABCD-X7K2) e os servidores ICE.
export default {
  port: process.env.PORT || 3000,
  codePrefix: 'TVIV',
  // Para redes restritivas adicione um servidor TURN: { urls:'turn:host:3478', username:'', credential:'' }
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};
