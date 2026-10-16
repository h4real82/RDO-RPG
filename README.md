# RDO-RPG

Western-RPG als Discord Activity mit **Three.js, TypeScript, Vite und Colyseus**.
Stand: **16.10.2026**. Schwerpunkt ist die quellenbasierte Rekonstruktion der
Valentine-Außenwelt; vollständige Karte und Multiplayer-Vertikalschnitt sind noch
nicht abgenommen.

## Aktueller Stand

- **Bahnhof und Kirche:** Die originalen HD-Außenplatzierungen sind gefunden.
  Der frische Audit bestätigt für beide Modelle `source-placement-found`.
  Dafür ist derzeit kein weiterer OpenIV-Export erforderlich.
- **Runtime:** Die geprüfte lokale Restart-Vorschau enthält 143 Platzierungen.
  Die beiden neu belegten Außenhüllen sind darin noch nicht integriert.
- **Terrain und Route:** Frühere Teilstreckenprüfungen und Materialvorschauen
  liegen vor. Bodenlücken, Straßen-/Decal-Darstellung, Kollisionsabgleich und
  vollständiger Rundweg bleiben offen. Diese Sitzung enthält keine neue Browserabnahme.
- **Frische Validierung:** 116 Pipeline-Tests, 48 Client-Tests, 11 Vertragstests
  plus 2 Node-Prüfungen, Runtime-Validierung und Pflicht-Build im Restart bestanden.
  Auch der Hauptcheckout bestand `npx pnpm -r build`.
  Vite warnt weiterhin vor CJS-Abkündigung und großen Bundles.

Quellkoordinaten, Prüfbedingungen und offene Abnahmen:
[Projektstand vom 16.10.2026](docs/Project-Status-2026-10-16.md).

## Branches und Arbeitsstände

