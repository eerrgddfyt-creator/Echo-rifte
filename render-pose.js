/**
 * Poses do VANGUARD (puro: sem Babylon, testável em Node).
 * Pose = array de NCH canais (ver CH). Espaço do tronco: +x direita, +y cima, +z frente.
 */
export const CH = { hipY: 0, hipRY: 1, torRX: 2, torRY: 3, torRZ: 4, legL: 5, legR: 6, hx: 7, hy: 8, hz: 9, bx: 10, by: 11, bz: 12, ox: 13, oy: 14, oz: 15 };
export const NCH = 16;
export const ARM = 0.3; // comprimento de cada osso do braço (m)

/** Spline de Hermite com tangentes de Catmull-Rom (escaladas por chave): velocidade contínua, sem paradas bruscas. */
export function sample(keys, tf, c0, c1, out) {
  const n = keys.length;
  if (tf <= keys[0][0] || tf >= keys[n - 1][0]) {
    const k = keys[tf <= keys[0][0] ? 0 : n - 1];
    for (let c = c0; c < c1; c++) out[c] = k[1 + c];
    return;
  }
  let i = 0;
  while (keys[i + 1][0] <= tf) i++;
  const a = keys[i], b = keys[i + 1], p = keys[i - 1], q = keys[i + 2];
  const h = b[0] - a[0], u = (tf - a[0]) / h, u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  for (let c = c0; c < c1; c++) {
    const ma = p ? (a[17] * (b[1 + c] - p[1 + c])) / (b[0] - p[0]) : 0;
    const mb = q ? (b[17] * (q[1 + c] - a[1 + c])) / (q[0] - a[0]) : 0;
    out[c] = h00 * a[1 + c] + h10 * h * ma + h01 * b[1 + c] + h11 * h * mb;
  }
}

/** Pose de golpe no tick fracionado tf. `from` (opcional) é a pose de onde o golpe parte, misturada nos primeiros ticks. */
export function atk(out, A, keys, tf, from) {
  sample(keys, tf, 0, 7, out);
  sample(keys, tf - A.lagHand, 7, 10, out);
  sample(keys, tf - A.lagBlade, 10, 13, out);
  sample(keys, tf - A.lagHand, 13, 16, out);
  if (from && tf < A.blend) {
    const u = Math.max(0, tf) / A.blend, e = u * u * (3 - 2 * u);
    for (let c = 0; c < NCH; c++) out[c] = from[c] + (out[c] - from[c]) * e;
  }
}

/** Pose de repouso e corrida (mesma cadência aprovada no M2). s: 0..1 da velocidade; lean: velocidade para a frente / máx. */
export function loco(out, phase, s, lean, time) {
  const sn = Math.sin(phase), sw = sn * 0.9 * s, ab = Math.abs(sn);
  out[CH.hipY] = ab * 0.05 * s; out[CH.hipRY] = 0;
  out[CH.torRX] = 0.04 + 0.2 * lean; out[CH.torRY] = sn * 0.1 * s; out[CH.torRZ] = 0;
  out[CH.legL] = sw; out[CH.legR] = -sw;
  out[CH.hx] = 0.33; out[CH.hy] = 0.2 + Math.sin(time * 2.4) * 0.006 + ab * 0.03 * s; out[CH.hz] = 0.3 - sn * 0.1 * s;
  out[CH.bx] = 0.05; out[CH.by] = 0.3 + 0.1 * s; out[CH.bz] = 1;
  out[CH.ox] = -0.33; out[CH.oy] = 0.18; out[CH.oz] = 0.22 + sn * 0.14 * s;
}

const T = [0, 0, 0];
function perp(ux, uy, uz, px, py, pz) {
  const d = px * ux + py * uy + pz * uz;
  const x = px - d * ux, y = py - d * uy, z = pz - d * uz, l = Math.hypot(x, y, z);
  if (l < 1e-6) return false;
  T[0] = x / l; T[1] = y / l; T[2] = z / l;
  return true;
}

/**
 * IK de 2 ossos. Ombro S, mão alvo H, vetor-guia do cotovelo P.
 * r[0..2] cotovelo, r[3..5] direção do braço, r[6..8] direção do antebraço, r[9..11] mão (já limitada ao alcance).
 */
export function solveArm(r, sx, sy, sz, hx, hy, hz, px, py, pz) {
  let vx = hx - sx, vy = hy - sy, vz = hz - sz, d = Math.hypot(vx, vy, vz);
  if (d < 1e-6) { vx = 0; vy = -1e-3; vz = 0; d = 1e-3; }
  const lim = 2 * ARM * 0.995, k = d > lim ? lim / d : d < 0.12 ? 0.12 / d : 1;
  vx *= k; vy *= k; vz *= k; d *= k;
  const ux = vx / d, uy = vy / d, uz = vz / d;
  if (!perp(ux, uy, uz, px, py, pz) && !perp(ux, uy, uz, 0, -1, 0)) perp(ux, uy, uz, 1, 0, 0);
  const cosA = Math.min(1, d / (2 * ARM)), sinA = Math.sqrt(1 - cosA * cosA);
  const ex = sx + ARM * (cosA * ux + sinA * T[0]), ey = sy + ARM * (cosA * uy + sinA * T[1]), ez = sz + ARM * (cosA * uz + sinA * T[2]);
  r[0] = ex; r[1] = ey; r[2] = ez;
  r[3] = (ex - sx) / ARM; r[4] = (ey - sy) / ARM; r[5] = (ez - sz) / ARM;
  r[9] = sx + vx; r[10] = sy + vy; r[11] = sz + vz;
  r[6] = (r[9] - ex) / ARM; r[7] = (r[10] - ey) / ARM; r[8] = (r[11] - ez) / ARM;
}

/** Quaternion q = [x, y, z, w] que gira o vetor unitário `from` até a direção `to`. */
export function qFromTo(q, fx, fy, fz, tx, ty, tz) {
  const l = Math.hypot(tx, ty, tz) || 1;
  tx /= l; ty /= l; tz /= l;
  let x = fy * tz - fz * ty, y = fz * tx - fx * tz, z = fx * ty - fy * tx, w = 1 + fx * tx + fy * ty + fz * tz;
  if (w < 1e-6) { x = 1; y = 0; z = 0; w = 0; } // 180°: eixo X
  const n = Math.hypot(x, y, z, w);
  q[0] = x / n; q[1] = y / n; q[2] = z / n; q[3] = w / n;
}
