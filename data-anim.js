/**
 * Animação dos golpes do VANGUARD (dados). O corpo é procedural: cada chave é uma pose.
 * Chave = [tick, 16 canais..., tangente]. Canais (ver CH em render-pose.js):
 *   corpo: hipY hipRY torRX torRY torRZ legL legR
 *   mão da espada: x y z | direção da lâmina: x y z | mão livre: x y z
 * Posições no espaço do tronco (+x direita, +y cima, +z frente). Ângulos em radianos.
 * tangente: 0 = a chave é uma parada suave (pico), 1 = passa com a velocidade natural, entre 0 e 1 = intermediário.
 * Onde ajustar: mexa nos números. Os tempos das chaves precisam bater com a frame data em data-vanguard.js
 * (o teste confere: início do golpe = startup, fim do ativo = startup + active, fim = total).
 */
const K = (t, s, ...c) => [t, ...c, s];
const IDLE = [0, 0, 0.04, 0, 0, 0, 0, 0.33, 0.2, 0.3, 0.05, 0.3, 1, -0.33, 0.18, 0.22];

// A1: diagonal da direita para a esquerda. Puxa para trás (antecipação), varre, passa do ponto e assenta.
const A1 = [
  K(0, 0, ...IDLE),
  K(4, 0, -0.06, 0.30, -0.10, 0.50, -0.10, -0.28, 0.30, 0.60, 1.00, -0.10, 0.30, 0.70, -0.65, -0.28, 0.42, 0.30),
  K(7, 1, -0.09, 0.12, 0.10, 0.12, -0.03, -0.40, 0.36, 0.52, 0.66, 0.44, 0.45, 0.00, 1.00, -0.36, 0.34, 0.12),
  K(10, 0.35, -0.11, -0.28, 0.18, -0.30, 0.05, -0.46, 0.44, 0.02, 0.38, 0.52, -0.75, -0.18, 0.85, 0.05, 0.56, 0.22),
  K(12.5, 0, -0.10, -0.34, 0.16, -0.36, 0.06, -0.44, 0.42, -0.06, 0.34, 0.46, -0.88, -0.30, 0.60, 0.10, 0.58, 0.20),
  K(15, 0.5, -0.07, -0.18, 0.10, -0.20, 0.03, -0.30, 0.28, 0.18, 0.30, 0.40, -0.30, 0.05, 1.00, -0.30, 0.26, 0.20),
  K(22, 0, ...IDLE),
];

// A2: golpe de volta, da esquerda para a direita. Mais pesado: corpo mais baixo e mais giro.
const A2 = [
  K(0, 0, -0.07, -0.18, 0.10, -0.20, 0.03, -0.30, 0.28, 0.18, 0.30, 0.40, -0.30, 0.05, 1.00, -0.30, 0.26, 0.20),
  K(3.5, 0, -0.07, -0.42, 0.05, -0.35, 0.12, -0.22, 0.24, -0.14, 0.30, 0.38, -0.95, -0.25, 0.30, 0.30, 0.34, 0.40),
  K(6, 1, -0.10, -0.20, 0.12, -0.10, 0.04, -0.40, 0.38, 0.10, 0.44, 0.52, -0.45, -0.05, 1.00, 0.05, 0.40, 0.30),
  K(9, 0.35, -0.14, 0.22, 0.22, 0.24, -0.06, -0.55, 0.52, 0.52, 0.58, 0.46, 0.80, 0.30, 0.85, -0.25, 0.50, 0.24),
  K(12, 0, -0.14, 0.28, 0.20, 0.30, -0.07, -0.54, 0.50, 0.58, 0.62, 0.40, 0.90, 0.42, 0.50, -0.28, 0.50, 0.22),
  K(16, 0.5, -0.09, 0.14, 0.12, 0.16, -0.03, -0.34, 0.32, 0.44, 0.36, 0.40, 0.35, 0.10, 1.00, -0.30, 0.24, 0.20),
  K(25, 0, ...IDLE),
];

// Esquiva: agacha e enrola (startup), desliza compacto (invulnerável), levanta suave (recuperação).
// A inclinação para o lado da fuga é somada no render, pois depende da direção do deslize.
const DODGE = [
  K(0, 0, ...IDLE),
  K(3, 0.5, -0.14, 0, 0.10, 0.05, 0, -0.22, 0.20, 0.30, 0.30, 0.20, 0.10, 0.55, 1.00, -0.30, 0.28, 0.16),
  K(7, 0.6, -0.20, 0, 0.16, 0, 0, -0.36, 0.30, 0.28, 0.20, -0.04, 0.25, 0.30, 0.85, -0.28, 0.18, -0.04),
  K(11, 0.4, -0.15, 0, 0.10, 0, 0, -0.25, 0.22, 0.30, 0.26, 0.08, 0.15, 0.40, 1.00, -0.30, 0.24, 0.06),
  K(23, 0, ...IDLE),
];

export const ANIM = {
  lagHand: 0.5, // ticks de atraso da mão em relação ao tronco (sensação de peso e arrasto)
  lagBlade: 1, // ticks de atraso da lâmina em relação ao tronco (a ponta chega por último)
  blend: 4, // ticks para sair da pose atual e entrar no golpe (sem estalo)
  hitDelay: [1.6, 1.65], // ticks entre o acerto da sim e a lâmina cruzar o alvo (recuo e flash esperam esse tempo; o teste confere)
  attacks: [{ keys: A1 }, { keys: A2 }],
  dodge: { keys: DODGE }, // tempos: início do deslize = startup, fim da invulnerabilidade = startup + iframes, fim = total
};
