---
title: "Entwicklungsablauf"
type: system
tags: [rdo]
updated: 2026-10-31
status: active
---

# Entwicklungsablauf

1. [AGENTS.md](https://github.com/h4real82/RDO-RPG/blob/main/AGENTS.md), den Repository-Workflow und aktuellen Arbeitsstand lesen.
2. Im [Linear-Projekt](https://linear.app/h4real82/project/rdo-rpg-d9ca7fe5de94) bestehendes Issue suchen. Nur tatsächlich begonnene Arbeit auf In Progress setzen.
3. Änderungen eng begrenzen. Bei gemischtem Checkout getrennten Worktree verwenden; fremde Änderungen und lokale Assets erhalten.
4. Passende Tests ausführen. Jeder Änderungsbatch endet mit `npx pnpm -r build`.
5. Bei Map-/Gameplay-Arbeit sichtbares Verhalten und tatsächliche Laufwege prüfen.
6. Ergebnis, Evidenz und Restpunkte am Issue dokumentieren. Done erst bei erfüllter Abnahme.
7. Nur wiederverwendbare Erkenntnisse ins Vault übernehmen und mit einer vorhandenen Notiz verknüpfen.

Kein `git add .` im gemischten Arbeitsstand. Keine doppelten Checkboxen im Vault. Ein Vault-Eintrag startet keinen Agenten und ändert keinen Linear-Status.

[[10_Projekt/Arbeitsstaende|Arbeitsstände]] · [[30_Handbuch/Vault-pflegen|Wissen pflegen]].

