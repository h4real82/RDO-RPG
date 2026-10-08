# ADR-0001: Datengetriebener Valentine-Neustart

## Entscheidung

Der Browserclient konsumiert ausschließlich validierte Runtime-Artefakte unter `data/runtime/`. OpenIV-Rohdaten bleiben unverändert; Platzierung, Chunking und Asset-Referenzen stammen aus dem Weltmanifest. Die erste nutzbare Erfahrung ist ein lokaler Singleplayer-Vertical-Slice von Valentine mit orthografischer 2.5D-Kamera.

## Folgen

Keine geratene Weltgeometrie, keine direkte Client-Lektüre von Rohdaten und keine frühe Multiplayer-Abhängigkeit. Fehlende Modelle werden als Pipeline-Lücke berichtet, nicht durch Ersatzobjekte verdeckt.

Grundlage: [Architekturentwurf](../../../superpowers/specs/2026-10-08-rdo-rpg-restart-design.md) und [World-Runtime-Plan](../../../superpowers/plans/2026-10-08-rdo-rpg-valentine-world-runtime.md).
