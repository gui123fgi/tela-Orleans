// ✏️ Edite aqui TODOS os textos, cores e imagens do site.
export const site = {
  brand: 'Orleans',
  tagline: 'Transmissão de tela',
  logo: '/assets/img/Orleans.svg',   // troque pelo seu logo
  hero: '/assets/img/FundoOrleans.svg',   // imagem de fundo da tela inicial
  theme: {
    '--accent': '#34c5c1', '--accent-2': '#d7edec',
    '--bg': '#07090d', '--panel': '#0d1117', '--line': '#1c232d', '--danger': '#ef4444',
  },
  home: {
    title: ['Sua tela, ao vivo,', 'direto para a sala.'],
    subtitle: 'Crie uma sala em um clique, compartilhe o código e transmita a tela pelo navegador. Sem instalar nada, sem cadastro.',
    features: [
      { icon: 'zap', text: 'Sala instantânea, entra por código ou link' },
      { icon: 'shield', text: 'Conexão direta entre os participantes' },
      { icon: 'users', text: 'Vários participantes, uma tela compartilhada por vez' },
    ],
    cardTitle: 'Entrar',
    cardHint: 'Escolha um nome para ser identificado na sala.',
    codePlaceholder: 'TVIV-X7K2 ou link de convite',
  },
  room: {
    emptyTitle: 'Ninguém está compartilhando a tela',
    emptyHint: 'Quando alguém iniciar um compartilhamento, ele aparecerá aqui.',
  },
};
