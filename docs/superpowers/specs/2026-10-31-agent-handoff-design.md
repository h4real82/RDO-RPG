# Sichere Editor-/Agentenübergabe

Benutzerauftrag31.10.2026, H4R-118. Empfohlene lokale Lösung; Benutzer hat Routineentscheidungen ausdrücklich delegiert.

- Ein Node-CLI bereitet außerhalb des Checkouts einen neuen, unveränderlich benannten Checkpoint vor. Es kopiert nichtignorierte Arbeitsdateien und abweichende gestagte Fassungen mit SHA256; Git-HEAD, Status, Löschungen, Ausschlüsse und lokale Datenpfade werden dokumentiert.
- Kein Reset, Stash, automatischer Commit/Push, Restore oder Löschen. Nichtignorierte Quellen bleiben am Originalort. Secrets, Symlinks/Junction-Ausbrüche, Git-Interna, Roh-/Runtime-/Vault-Daten werden nicht exportiert; ausgelassene Inhalte und die Grenze dieser Quellsicherung sichtbar nennen. Es ist kein vollständiges Maschinenbackup.
- Verifikation prüft Dateihashes und Pfadgrenzen; optionale Live-Prüfung erkennt Drift seit Snapshot. Änderungen während des Erstellens verhindern die Freigabe.
- Vorbereitung ändert keine Zuständigkeit. Bewusste Aktivierung bzw. Rückgabe erstellt zuerst einen frischen geprüften Checkpoint und schreibt dann eine atomare Zuständigkeitsdatei im Worktree-Gitverzeichnis. Diese ist eine kooperative Schranke, keine OS-Dateisperre. Codex-Heartbeat und Gemini-Anweisungen prüfen sie vor Änderungen.
- Ein generierter VS-Code-Workspace öffnet ausschließlich den aktiven Source-Checkout und den Übergabeordner. Main/Restart-Bezüge werden nur als ausdrücklich getrennte Referenzen dokumentiert. Tasks bieten Aktivieren, Rückgabe und Verifikation; kein automatisch gesendeter Gemini-Prompt oder Konto-/Berechtigungswechsel.
- GEMINI.md verweist auf gemeinsame AGENTS.md-Regeln. Der Starttext nennt echte Pfade, Gitstand, nächste Arbeit, Prüfbelege und ausgeschlossene lokale Daten. Keine behauptete automatische Linear-/Chat-Synchronisierung.
- Standardausgabe unter ~/RDO-RPG-Handoffs; konkret externer Projektbackupordner. Ausgabe innerhalb einer Quelle wird verweigert. Jeder Lauf nutzt ein neues Verzeichnis; unsichere/unvollständige Exporte werden nicht aktiviert.

Geprüfte Google-Dokumentation: https://docs.cloud.google.com/gemini/docs/codeassist/use-agentic-chat-pair-programmer (GEMINI.md-Kontext und Agent-Modus). VS Code und google.geminicodeassist/google.gemini-cli-vscode-ide-companion sind lokal vorhanden. Keine Modell-/Quotenannahme daraus ableiten.
