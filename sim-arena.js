/**
 * Arena poligonal convexa no plano XZ (núcleo puro: sem render, sem DOM).
 * @param {{sides:number, apothem:number}} d apothem = centro até o meio de cada lado (m)
 * @returns {{sides:number, apothem:number, normals:{x:number,z:number}[], contain:(p:{x:number,z:number}, r:number)=>void}}
 */
export function createArena({ sides, apothem }) {
  const normals = [];
  for (let i = 0; i < sides; i++) {
    const a = (i * 2 * Math.PI) / sides;
    normals.push({ x: Math.cos(a), z: Math.sin(a) });
  }
  /** Empurra o círculo (p, r) para dentro das paredes. */
  function contain(p, r) {
    for (let pass = 0; pass < 2; pass++) {
      for (const n of normals) {
        const over = p.x * n.x + p.z * n.z + r - apothem;
        if (over > 0) { p.x -= n.x * over; p.z -= n.z * over; }
      }
    }
  }
  return { sides, apothem, normals, contain };
}
