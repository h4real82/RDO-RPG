# Hotel: Quellen und eigene Spieladaption

Stand 24.10.2026. `source-manifest.json` hält Quelldateien, SHA256-Werte,
Texturkopien und die tatsächlich erreichte Geometriereduktion fest.

## Originalbett

Das Bett stammt aus der bereits lokal gelieferten
`data/raw/models/val_hotel_room1a_furni_ydr/val_hotel_room1a_furni.ydr.full`.
Der genaue ursprüngliche Archivpfad bleibt `[FLAG: Data Missing]`.
Eine Sichtprüfung des kompletten exportierten Modells zeigte Bett, Spiegel und
weitere Dekoration. `bed-region.json` wählt ausschließlich den Bettbereich.

- Vollständiges Source-GLB: 22.132 Dreiecke.
- Bettbereich/Runtime: 19.096 Dreiecke, vier unveränderte Original-Albedos und UVs.
- Die konservative Vereinfachung entfernte keine weiteren Dreiecke. Keine
  zusätzliche prozentuale Reduktion behaupten.
- Auswahl, Pivot, Größe und Raumplatzierung sind eigene Spieladaption.
- `interiors/hotel/bed-v1.glb` ist die konfigurierte Runtime-Variante. Die anderen
  geprüften Hotel-Source-GLBs sind keine automatisch verfügbaren Möbel.

Reproduktion aus dem Restart-Root, in getrennte bisher nicht belegte Ausgabepfade:

```powershell
& 'D:/Projects/RDO-RPG/apps/tools/Blender/blender-3.2.2-windows-x64/blender.exe' `
  --background --python-exit-code 1 --python tools/convert_models_blender.py -- `
  --input-dir D:/Projects/RDO-RPG/data/raw/models `
  --output-dir data/runtime/valentine/interior-originals/hotel-source-2026-10-23 `
  --texture-root D:/Projects/RDO-RPG/data/raw/textures `
  --only val_hotel_room1a_furni

node scripts/prepare-interior-assets.mjs `
  data/runtime/valentine/interior-originals/hotel-source-2026-10-23/val_hotel_room1a_furni.glb `
  data/runtime/valentine/verified-scene/interiors/hotel/bed-v1.glb `
  data/reference/valentine/buildings/hotel/visuals/bed-region.json
```

Der Konverter/Variantengenerator überschreibt bestehende Varianten absichtlich
nicht. Vorhandene Ergebnisse zuerst anhand des Manifests prüfen; für eine neue
Variante einen neuen Ausgabepfad wählen und die Floor-Konfiguration bewusst ändern.

## Texturen und Ersatzgeometrie

Die vier eigenständig kopierten PNGs sind im Manifest mit ihrem relativen Rohpfad
und Hash registriert. Ziel ist `verified-scene/interiors/hotel/textures/`.
Die Dateien bleiben lokal und ignoriert. Ihre Verwendung auf eigenen Böden,
Wänden und Teppichen einschließlich UV-Wiederholung ist ausdrücklich authored.

Die Badewanne ist eine eigene offene Kupfergeometrie. Die geprüften
`val_hotel_bathroom_details02` zeigen Beistelltisch/Badeablage, keine bestätigte
Wanne. Das eigene Modell deshalb nicht als Original-Wannenimport ausgeben.

## Prüfung und Grenze

Originalbett separat als drehbare 3D-Geometrie gesichtet, in der Runtime geladen
und auf Desktop/430px geprüft. Hotel-Auf-/Abstieg und Rückweg mit aktiver
Kollision bestanden. Das belegt den Pilotumfang, keine vollständige originale
Hotelraumorganisation oder gesamte Innenausstattung.
