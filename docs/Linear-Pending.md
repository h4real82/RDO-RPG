# Linear Pending Updates

Stand: 16.10.2026

## Synchronisiert: H4R-52 als Sub-Issue zu H4R-27

Am 16.10.2026 durch Codex nach frischem Audit nachgetragen:
[H4R-52](https://linear.app/h4real82/issue/H4R-52), Status Done.
H4R-27 bleibt In Progress: Runtime-/Media-Abgleich ist noch offen.
Die folgende Übergabe bleibt als historischer Eingang erhalten.
Für diesen Übergabepunkt steht keine Linear-Aktualisierung mehr aus.

- **Parent Issue:** [H4R-27: Valentine-Manifest, GLB-Platzierungen und Media-Referenzen abgleichen](https://linear.app/h4real82/issue/H4R-27/valentine-manifest-glb-platzierungen-und-media-referenzen-abgleichen)
- **Typ:** Sub-Issue (Child)
- **Status:** Done (Erfolgreich abgeschlossen am 16.10.2026)
- **Priorität:** High (Blocker für H4R-27 aufgehoben)
- **Meilenstein:** M0 – Foundation / Vertical Slice
- **Team:** H4R
- **Projekt:** RDO-RPG (P-H4R-2)

### Titel
OpenIV-Export: Basis-YMAPs aus levels_1.rpf für Bahnhof und Kirche bereitstellen

### Beschreibung
```markdown
### Problem und Ziel
In H4R-27 fehlten die originären HD-Weltplatzierungen für Bahnhof (`val_01_trainstn_ext`) und Kirche (`val_05_church_ext`).
Ziel: Gezielter Export der vollständigen Basis-YMAPs aus `levels_1.rpf` und Wiederherstellung der Transformationen.

### Ergebnis & Forensischer Nachweis (Status: Done)
Alle Akzeptanzkriterien wurden erfüllt. Durch den Export der Kacheln aus `jklm_7_10_area_lod_combine_metadata.rpf` konnten beide Gebäude zweifelsfrei und mit originären Rockstar-Transformationen verifiziert werden:

1. **Bahnhof (`val_01_trainstn_ext`, JOAAT: `0xBFEF411A`)**:
   - Quell-Datei: `placement-recovery/levels_1/0x5B8D0DA4_ymap.xml`
   - Position: `x = -177.0218, y = 633.8562, z = 119.2600`
   - Rotation (Quaternion): `[0.0, 0.0, 0.0, 1.0]` (Identität)
   - Skalierung: `[1.0, 1.0, 1.0]`
   - LOD: `LODTYPES_DEPTH_HD`, Priority: `PRI_REQUIRED`

2. **Kirche (`val_05_church_ext`, JOAAT: `0xE945ACCD`)**:
   - Quell-Datei: `placement-recovery/levels_1/0x00344613_ymap.xml`
   - Position: `x = -226.5936, y = 804.0024, z = 133.6269`
   - Rotation (Quaternion): `[0.0, 0.0, 0.0, 1.0]` (Identität)
   - Skalierung: `[1.0, 1.0, 1.0]`
   - LOD: `LODTYPES_DEPTH_HD`, Priority: `PRI_REQUIRED`

Pipeline-Audit (`audit-landmark-sources`) meldet für beide Modelle: **`source-placement-found`**.
Audit-Ergebnis geschrieben nach `data/runtime/valentine/placement-recovery/landmark-source-recovery.json`.
```
