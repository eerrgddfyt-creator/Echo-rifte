/** Alvo de treino: modos "parado" e "circular" (órbita em torno do centro da arena). */
export function setDummyMode(w, mode) {
  w.dummyMode = mode;
  const t = w.target;
  if (mode === 'circular') { t.ang = Math.atan2(t.z, t.x); t.rad = Math.min(8, Math.max(3, Math.hypot(t.x, t.z))); }
}

export function stepDummy(w, dt) {
  const t = w.target;
  t.px = t.x; t.pz = t.z;
  if (w.dummyMode !== 'circular' || w.phase !== 'fight') return;
  t.ang += (w.params.dummy.orbitSpeed * dt) / t.rad;
  t.x = Math.cos(t.ang) * t.rad; t.z = Math.sin(t.ang) * t.rad;
}
