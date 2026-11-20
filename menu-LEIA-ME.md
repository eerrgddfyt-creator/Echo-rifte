# Menu inicial do ECHO//RIFT (fora do jogo)

**Arquivos do menu:** `ui-menu.js`, `ui-menu.css`, `ui-snd-tap.mp3`, `ui-snd-click.mp3`, `ui-snd-ok.mp3`, `menu.test.js` e este arquivo.
**Único arquivo do projeto alterado:** `index.html` (a entrada). Todo o resto do jogo, inclusive `app-boot.js`, `README.md`, `ADR.md` e `package.json`, está igual ao M5.

## Como se liga ao jogo
- O `index.html` abre o menu primeiro e só faz `import('./app-boot.js')` quando o jogador toca em PLAY.
- `index.html?jogo` pula o menu. Se o menu falhar ao carregar, o jogo abre direto.
- O menu usa um Babylon próprio e leve e o descarta ao iniciar. O CSS fica todo sob `#mn` (o `menu.test.js` confere).
- Só PLAY está ativo. TRAINING, CUSTOMIZATION, LOJA e SETTINGS aparecem como "Em breve".
- Ainda não há "voltar ao menu" a partir da partida: recarregue a página.

## Testar
- `node menu.test.js` (sem navegador): CSS sem vazar para o jogo, arquivos, ligação do index.
- No aparelho: logo e toque para entrar; cards (arrastar troca o foco, tocar abre); sons; PLAY mostra "loading", abre a arena e o menu some sem sobrar nada; joystick, golpe, esquiva e ECHO iguais ao M5; os outros 4 cards avisam "Ainda não disponível".

## Pendências
- Nada disso rodou num navegador ainda.
- Licença dos 3 sons: **a confirmar** (placeholders até você validar a origem).
