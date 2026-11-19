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
  dodge: {
    // startup: ticks de preparação. iframes: ticks invulneráveis (é o deslize). recovery: ticks de volta.
    // dist: metros do deslize. cooldown: ticks entre o início de uma esquiva e a próxima (48 = 0,8 s).
    // recoveryMul: fração da velocidade permitida na recuperação.
    startup: 3, iframes: 8, recovery: 12, dist: 3, cooldown: 48, recoveryMul: 0.5,
  },
  bot: {
    // Alvo "perseguidor": persegue, telegrafa, ataca, recupera e espera (pause) antes do próximo golpe.
    speed: 3.5, // m/s ao perseguir
    engage: 2.3, // m. Distância (centro a centro) em que começa o telégrafo
    telegraph: 24, // ticks de aviso antes do golpe (24 = 400 ms)
    commit: 8, // últimos ticks do telégrafo em que a direção do golpe trava (dá para sair do arco)
    active: 3, recovery: 20, // ticks do golpe e da recuperação
    pause: 45, // ticks entre o fim da recuperação e o próximo telégrafo
    damage: 10, reach: 2.0, arcDeg: 100, // dano; alcance (centro do bot até a borda do jogador); arco
    grace: 60, // ticks de calma após reiniciar ou trocar o modo do alvo
  },
  dummy: { orbitSpeed: 2.5 }, // alvo circular: velocidade em m/s (o raio é o da posição atual).
};
