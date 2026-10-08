# ADR-0001: Isolierte Neustart-Arbeitsbasis und Datenhoheit

## Status

Angenommen am 2026-10-08.

## Entscheidung

Die RDO-RPG-Neuimplementierung erfolgt ausschließlich in einer separaten Git-
Worktree-Branch. Der vorhandene Hauptarbeitsbaum enthält aktive Altänderungen
und wird weder bereinigt noch mit Neustart-Commits vermischt.

`data/raw/` ist ein unveränderliches OpenIV-Quellarchiv. Tools und der Browser-
Client dürfen daraus lesen, aber nie schreiben. Jede daraus abgeleitete Datei
entsteht reproduzierbar unter `data/runtime/`. Runtime-Manifeste und
Prüfberichte sind versionierte Projektartefakte; temporäre Caches,
Referenzrender und Testartefakte bleiben lokal ignoriert.

Ein Commit enthält entweder einen in sich prüfbaren Neustart-Schritt oder eine
explizite Dokumentationsänderung. Er enthält keine fremden Altänderungen,
Rohdatenmutationen oder lokalen Obsidian-Zustand.

## Konsequenzen

- Vor jedem Paket werden Git-Status und betroffene Datenpfade geprüft.
- Der Build-Gate `npx pnpm -r build` ist für jede Codeänderung verpflichtend.
- Ein Runtime-Datensatz muss sich aus dokumentierten Eingaben und Tools neu
  erzeugen lassen.
- Secrets, insbesondere `OBSIDIAN_REST_TOKEN`, verbleiben in der lokalen
  Umgebung und erscheinen weder in Markdown noch in Git.
