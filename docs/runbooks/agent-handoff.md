# Codex an VS Code / Gemini übergeben

Die Funktion erstellt einen externen geprüften Quellcheckpoint und öffnet auf Wunsch den bestehenden Checkout in VS Code. Sie wechselt keine Branches und führt weder Reset/Stash noch Commit/Push aus. Aktive ungespeicherte Editorpuffer zuerst speichern: Das Werkzeug sieht ausschließlich Dateien auf der Festplatte.

## Vorbereitung

Im gewünschten Checkout:

```powershell
npx pnpm handoff:gemini
```

Oder explizit mit getrenntem Main-Bezug und zusätzlichem Kontext:

```powershell
node scripts/gemini-handoff.mjs prepare --source C:/Users/h4rea/.codex/worktrees/rdo-restart-foundation/RDO-RPG --related D:/Projects/RDO-RPG --output-root D:/Projects/RDO-RPG-Backups/handoffs --notes-file D:/Projects/RDO-RPG-Backups/handoff-context.md --open
```

Der ausgegebene Ordner enthält HANDOFF.md, die Kontext-Momentaufnahme CONTEXT.md, einen VS-Code-Workspace, Arbeitskopien unter working/, gesonderte gestagte Fassungen unter index/ und Hashmanifeste. Eine bearbeitbare Datei `<checkpoint>.notes.md` liegt daneben und nimmt neue Erkenntnisse für die nächste Übergabe auf. Snapshotdateien unverändert lassen.

Die Quelle und der Gitindex bleiben erhalten; vorbereiten allein ändert den Eigentümer nicht. Standardziel ist `~/RDO-RPG-Handoffs`. Ziele innerhalb der Quelle oder eines als Bezug genannten Checkouts werden abgelehnt. Jeder Lauf hat einen neuen Namen. Konfliktstufen im Index müssen zunächst geklärt werden; das Werkzeug bricht dabei ohne Aktivierung ab.

## Tatsächlich an Gemini übergeben

Codex bzw. andere schreibende Agenten stoppen. In VS Code über **Terminal → Aufgabe ausführen → Übergabe: An Gemini übergeben** einen frischen Snapshot erstellen und die Zuständigkeit umschalten. Alternativ:

```powershell
node scripts/gemini-handoff.mjs activate --open
```

Dann HANDOFF.md/CONTEXT.md als Kontext im Gemini-Chat verwenden. Der vorbereitete Starttext nennt Pfade, Prüfregeln und offene Arbeit. VS Code und Gemini werden nicht automatisch angemeldet; es wird kein Prompt ungefragt an einen KI-Dienst gesendet und kein Auto-Approve eingestellt. Die Erweiterungen müssen bereits verbunden sein.

Die Zuständigkeit liegt pro Worktree in `git rev-parse --git-path codex-gemini-owner.json`. `status` gibt sie aus. Das ist eine kooperative Absprache für die beteiligten Agenten, keine technische Schreibsperre aller Programme. Der Codex-Heartbeat beachtet owner=gemini und bleibt dann für diesen Checkout still.

## Rückgabe an Codex

Neue Erkenntnisse/Tests in der Begleitdatei ergänzen, Dateien speichern und Gemini stoppen. Aufgabe **Übergabe: An Codex zurückgeben** ausführen oder:

```powershell
node scripts/gemini-handoff.mjs return --notes-file <bearbeitete-Begleitdatei>
```

Erst nach frischem geprüftem Checkpoint wird owner=codex gesetzt. Anschließend in Codex „weiter“ schreiben. Aktuelle Gitänderungen und Linear-Status erneut lesen; nicht vom früheren Chatstand ausgehen.

## Prüfen und Wiederfinden

```powershell
node scripts/gemini-handoff.mjs verify <checkpoint>
node scripts/gemini-handoff.mjs verify <checkpoint> --live
node scripts/gemini-handoff.mjs status
npx pnpm handoff:test
```

Die erste Prüfung kontrolliert Snapshot- und Metadatenhashes, die zweite zusätzlich den unveränderten Quell-/Indexstand. Nach bewusstem Weiterarbeiten darf die Live-Prüfung Drift melden; das beschädigt den erhaltenen Snapshot nicht. Wiederherstellung geschieht gezielt aus working/ bzw. index/ nach Diffprüfung, niemals durch ein automatisches Überschreiben der Quelle. Gelöschte Dateien und exakter Gitstatus stehen im Manifest; der Checkpoint ist kein vollständiges Git-Repository-Backup.

## Bewusste Sicherungsgrenzen

Ignorierte Dateien, bekannte Zugangsdaten-/Connector-Konfiguration, erkannte Token-/Private-Key-Muster, Symlinks/Pfadausbrüche sowie Dateien über10MiB werden nicht kopiert. `excluded` nennt ausgelassene nichtignorierte Pfade und Gründe. Mustererkennung ist keine vollständige Secretprüfung; vor Freigabe den Umfang kontrollieren. Das Paket bleibt lokal und wird nicht automatisch veröffentlicht.

Roh-/Runtime-Daten, persönliche Obsidian-Notizen, Galerien und lokale Umgebungen bleiben an ihren Originalpfaden. Sie sind ausdrücklich nicht durch diesen Quellcheckpoint mitgesichert; vorhandene externe Datensicherungen erhalten. Referenz-Checkouts werden nicht automatisch kopiert. Dienste, Anmeldungen und ungespeicherte Editorzustände werden nicht übertragen. Der zusätzliche Chat-/Linear-Kontext muss im jeweiligen Checkpoint angegeben werden; keine automatische Synchronisierung.

Gemini unterstützt projektbezogene GEMINI.md-Kontextdateien; Quelle: [Google-Dokumentation](https://docs.cloud.google.com/gemini/docs/codeassist/use-agentic-chat-pair-programmer). Das Repository verweist dort auf dieselben AGENTS.md-Regeln.
