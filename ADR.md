# Decisões de arquitetura (ECHO//RIFT)

## ADR-001: Babylon.js 9.x em vez de Three.js
Aprovado na Fase 0. Motivo: engine completa (animação, partículas, áudio, utilitários) para quem trabalha sozinho. Custo: pacote grande no carregamento móvel. Validado no M0 (roda no Android). Reavaliar se carregamento ou FPS estourarem o orçamento.

## ADR-002: JavaScript + JSDoc, módulos ES, sem etapa de build
Aprovado na Fase 0. Motivo: o desenvolvimento é no celular e TypeScript exigiria compilar. Reavaliar na Fase 3, quando cliente e servidor precisarem dividir tipos de protocolo.

## ADR-003: Simulação pura, estado + eventos, ECHO por replay de estado
A sim (arquivos sim-*.js) não conhece Babylon nem DOM, roda a 60 Hz fixos e emite eventos numa fila reutilizada. O ECHO vai gravar estado (posição, direção, estado do golpe) e reproduzir, em vez de reexecutar inputs. Consequência: o servidor usa o próprio histórico e o formato serve para replays.

## ADR-004: Projeto achatado
Pedido do desenvolvedor: zips só com arquivos soltos. As camadas viram prefixos de nome e o teste de camadas continua conferindo que a sim é pura. A árvore de pastas da Fase 0 volta quando houver um pipeline que a sustente.

## ADR-005: Animação procedural por pose
Sem pipeline de 3D no celular, o VANGUARD é animado por código: keyframes em spline (velocidade contínua), braços por IK de 2 ossos, mistura com a corrida e um filtro final. Os dados ficam em data-anim.js. Trocar por modelo com esqueleto quando houver asset próprio.

## ADR-006: Um caminho de dano e bot sem sorteio
Todo dano passa por `applyDamage`: ali a invulnerabilidade da esquiva vira "esquiva perfeita" (sem dano, o golpe do bot é consumido). O bot usa só contadores (telégrafo 24 ticks, golpe 3, recuperação 20, pausa 45), então é determinístico e testável. O telégrafo de 400 ms vem da regra de justiça da Fase 0 (mínimo de 300 ms para reagir).

## ADR-007: Teste de fumaça do render com Babylon simulado
Sem navegador no ambiente de desenvolvimento, `render.test.js` roda o rig e a entrada contra um Babylon e um DOM simulados e "selados". Pega erro de código (nome errado, exceção, NaN, geometria inválida). Não valida a aparência nem a API real do Babylon: isso só o aparelho mostra.
