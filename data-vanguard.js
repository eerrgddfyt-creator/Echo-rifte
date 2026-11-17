/**
 * VANGUARD: parâmetros de movimento (60 ticks = 1 s).
 * Onde ajustar: edite aqui, ou use "Ajustes" no painel (ao vivo, não persiste).
 */
export const VANGUARD = {
  maxSpeed: 5.5, // m/s. Maior = corre mais.
  accelTicks: 8, // ticks até a velocidade máxima. Menor = arranca mais seco.
  stopTicks: 5, // ticks até parar ao soltar o controle. Menor = freia mais seco.
  radius: 0.45, // m. Raio do corpo (colisão com parede e alvo).
};
