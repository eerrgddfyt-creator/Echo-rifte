/** HUD de combate (DOM): barras de vida com rastro de dano e mensagem de fim de rodada. */
export function createHud(host, hpMax) {
  const el = document.createElement('div');
  el.className = 'hud';
  el.innerHTML =
    '<div class="hp"><span>Vanguard</span><div><i class="trail"></i><i class="bar"></i></div></div>' +
    '<div class="hp foe"><span>Alvo</span><div><i class="trail"></i><i class="bar"></i></div></div>' +
    '<p class="msg" hidden></p>';
  host.append(el);
  const side = (n) => ({ bar: n.querySelector('.bar'), trail: n.querySelector('.trail'), last: -1 });
  const [me, foe] = [...el.querySelectorAll('.hp')].map(side), msg = el.querySelector('.msg');
  const paint = (s, hp) => {
    if (hp === s.last) return;
    s.last = hp;
    const w = (Math.max(0, hp) / hpMax) * 100 + '%';
    s.bar.style.width = w; s.trail.style.width = w;
  };
  return {
    update(player, target) { paint(me, player.hp); paint(foe, target.hp); },
    message(text) { msg.hidden = !text; if (text) msg.textContent = text; },
    /** Reinício: as barras voltam cheias sem animar o rastro. */
    snap() {
      el.classList.add('snap');
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('snap')));
    },
  };
}
