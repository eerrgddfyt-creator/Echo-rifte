/**
 * Passo fixo: acumula o tempo real e chama step() a `rate` Hz.
 * advance(agoraMs) devolve alpha (0..1) para interpolar o desenho entre dois ticks.
 */
export function createStepper(step, rate = 60, maxSteps = 5) {
  const dt = 1000 / rate;
  let last = 0, acc = 0;
  return {
    advance(now) {
      if (!last) last = now;
      acc += Math.min(now - last, dt * maxSteps); // limita o salto depois de aba em segundo plano
      last = now;
      while (acc >= dt) { step(); acc -= dt; }
      return acc / dt;
    },
  };
}
