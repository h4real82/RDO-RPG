# RDO-RPG Neustart – Ausführungsroadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den RDO-RPG-Neustart in kleine, überprüfbare Lieferpakete zerlegen, die den OpenIV-Bestand schützen und einen maßgetreuen Valentine-2.5D-Slice liefern.

**Architecture:** Vier Pläne werden strikt in Reihenfolge ausgeführt: Verträge, Pipeline, World Runtime und Vertical Slice. Jeder nachfolgende Plan verwendet nur öffentliche Verträge und erzeugte Runtime-Daten des vorherigen Plans.

**Tech Stack:** TypeScript, pnpm, Vite, Three.js, Python, pytest, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-08-rdo-rpg-restart-design.md`

## Global Constraints

- `data/raw/` wird nicht verändert.
- Weltobjekte, Straßen und Schienen dürfen nur aus validierten Manifestdaten entstehen.
- Die Welt nutzt die festgelegte CRS-Transformation, Layer und 250-m-Chunks.
- Die Spielkamera ist orthografisch, leicht abgesenkt und nicht frei rotierbar.
- Jeder Event-Listener ist defensiv; jede Codeänderung endet mit `npx pnpm -r build`.
- Secrets, Obsidian-REST-Schlüssel und breite Dateisystemrechte werden nicht committed.

## Reihenfolge und Abhängigkeiten

1. [Verträge und Repository-Grundlage](2026-10-08-rdo-rpg-world-contracts-and-foundation.md)
2. [Asset-Pipeline und Runtime-Manifest](2026-10-08-rdo-rpg-asset-pipeline.md)
3. [Valentine World Runtime](2026-10-08-rdo-rpg-valentine-world-runtime.md)
4. [Vertical Slice und Projekthygiene](2026-10-08-rdo-rpg-vertical-slice-and-governance.md)

Ein Paket wird erst begonnen, wenn sein Vorgänger committed ist und dessen Tests sowie der Workspace-Build erfolgreich sind. Die bestehende, schmutzige Arbeitskopie wird vor Paket 1 in eine isolierte Arbeitsbasis überführt; bestehende Änderungen werden nicht mit dem Neustart vermischt.

## Agenten- und Modellstrategie

- Ein Hauptagent mit hoher Denkintensität implementiert jedes Paket und hält die Verträge konsistent.
- Nur lesende Inventuren können an einen günstigen Schnellagenten delegiert werden; keine parallelen Schreibaufgaben.
- Ein frischer Reviewer prüft nach jedem Paket Manifest-/Weltgesetze, Testabdeckung und versehentliche Rohdatenänderungen.

## Abschlusskriterium

Das vierte Paket endet mit einem spielbaren Valentine-Rundgang im Desktop-Browser, reproduzierbaren Runtime-Daten, visuellen Referenztests, dokumentierten MCP-/Vault-Regeln und ohne aktive Antigravity-Logs.
