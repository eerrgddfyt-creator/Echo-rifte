# ECHO//RIFT: Fase 1, M5 (ECHO v1)

Todos os arquivos ficam na mesma pasta, sem subpastas. Prefixos: `sim-` (simulação pura), `render-`, `ui-`, `app-`, `data-`, `debug-` e `input.js`.

## O que mudou desde o M4
- **ECHO:** botão novo acima do golpe (gelo; o anel mostra a recarga) ou tecla L. O jogo grava os últimos 2,2 s do que você fez (posição, direção, golpes e esquivas). Ao ativar, uma cópia translúcida aparece onde você estava há 2,2 s, passa 300 ms só se formando (não age e não pode ser atingida) e depois repete exatamente o que você fez, enquanto você continua jogando.
- A cópia causa 50% do dano (4 e 6), some depois de 2 golpes do bot ou ao fim da reprodução. Recarga de 14 s, uma cópia por vez. Nos primeiros 0,5 s da rodada ainda não há gravação suficiente e o botão não faz nada.
- **O bot enxerga a cópia:** persegue o que estiver mais perto (só troca com 1 m de vantagem) e o golpe dele pega quem estiver no arco, jogador e cópia.
- **Visual:** silhueta gelo translúcida com 2 imagens residuais; aparece aos poucos e pisca nos últimos 0,5 s. Os quadradinhos gelo sob a sua barra de vida mostram a integridade da cópia.
- **Painel:** botão ECHO A/B (ancoragem), ajustes de dano, integridade e recarga do ECHO, pausa do bot, e contadores para medir se o ECHO é divertido.

## Como rodar
1. Suba todos os arquivos para a raiz do repositório com GitHub Pages e abra no Chrome do celular.
2. Testes em Node 22: `node sim.test.js` (sim e animação pura) e `node render.test.js` (rig e entrada com Babylon e DOM simulados). `npm test` roda os dois.

## Controles
- Joystick: metade esquerda. Golpe: botão grande, J ou Espaço. Esquiva: botão menor, K ou Shift. ECHO: botão acima do golpe ou L.

## Como medir se o ECHO é divertido
Jogue 10 rodadas contra o alvo "perseguidor" e toque em **Relatório** no fim. Os critérios da Fase 0:
1. **Decisão:** "relev." / ECHOs pelo menos 60% (a gravação teve golpe ou deslocamento).
2. **Contra-jogo:** destruídos / ECHOs pelo menos 20%.
3. **Sem domínio:** a cópia causa no máximo 50% do dano total (a linha "dano" do painel).
4. **Sua avaliação:** foi divertido? Deu para entender o que a cópia ia fazer antes de ela agir?

Atenção ao item 2: com o ritmo atual do bot (um golpe a cada 1,5 s), destruir a cópia pede 2 acertos em 2,2 s, então tende a ser raro. Se ficar baixo, teste no painel a integridade 1 ou uma "Pausa do bot" menor, e me conte o que sentiu.

## O que testar no aparelho
1. Joystick, golpe, esquiva e ECHO ao mesmo tempo (multitoque) sem travar.
2. A cópia é fácil de ler (aparecer, agir, sumir)? Dá para entender o que ela vai fazer pelo telégrafo de 300 ms?
3. O bot cai na distração (corre atrás da cópia)? Isso ficou divertido ou confuso?
4. Ancoragem A (padrão) contra B (cópia nasce na sua posição): qual faz mais sentido?
5. As imagens residuais e o pisca ajudam ou poluem?
6. Algum movimento duro, quebrado ou estranho (cópia, golpes, esquiva)? Diga qual e quando.
7. 5 minutos de jogo e o **Relatório** (compare com o do M4: p95, draw calls, erros).

## Onde ajustar
- ECHO (tempos, dano, integridade, recarga, ancoragem) e bot: `data-vanguard.js`.
- Poses dos golpes e da esquiva: `data-anim.js`.

## Pendências e problemas conhecidos
- Render, toque, animação e FPS nunca rodaram num navegador por mim (o ambiente de desenvolvimento não tem navegador nem rede). O `render.test.js` só prova que o código roda sem erro e sem valores inválidos contra um Babylon simulado. A aparência e a API real do Babylon dependem do seu teste.
- O botão do ECHO ainda não avisa que não há gravação suficiente (primeiros 0,5 s da rodada): ele simplesmente não ativa.
- Fora desta entrega: acabamento do HUD e teste térmico de 10 min (M6), hitstun, empurrão, defesa, hit-stop, tremor de tela, som, gamepad e `tools/pack.js`.
