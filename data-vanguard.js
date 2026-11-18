/**
 * VANGUARD: movimento e combate (60 ticks = 1 s).
 * Onde ajustar: edite aqui ou use "Ajustes" no painel (ao vivo, não persiste).
 */
export const VANGUARD = {
  maxSpeed: 5.5, // m/s. Maior = corre mais.
  accelTicks: 8, // ticks até a velocidade máxima. Menor = arranca mais seco.
  stopTicks: 5, // ticks até parar ao soltar o controle. Menor = freia mais seco.
  radius: 0.45, // m. Raio do corpo (colisão com parede e alvo).
  hp: 100, // vida do jogador e do alvo.
  reach: 2.2, // m. Alcance do golpe: do centro do atacante até a borda do alvo.
  arcDeg: 110, // graus. Abertura do arco do golpe.
  buffer: 6, // ticks que o botão fica guardado (aperte um pouco antes e o golpe sai).
  chainWindow: 8, // ticks finais da recuperação do A1 em que o A2 pode entrar.
  moveMul: { startup: 0.3, active: 0.3, recovery: 0.6 }, // fração da velocidade durante o golpe.
  resetDelay: 90, // ticks entre a morte do alvo e o reinício (90 = 1,5 s).
  attacks: [
    // startup: ticks até ficar ativo. active: ticks em que acerta. recovery: ticks de volta.
    // damage: dano. lunge: metros que o corpo avança durante o golpe (0 = sem avanço).
    { startup: 7, active: 3, recovery: 12, damage: 8, lunge: 0.55 }, // A1
    { startup: 6, active: 3, recovery: 16, damage: 12, lunge: 0.75 }, // A2
  ],
  dummy: { orbitSpeed: 2.5 }, // alvo circular: velocidade em m/s (o raio é o da posição atual).
};
