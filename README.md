# ECHO//RIFT: Fase 1, M3 (combate)

Todos os arquivos ficam na mesma pasta, sem subpastas. Prefixos: `sim-` (simulação pura), `render-`, `ui-`, `app-`, `data-`, `debug-` e `input.js`.

## O que mudou desde a Entrega A
- Golpe em 2 tempos (A1 e A2), vida do jogador e do alvo, dano, morte do alvo e reinício automático após 1,5 s.
- Botão de golpe no canto direito, ou tecla J / Espaço. O botão fica guardado por 6 ticks: apertar um pouco antes já vale.
- Animação dos golpes: antecipação, varredura, passada e assentamento, com braços por IK, arco em rastro branco e reação do alvo (recuo e flash).
- HUD com barras de vida e rastro de dano. O painel de depuração agora começa recolhido (toque em "FPS" para abrir).
- Painel: botão Alvo parado/circular e ajustes ao vivo de dano e alcance.
- O VANGUARD foi reconstruído (braços de 2 ossos, pernas separadas do giro do tronco) para permitir os golpes. Mesma silhueta e mesma corrida.

## Como rodar
1. Suba todos os arquivos para a raiz do repositório com GitHub Pages e abra no Chrome do celular.
2. Testes de lógica e de animação pura (Node 22): `node sim.test.js`

## Controles
- Joystick: arraste na metade esquerda. Golpe: botão da direita, J ou Espaço. WASD/setas no teclado.

## O que testar no aparelho
1. Joystick e golpe ao mesmo tempo (multitoque) sem travar.
2. Combo: aperte duas vezes seguidas. A segunda pode ser um pouco antes do fim do primeiro golpe.
3. Os golpes parecem fluidos? Algum movimento duro, rápido demais ou quebrado? Diga qual golpe e em que momento.
4. O arco branco ajuda a ler o golpe? O alvo reage (recuo, flash)? As barras de vida estão claras?
5. Derrubar o alvo (5 combos) e ver o reinício. Testar também com o alvo circular.
6. 5 minutos de jogo e o **Relatório** do painel (compare com o do M0).

## Onde ajustar
- Tempos, dano, alcance, arco, avanço do corpo: `data-vanguard.js`.
- Poses e o jeito de cada golpe: `data-anim.js` (cada chave tem a explicação no topo do arquivo).

## Pendências e problemas conhecidos
- Render, toque, animação e FPS nunca rodaram num navegador (o ambiente de desenvolvimento não tem navegador nem rede). As poses foram verificadas só em números: continuidade, aceleração, instante em que a lâmina cruza o alvo e IK. A aparência real depende do teste no aparelho.
- Fora desta entrega: esquiva, bot que ataca, ECHO, hit-stop, tremor de tela, som, gamepad e `tools/pack.js`.
