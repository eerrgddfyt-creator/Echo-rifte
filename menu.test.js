// Teste do menu: o CSS não vaza para o jogo, os arquivos existem, o index liga o menu sem mexer no app-boot.js.
import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const css = readFileSync('ui-menu.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const sels = [];
css.replace(/([^{}@]+)\{[^{}]*\}/g, (m, s) => { s.split(',').forEach((x) => sels.push(x.trim())); return m; });
const solto = sels.filter((s) => !/^(#mn|#mc|\.mn-|from$|to$|\d+%$)/.test(s));
assert.deepEqual(solto, [], 'seletor do menu sem escopo (vazaria para o jogo): ' + solto.join(' | '));

for (const f of ['ui-menu.js', 'ui-menu.css', 'ui-snd-tap.mp3', 'ui-snd-click.mp3', 'ui-snd-ok.mp3', 'app-boot.js']) assert.ok(existsSync(f), 'falta ' + f);

const idx = readFileSync('index.html', 'utf8');
assert.ok(!/<script[^>]*src="app-boot\.js"/.test(idx), 'o index não pode carregar o app-boot direto');
assert.ok(idx.includes("import('./app-boot.js')") && idx.includes("has('jogo')"), 'loader do index');
assert.ok(idx.includes('catch') && idx.includes('boot()'), 'se o menu falhar, o jogo abre direto');

const mod = await import('./ui-menu.js'); // importar não pode tocar em DOM
assert.equal(typeof mod.showMenu, 'function');
const src = readFileSync('ui-menu.js', 'utf8');
const marcacao = src.slice(src.indexOf('const MARKUP'), src.indexOf('function loadCss'));
const usados = [...src.matchAll(/\$\('#([\w-]+)/g)].map((m) => m[1]).filter((i) => i !== 'dsb');
const faltam = usados.filter((i) => !marcacao.includes(`id="${i}"`));
assert.deepEqual(faltam, [], 'ids usados pelo JS e ausentes na marcação: ' + faltam.join(','));
assert.ok(!/data-go="treino"/.test(marcacao), 'TRAINING deve estar indisponível');
assert.ok(/data-open="shop"/.test(marcacao) && /id="shop"/.test(marcacao) && /id="shb"/.test(marcacao), 'LOJA abre a tela da loja');
assert.ok(!/aria-disabled="true" data-i="shop"/.test(marcacao), 'LOJA deve estar disponível');
assert.equal((marcacao.match(/class="mn-gc"/g) || []).length, 4, 'a loja tem 4 cards de vidro');
assert.ok(!/preserve-3d/.test(css), 'preserve-3d desliga o backdrop-filter dos cards');
console.log('menu.test.js: ok (' + sels.length + ' seletores escopados, ' + usados.length + ' ids conferidos)');
