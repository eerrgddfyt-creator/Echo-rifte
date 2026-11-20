# ECHO//RIFT: Fase 1, M4 (esquiva e bot que ataca) + menu inicial

Todos os arquivos ficam na mesma pasta, sem subpastas. Prefixos: `sim-` (simulação pura), `render-`, `ui-`, `app-`, `data-`, `debug-` e `input.js`.

## Menu inicial (novo)
- `index.html` abre o menu primeiro (`ui-menu.js`, `ui-menu.css` e os sons `ui-snd-tap/click/ok.mp3`). PLAY carrega o jogo (`app-boot.js`, sem alterações). Só PLAY está ativo; TRAINING, CUSTOMIZATION, LOJA e SETTINGS aparecem como "Em breve".
- `index.html?jogo` pula o menu e abre o jogo direto (bom para testar só o combate). Se o menu falhar ao carregar, o jogo abre direto.
- Ainda não existe "voltar ao menu" a partir da partida: recarregue a página. Pausa e telas de fim de partida vêm depois.
- O primeiro toque pede tela cheia e tenta travar a paisagem (Chrome do Android deixa; no iPhone não, e aparece "Gire o celular para jogar").
- Os 3 sons do menu têm licença **a confirmar**: confira a origem de cada um antes de publicar.
- Testar no aparelho: logo e toque para entrar; cards (arrastar troca o foco, tocar abre); sons; PLAY mostra "loading", abre a arena e o menu some sem sobrar nada na tela; joystick, golpe e esquiva iguais ao M4; os outros 4 cards avisam "Ainda não disponível"; compare o Relatório com o do M4.
- Pendência: o menu também nunca rodou num navegador. `npm test` confere só o que dá sem navegador (CSS sem vazar para o jogo, arquivos, ligação do index).

## O que mudou desde o M3
- **Esquiva:** botão menor, acima e à esquerda do golpe (o anel mostra a recarga), ou tecla K / Shift. Desliza 3 m na direção do joystick (sem joystick, recua para longe do alvo). Fica invulnerável durante o deslize (8 ticks). Cancela a recuperação de um golpe; golpe não cancela a esquiva. Recarga de 0,8 s.
- **Alvo perseguidor:** o botão "Alvo" do painel agora alterna parado, circular e perseguidor. O perseguidor corre até você, levanta o bastão, o setor vermelho no chão enche em 400 ms e o golpe sai (dano 10). Sair do arco ou esquivar evita.
- **Esquiva perfeita:** se o golpe pegaria você durante a invulnerabilidade, não há dano, o golpe é perdido, aparece o aviso e o anel do jogador pulsa.
- **Você leva dano:** a vida chega a 0, o jogador cai e a rodada reinicia em 1,5 s.
- **Animação:** pose de esquiva (agacha, desliza, levanta) inclinada para o lado da fuga, faixa branca do deslize no chão, recuo e flash ao levar dano, queda ao ser derrotado.
- **Painel:** novos ajustes ao vivo (dano e telégrafo do bot, recarga da esquiva) e contadores de esquivas, perfeitas e golpes sofridos.
- Na recuperação da esquiva você anda a 50% da velocidade (novo, para não travar o personagem).

## Como rodar
1. Suba todos os arquivos para a raiz do repositório com GitHub Pages e abra no Chrome do celular.
2. Testes em Node 22: `node sim.test.js` (sim e animação pura) e `node render.test.js` (rig e entrada com Babylon e DOM simulados). `npm test` roda os dois.

## Controles
- Joystick: metade esquerda. Golpe: botão grande, J ou Espaço. Esquiva: botão menor, K ou Shift. WASD/setas no teclado.

## O que testar no aparelho
1. Joystick, golpe e esquiva ao mesmo tempo (multitoque) sem travar.
2. Alvo perseguidor: dá para ler o telégrafo (bastão e setor vermelho) e reagir a tempo? 400 ms está justo, fácil ou difícil?
3. Esquiva: responde bem? 3 m é muito ou pouco? A faixa branca e a inclinação do corpo ajudam a ler o deslize?
4. Esquiva perfeita: o aviso e o pulso aparecem? O anel de recarga do botão está claro?
5. Deixe o bot derrubar você uma vez e veja a queda e o reinício.
6. Algum movimento duro, quebrado ou estranho (golpes, esquiva, bastão)? Diga qual e quando.
7. 5 minutos de jogo e o **Relatório** do painel (compare com o do M0).

## Onde ajustar
- Esquiva e bot (tempos, distância, dano, alcance, arco, telégrafo): `data-vanguard.js`.
- Poses dos golpes e da esquiva: `data-anim.js`.

## Pendências e problemas conhecidos
- Render, toque, animação e FPS nunca rodaram num navegador (o ambiente de desenvolvimento não tem navegador nem rede). O `render.test.js` só prova que o código roda sem erro e sem valores inválidos contra um Babylon simulado. A aparência e a API real do Babylon dependem do teste no aparelho.
- Fora desta entrega: ECHO (M5), hitstun, empurrão, defesa, hit-stop, tremor de tela, som, gamepad e `tools/pack.js`.
