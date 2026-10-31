# Agent Handoff Implementation Plan

**Goal:** Wiederherstellbaren Quellcheckpoint und klare Zuständigkeit für VS Code/Gemini bereitstellen.
**Architecture:** Lokales Node-CLI mit externem Snapshot, Hashprüfung und atomarer kooperativer Zuständigkeitsdatei; keine Gitmutation.
**Tech Stack:** Node-Bordmittel, Git, VS-Code-Workspace/Tasks.
**Spec:** docs/superpowers/specs/2026-10-31-agent-handoff-design.md

## Ein prüfbarer Lieferumfang

1. Echte temporäre Git-Repositories testen: gestagte vs. Arbeitsfassung, neue/gelöschte Dateien, Secrets, Symlinks, interne Ausgabe, Manipulation und Drift sowie Aktivierung/Rückgabe.
2. scripts/gemini-handoff.mjs implementieren; package.json-Befehle und Runbook ergänzen. Quellen/Index separat sichern, keine stillen Ausschlüsse oder Pfadausbrüche.
3. GEMINI.md und AGENTS.md für Zuständigkeitsprüfung erweitern; aktiven Codex-Heartbeat an denselben Marker binden.
4. Reale Vorbereitung für Restart mit Main-Referenz und aktuellen Issue-/Prüfnotizen ausführen; Inhalte/Hashes verifizieren. Zuständigkeit bleibt bis zum bewussten Aufruf beim aktuellen Agenten.
5. Pflichtbuild, unabhängige Sicherheits-/Funktionsreview, selektiver Dokument-/Tool-Commit und PR. Nach Merge echte Übergabedateien bereitstellen; keine Binär-/Vaultdateien veröffentlichen.

## Review Focus

Symlink-/Traversal-Ausbrüche, unbeabsichtigter Secretexport, Verlust einer gestagten Fassung, Drift während Snapshot und konkurrierende Schreibzuständigkeit. Fehler dürfen Originale/Marker nicht beschädigen. Lokale Roh-/Runtime-Daten bleiben separat erhalten und werden ausdrücklich nicht als mitgesichert ausgegeben.
