# RDO-RPG in VS Code / Gemini

Lies zuerst AGENTS.md und docs/Linear-Workflow.md; sie führen die Projektregeln. Linear führt Status, das persönliche Vault bleibt lokal und ist kein Aufgabenboard.

Vor Schreibarbeit im aktuellen Checkout:

```text
node scripts/gemini-handoff.mjs status
```

Nur bei `owner: gemini` nach bewusster Übergabe weiterschreiben. Andernfalls zuerst eine geprüfte Übergabe gemäß docs/runbooks/agent-handoff.md erstellen/aktivieren. Ein offener VS-Code-Workspace allein überträgt keine Zuständigkeit. Vor Rückgabe Gemini stoppen und einen frischen Checkpoint mit `return` erstellen. Codex darf einen noch Gemini zugeordneten Checkout ebenfalls nicht bearbeiten.

Gemischte Arbeitskopien erhalten; kein pauschales Reset/Stash, kein git add ., keine ungeprüfte Übernahme zwischen Main und Restart. HANDOFF.md und den aktuellen Gitstand lesen, Quellsicherung nicht als Arbeitsverzeichnis verwenden. Kein automatisch synchronisierter Chat-/Linear-Kontext wird vorausgesetzt.

Roh-/Runtime-Assets, Secrets und docs/Obsidian bleiben lokal. Ein Bild/Video ist kein geriggtes GLB, ein grüner Build keine vollständige Map-/Gameplay-Abnahme. Aktuelle Abnahmen im jeweiligen Linear-Issue prüfen. Jeder Codebatch endet mit npx pnpm -r build und angemessenen Tests; Lauf-/Sichtproben für Spieländerungen ergänzen.