| Stand | Zweck |
| --- | --- |
| `main`, lokal `D:/Projects/RDO-RPG` | Bestehender Three.js-/Colyseus-Prototyp; viele zusätzliche lokale Änderungen |
| [`codex/rdo-restart-foundation`](https://github.com/h4real82/RDO-RPG/tree/codex/rdo-restart-foundation) | Aktive Restart-Implementierung: modularer Client, Weltverträge, Python-Pipeline und Tests |

Der Restart liegt lokal unter
`C:/Users/h4rea/.codex/worktrees/rdo-restart-foundation/RDO-RPG`.
Sein Branch-Push ist noch kein Merge nach `main`. Die Pipeline-/Client-Tests oben
beziehen sich auf den Restart. Ein frischer Clone enthält keine lokalen Rohdaten
oder generierten Runtime-GLBs.

## Architektur

- `apps/client`: Three.js, Vite und TypeScript. Der Restart kapselt Bootstrap,
  Weltstreaming, GLB-Cache, orthografische Kamera, Bewegung, Geländeprüfung,
  Kollisionen, HUD und Interaktionen unter `src/game/`.
- `apps/server`: Express, Colyseus und Discord-Tokenaustausch als Grundlage
  des autoritativen Servers. Die lokale Restart-Vorschau belegt noch keinen
  erfolgreichen Discord-/Zwei-Client-Test.
- `packages/shared` und `packages/content`: gemeinsame Netzwerktypen,
  Colyseus-Schemas und Inhaltsdaten.
- `packages/world-contracts` und `tools/rdo_pipeline` **im Restart-Branch**:
  Weltverträge, Koordinatenkonvertierung, Exportinventar, Provenienz,
  Manifestaufbau und Diagnosewerkzeuge.
- `infra`: Caddy und Docker. Deployment wurde in dieser Sitzung nicht neu geprüft.

## Lokal starten

Node.js 20+ und die in `package.json` festgelegte pnpm-Version verwenden.
Im gewünschten Checkout:

```powershell
npx pnpm install
npx pnpm -r build
npx pnpm dev
```

Client: `http://localhost:3000`; Server: `http://localhost:2567`.
Die Restart-Vorschau benötigt zusätzlich lokal erzeugte Daten unter
`data/runtime/valentine/local-preview/`.
Aufbau und Prüfungen: [Pipeline-Runbook im Restart](https://github.com/h4real82/RDO-RPG/blob/codex/rdo-restart-foundation/docs/runbooks/asset-pipeline.md).
Discord-Zugangsdaten gehören in lokale Umgebungsvariablen; Client-Secret und
Service-Keys dürfen nie ins Clientbundle oder Git gelangen.

## Architektur

Die Repository-Architektur ist als Dark-Mode-Übersicht dargestellt. Sie zeigt
den Hauptpfad vom Discord-Activity-Client über Caddy und Colyseus bis zu
`WorldRoom` sowie die gemeinsamen `shared`-/`content`-Verträge.

![RDO-RPG Repository-Architektur im Dark Mode](docs/screenshots/rdo-rpg-architecture-dark.png)

Die interaktive Archify-Version liegt lokal unter
`.archify/architecture-rdo-rpg-20261017-000000/rdo-rpg-architecture.html`.

## Daten und Qualitätsgrenzen

- GitHub führt Quellcode, Dokumentation, Schemas und Pipeline-Tools.
  Originalmodelle, Texturpakete und generierte GLBs bleiben lokal.
- `data/raw/` bleibt unverändert; `data/runtime/` enthält generierte Ausgaben.
  Bereits versionierte kleine Runtime-Konfigurationen im Restart sind keine
  Modellpakete; Git-Ignore entfernt zuvor getrackte Dateien nicht rückwirkend.
- `Media/` und belegte Originaltransformationen bestimmen den Kartenabgleich.
  Ein Modellname oder ein grüner Build belegt keine korrekte Platzierung.
- Supabase ist für relationale Spielzustände vorgesehen. Neue Live-Migrationen,
  Autosave und Storage-Uploads wurden mit diesem Abgleich nicht ausgeführt.

## Aufgaben und nächste Abnahmen

[Linear führt den aktuellen Status](https://linear.app/h4real82/project/rdo-rpg-d9ca7fe5de94).
Historische Dashboards und Checkboxen sind keine Live-Fortschrittsanzeige.
Es besteht keine automatische Obsidian-/GitHub-/Linear-Synchronisierung.

1. [H4R-52](https://linear.app/h4real82/issue/H4R-52): Quellplatzierungen Bahnhof/Kirche nachgewiesen, abgeschlossen.
2. [H4R-27](https://linear.app/h4real82/issue/H4R-27): Exteriors mit Provenienz integrieren und gegen Media abgleichen.
3. [H4R-28](https://linear.app/h4real82/issue/H4R-28) und [H4R-29](https://linear.app/h4real82/issue/H4R-29): Terrain und Client-/Server-Kollision abnehmen.
4. [H4R-30](https://linear.app/h4real82/issue/H4R-30): vollständigen Kernrundweg mit Kollision und ohne Noclip abnehmen.

Dokumentationsabgleich: [H4R-50](https://linear.app/h4real82/issue/H4R-50).

## Bilder aus der DEV-Prüfung vom 16.10.2026

Die Aufnahmen zeigen den [Restart-Branch](https://github.com/h4real82/RDO-RPG/tree/codex/rdo-restart-foundation)
mit 145 quellengebundenen Objekten einschließlich Bahnhof und Kirche.
Der DEV-Inspektor ist noch nicht in `main` integriert. Sichtbare Terrainlücken
und unvollständige Straßenflächen sind weiterhin offene Abnahmepunkte.

**Ortsübersicht – orthografische 2.5D-Ansicht:**

![Valentine: quellengebundene Ortsübersicht](docs/screenshots/valentine-inspector-2026-10-16/town.png)

**F2-Debug – Raster, Landmarken-IDs, Objektgrenzen und Quelloberflächen:**

![Valentine: F2-Debugansicht mit Koordinaten und Objektgrenzen](docs/screenshots/valentine-inspector-2026-10-16/debug.png)

**Draufsicht – Norden oben, Bahnhof im Südosten und Kirche im Nordosten:**

![Valentine: nordorientierte Draufsicht](docs/screenshots/valentine-inspector-2026-10-16/top.png)

Diese Bilder belegen den Darstellungs-/Inspektionsstand, keine vollständige
Routen- oder Server-Kollisionsabnahme. Auftrag:
[H4R-53](https://linear.app/h4real82/issue/H4R-53).

## Lizenz

MIT für den Projektcode. Daraus folgt keine Weitergabeerlaubnis für lokale
Rockstar-Originalassets; diese sind kein Bestandteil des Quellcode-Pushs.
