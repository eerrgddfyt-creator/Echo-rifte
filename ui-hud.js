/** HUD de combate (DOM): barras de vida com rastro, aviso curto, mensagem de fim de rodada e anel de recarga da esquiva. */
export function createHud(host, params) {
  const hpMax = params.hp;
  const el = document.createElement('div');
  el.className = 'hud';
  el.innerHTML =
    '<div class="hp"><span>Vanguard</span><div><i class="trail"></i><i class="bar"></i></div></div>' +
    '<div class="hp foe"><span>Alvo</span><div><i class="trail"></i><i class="bar"></i></div></div>' +
    '<p class="msg" hidden></p><p class="toast" hidden></p>';
  host.append(el);
  const side = (n) => ({ bar: n.querySelector('.bar'), trail: n.querySelector('.trail'), last: -1 });
  const [me, foe] = [...el.querySelectorAll('.hp')].map(side), msg = el.querySelector('.msg'), toast = el.querySelector('.toast');
  const paint = (s, hp) => {
    if (hp === s.last) return;
    s.last = hp;
    const w = (Math.max(0, hp) / hpMax) * 100 + '%';
    s.bar.style.width = w; s.trail.style.width = w;
  };
  let dodgeBtn = null, lastCd = -2, timer = 0;
  return {
    update(player, target) {
      paint(me, player.hp); paint(foe, target.hp);
      if (!dodgeBtn) dodgeBtn = host.querySelector('.btn.dodge');
      if (!dodgeBtn) return;
      const cd = player.dcd > 0 ? Math.round(100 - (player.dcd / params.dodge.cooldown) * 100) : -1; // % carregado; -1 = pronta
      if (cd !== lastCd) {
        lastCd = cd;
        dodgeBtn.classList.toggle('cool', cd >= 0);
        dodgeBtn.style.setProperty('--cd', cd >= 0 ? cd : 100);
      }
    },
    message(text) { msg.hidden = !text; if (text) msg.textContent = text; },
    /** Aviso curto (ex.: esquiva perfeita). */
    toast(text) {
      toast.textContent = text; toast.hidden = false;
      clearTimeout(timer); timer = setTimeout(() => { toast.hidden = true; }, 900);
    },
    /** Reinício: as barras voltam cheias sem animar o rastro. */
    snap() {
      el.classList.add('snap');
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('snap')));
    },
  };
}
