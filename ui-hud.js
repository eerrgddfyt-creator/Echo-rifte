/** HUD de combate (DOM): barras de vida com rastro, integridade do ECHO, aviso curto, fim de rodada e anéis de recarga. */
export function createHud(host, params) {
  const hpMax = params.hp;
  const el = document.createElement('div');
  el.className = 'hud';
  el.innerHTML =
    '<div class="hp"><span>Vanguard</span><div><i class="trail"></i><i class="bar"></i></div><em class="pips"><b></b><b></b><b></b><b></b><b></b></em></div>' +
    '<div class="hp foe"><span>Alvo</span><div><i class="trail"></i><i class="bar"></i></div></div>' +
    '<p class="msg" hidden></p><p class="toast" hidden></p>';
  host.append(el);
  const side = (n) => ({ bar: n.querySelector('.bar'), trail: n.querySelector('.trail'), last: -1 });
  const [me, foe] = [...el.querySelectorAll('.hp')].map(side), msg = el.querySelector('.msg'), toast = el.querySelector('.toast');
  const pips = [...el.querySelectorAll('.pips b')];
  const paint = (s, hp) => {
    if (hp === s.last) return;
    s.last = hp;
    const w = (Math.max(0, hp) / hpMax) * 100 + '%';
    s.bar.style.width = w; s.trail.style.width = w;
  };
  let dodgeBtn = null, echoBtn = null, lastCd = -2, lastE = -1, timer = 0;
  return {
    update(player, target, echo) {
      paint(me, player.hp); paint(foe, target.hp);
      if (!dodgeBtn) dodgeBtn = host.querySelector('.btn.dodge');
      if (dodgeBtn) {
        const cd = player.dcd > 0 ? Math.round(100 - (player.dcd / params.dodge.cooldown) * 100) : -1; // % carregado; -1 = pronta
        if (cd !== lastCd) {
          lastCd = cd;
          dodgeBtn.classList.toggle('cool', cd >= 0);
          dodgeBtn.style.setProperty('--cd', cd >= 0 ? cd : 100);
        }
      }
      if (!echoBtn) echoBtn = host.querySelector('.btn.echo');
      if (echoBtn && echo) {
        const cd = echo.cd > 0 ? Math.round(100 - (echo.cd / params.echo.cooldown) * 100) : -1;
        const key = (cd + 1) * 1000 + echo.phase * 100 + echo.hp; // só mexe no DOM quando algo muda
        if (key !== lastE) {
          lastE = key;
          echoBtn.classList.toggle('cool', cd >= 0);
          echoBtn.classList.toggle('live', echo.phase > 0);
          echoBtn.style.setProperty('--cd', cd >= 0 ? cd : 100);
          for (let i = 0; i < pips.length; i++) {
            pips[i].hidden = echo.phase === 0 || i >= params.echo.integrity;
            pips[i].className = i < echo.hp ? '' : 'off';
          }
        }
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
