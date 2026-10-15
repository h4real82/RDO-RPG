# RDO-RPG: geprüfter Übergabestand vom 16.10.2026

Auftrag: [H4R-50](https://linear.app/h4real82/issue/H4R-50).
Eingang: lokale Gemini-Übergabe `docs/TEMP/CodexCachedContext1510`.
Die folgenden Ergebnisse wurden im aktiven Restart-Worktree erneut geprüft;
ältere Bild-/Routenergebnisse sind ausdrücklich als historisch bezeichnet.

## Arbeitsstände

- Hauptcheckout `D:/Projects/RDO-RPG`, Branch `main`: bestehender Prototyp,
  zahlreiche bereits vorhandene uncommittete Änderungen. Kein pauschales Staging.
- Restart `C:/Users/h4rea/.codex/worktrees/rdo-restart-foundation/RDO-RPG`,
  Branch `codex/rdo-restart-foundation`, Prüfgrundlage `2e4b2462` plus lokale
  Quellrecovery-Erweiterung. Der Branch enthält die aktive Pipeline und
  den modularen Client; seine Veröffentlichung ist kein Merge nach `main`.
- Die README war in beiden Ständen veraltet (Phaser statt Three.js).

## Abgezeichnet: Platzierungsquellen gefunden

[H4R-52](https://linear.app/h4real82/issue/H4R-52) unter
[H4R-27](https://linear.app/h4real82/issue/H4R-27) ist abgeschlossen.
Beide Datensätze sind Root-CEntityDefs, keine MLO-Mitglieder oder Regenanker.

| Außenmodell | JOAAT | Quell-YMAP / Entity-Index | Originalposition [x,y,z] |
| --- | --- | --- | --- |
| `val_01_trainstn_ext` | `0xbfef411a` | `placement-recovery/levels_1/0x5B8D0DA4_ymap.xml`, 22 | `[-177.0218,633.8562,119.2600]` |
| `val_05_church_ext` | `0xe945accd` | `placement-recovery/levels_1/0x00344613_ymap.xml`, 53 | `[-226.5936,804.0024,133.6269]` |

Beide: Quaternion `[0,0,0,1]`, Skalierung `[1,1,1]`,
`LODTYPES_DEPTH_HD`, im XML `PRI_REQUIRED`.
Das ist der originale Spielkoordinatenraum. Bei der Integration muss das
bestehende Achsen-/GLB-Mapping angewendet und visuell geprüft werden.

Archetypenzuordnung:
`placement-recovery/patchpack006/0x4904B9D1_ytyp.xml`, Indizes 28 und 42.
Der Audit meldet keine mehrdeutigen Treffer.

| Quelldatei | SHA-256 |
| --- | --- |
| Bahnhof-YMAP | `351f1890b2118fcfe2f66ae230ebb018f3a1555db796c1452fda260fa8b01f0e` |
| Kirche-YMAP | `96a9127d89961eccf5eb6c22bcb30a5359a8ebc461b6830b8e9260c7cb85e176` |

Laut Übergabe stammen die Basis-Kacheln aus
`levels_1.rpf/jklm_7_10_area_lod_combine_metadata.rpf`; die Manifestanalyse
führte zu den hexadezimal benannten YMAPs. Der aktuelle Audit verifiziert die
vorliegenden XMLs und ihre Hashes, nicht den Inhalt des Original-RPF-Archivs.
Für diese zwei Quellplatzierungen ist derzeit kein weiterer Export nötig.

## Frisch ausgeführte Prüfungen

Im Restart-Worktree:

```powershell
tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli audit-landmark-sources --raw-root D:/Projects/RDO-RPG/data/raw --runtime-root data/runtime/valentine/placement-recovery --model val_01_trainstn_ext --model val_05_church_ext
tools/rdo_pipeline/.venv/Scripts/python.exe -m pytest tools/rdo_pipeline -q
tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli validate-valentine --runtime-root data/runtime/valentine/local-preview
npx pnpm --filter @rdo-rpg/client test
npx pnpm --filter @rdo-rpg/world-contracts test
npx pnpm -r build
```

Alle Befehle erfolgreich: beide Modelle `source-placement-found`,
116 Pipeline-Tests, 48 Client-Tests, 11 Vertragstests und 2 Node-Prüfungen.
Auditumfang: 209 XMLs, 110 YMAPs, 96 YTYPs, 6613 Root-Entities, 8274 Archetypen.
Bericht lokal: `data/runtime/valentine/placement-recovery/landmark-source-recovery.json`.
Der Hauptcheckout bestand ebenfalls `npx pnpm -r build`.
Vite-Warnungen zu CJS und Bundlegröße bleiben bestehen.

## Noch offen

Das Manifest `data/runtime/valentine/local-preview/rdo_world_manifest.json`
hat 143 Platzierungen und enthält keines der zwei neu belegten Exteriors.
Der Audit schreibt nur einen Diagnosebericht und verändert die Szene nicht.
Daher bleibt H4R-27 In Progress. Seine vorhandenen Abhängigkeiten H4R-25 und
H4R-26 bleiben bestehen.

Die Rundweg-Dokumentation berichtet über frühere Teilstreckenprüfungen,
14 Terrain-Kacheln nach Batch 02A und den gezielt ausgeschlossenen
`val_lights_holder_05`. Diese Browserergebnisse wurden hier nicht erneut
ausgeführt. Bodenlücken, Straßen-/Decalprobleme und die komplette
beidseitige Route bleiben offen. H4R-28/H4R-29/H4R-30 bleiben unabgenommen.

Nächste fachliche Arbeit: Exteriors mit Quellprovenienz integrieren,
Richtung/Skalierung und Media-Relationen rendernd prüfen, Terrain und
Kollisionen abnehmen, danach den vollständigen Rundweg testen.
Dieser Dokumentationsauftrag führt die Implementierung nicht automatisch aus.

## Aufgabenführung und Infrastruktur

Linear ist die Statusquelle. Die Übergabe aus `docs/Linear-Pending.md` wurde
mit H4R-52 nachgetragen. Historische Kanban-/Dashboard-Angaben belegen keine
aktuelle Agentenaktivität oder Fortschrittsprozente. Keine automatische
Synchronisierung oder Agentendelegation wurde eingerichtet.

[H4R-51](https://linear.app/h4real82/issue/H4R-51) steht in Review;
[H4R-35](https://linear.app/h4real82/issue/H4R-35) bleibt Backlog.
Supabase-Vorbereitung bedeutet keine Live-Migration oder Autosave-Abnahme.
Rohdaten, Runtime-GLBs und Texturpakete bleiben außerhalb des Pushs.

Details: [Recovery-Runbook im Restart](https://github.com/h4real82/RDO-RPG/blob/codex/rdo-restart-foundation/docs/runbooks/station-church-source-recovery.md).
