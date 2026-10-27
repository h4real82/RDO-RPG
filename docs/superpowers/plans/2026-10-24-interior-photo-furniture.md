# Innenraumfotos24.10.: Umsetzung

Benutzerauftrag:60Bilder aus12Ortsordnern verstehen und fehlende Einrichtung
im bisherigen texturierten Stil modellieren. Selbstständige lokale Umsetzung
ist autorisiert; keine zusätzliche Konzeptfreigabe und keine breite Map-Testserie.

1. Bilder samt Prüfsummen je Gebäude registrieren. Sichtbare Merkmale von
   verdeckten/unbekannten Räumen trennen. Hof/Camp/Auktionsbilder bleiben eigene
   Quellenbereiche, keine ungeprüften Hauszuordnungen.
2. `ReferenceFurniture.ts`: eigene Möbel mit UVs und Materialrollen für die
   vorhandenen Raumtexturen. Kommode, Schrank, Sessel/Sofa, Schreibtisch, Wasch-
   tisch, Ofen, Waffen-/Medizin-/Warenregal, Ticketschalter, Gitter, Kisten,
   Liege und Klappstuhl. Herkunft ausdrücklich authored-gameplay.
3. `SaloonFurniture.ts` bindet die neuen Modelle in die vorhandene Factory ein.
   Gebäudedaten ersetzen falsche Tisch-/Bar-Platzhalter. Türen, Treppen,
   Floor-Holes, importierte Varianten und Außenpositionen bleiben erhalten.
4. Gezielte Möbeltests: Abmessungen, Geometrie, Materialrollen und Herkunft.
   Betroffene Raumansichten prüfen; Einrichtungs-Kollision an den vorhandenen
   Tür-/Treppenwegen prüfen. Abschließend `npx pnpm -r build`.

Grenzen: Fotos sind keine maßstäblichen MLO-Pläne. Zusätzliche dargestellte
Stockwerke und unklare Gebäudeidentitäten separat als offen führen. Eigene
Modelle mit Originaltexturen sind keine importierten Originalmöbel.
