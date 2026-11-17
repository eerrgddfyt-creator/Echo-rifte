# ECHO//RIFT: Fase 1, Entrega A (M0 a M2, versão enxuta)

Todos os arquivos ficam na mesma pasta, sem subpastas. O prefixo do nome mostra a camada: `sim-` (simulação pura), `render-`, `app-`, `data-`, `debug-`, `input.js`.

## Como rodar
1. Suba todos os arquivos para a raiz de um repositório com GitHub Pages e abra o link no Chrome do celular. Módulos ES precisam de http/https; `file://` não funciona.
2. O preview do Neko Code Studio pode não carregar os módulos. Se der tela preta, use o GitHub Pages e avise.
3. Testes de lógica (Node 22): `node sim.test.js`

## Controles
- Toque: arraste na metade esquerda da tela (joystick flutuante). Teclado: WASD ou setas.
- O personagem sempre encara o alvo (lock 1v1).

## Painel de depuração
- FPS, tempo de quadro (p95 e p99), draw calls, triângulos, heap e a versão do Babylon que rodou.
- **Relatório**: gera um JSON (copia sozinho quando o navegador deixa; senão, selecione e copie).
- **Res**: 100%, 75% ou 50% da resolução nativa. **Ajustes**: velocidade, aceleração e parada ao vivo (valores finais em `data-vanguard.js`). **Tela cheia**.

## O que testar no aparelho
1. Abre sem erros? O painel mostra a versão do Babylon e o tempo do primeiro quadro?
2. FPS e p95 em 100%, 75% e 50%, com 5 min de movimento. Esquenta? O FPS cai?
3. Joystick, aceleração e parada: bons, travados ou escorregando?
4. A câmera enquadra a arena inteira? Tudo legível em tela real?
5. Toque em **Relatório** e cole o texto no chat.

## Pendências e problemas conhecidos
- Render, toque e FPS nunca rodaram num navegador (o ambiente de desenvolvimento não tem navegador nem rede). Só a lógica da sim foi testada em Node.
- A URL do Babylon 9.35.0 no cdnjs não foi conferida; se não carregar, o `index.html` tenta a 9.29.0.
- Luz, cores e proporções do VANGUARD são provisórias.
- Fora desta entrega: botões de ataque, esquiva e ECHO, gamepad, ADRs e `tools/pack.js`.
