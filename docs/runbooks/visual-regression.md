# Valentine – visuelle Referenzprüfung

## Zweck

Die Referenzprüfung schützt die maßgetreue, manifestgesteuerte Rekonstruktion vor stillen Lage- oder Kameraabweichungen. Sie erzeugt keine neue Weltgeometrie und akzeptiert keine Ersatzmodelle.

## Ausführen

1. Die lokale Vorschau muss mit dem expliziten, generierten Runtime-Ordner `data/runtime/valentine/local-preview/` vorliegen.
2. `pnpm test:e2e` prüft Readiness, Bewegung, orthografische Kamera, POI-Fallback und den Renderloop.
3. `node scripts/reference-render-check.mjs` schreibt die fünf festen Aufnahmen nach `data/runtime/valentine/test-artifacts/reference-renders/`.

Die Artefakte sind absichtlich ignoriert. Die Pose-Datei und die Referenzmedien bleiben die versionierte Prüfgrundlage.

## Akzeptanz

Vor einer Freigabe wird jede Aufnahme gegen die unter `reference-camera-poses.json` genannte Medienreferenz geprüft. Blockierend sind insbesondere falsche Straßenführung, falsche Gebäude-/Bahnhofslage, fehlende Gleiskorridore, abweichende Höhen oder eine perspektivische statt orthografische Projektion. Material- oder Browser-GPU-Unterschiede dürfen nur toleriert werden, wenn Position, Silhouette, Maßstab und Sichtlinie unverändert bleiben.

## Baseline

Eine neue Baseline braucht einen dokumentierten Pipeline-Input, dieselbe Manifestversion und eine Sichtprüfung gegen die RDO-Referenz. Eine Baseline darf niemals eine unaufgelöste Modelllücke als korrekt deklarieren.
