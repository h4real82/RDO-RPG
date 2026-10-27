# Innenraum-Fotoreferenzen24.10.2026

60 gelieferte Bilder aus12Ordnern geprüft, einschließlich der Ingame-Karten.
Index: `data/reference/valentine/interior-photo-intake-2026-10-24.json`.
Je Gebäude halten eigene Evidenzdateien die Bildnamen/Prüfsummen und sichtbaren
Merkmale fest. Die Originalbilder bleiben unverändert am gelieferten Ort.

## Umgesetzt

18 eigene UV-mappte Möbeltypen in `ReferenceFurniture.ts`: Stuhl, Schreibtisch,
Kommode, Kleiderschrank, Sessel, Sofa, Waschtisch, Ofen, Waffenständer,
Arzneischrank, Warenregal, Ticketschalter, Zellengitter, Kistenstapel,
Untersuchungsliege, Klappstuhl, Registrierkasse und einfacher Arbeitstisch.
Vorhandene Betten, Bänke und belegte Originalvarianten werden weiterverwendet.

Eigene Geometrie/UVs mit vorhandenen Original-Albedos, ausdrücklich
authored-gameplay; keine Behauptung wiedergewonnener Originalmöbel. Material-
quelle/Prüfsumme: `data/reference/valentine/furniture-materials-2026-10-24.json`.
Der vorhandene Saloon2-Holzbelag wird auf eigener Möbelgeometrie wiederverwendet;
das dunkle Zierleistenmaterial allein ließ die neuen Flächen kaum lesbar werden.

8bestehende Erdgeschoss-Piloten angepasst: Bahnhof, Arzt, Büchsenmacher, Hotel,
Gefängnisbüro, Gemischtwarenladen, Keane's und Smithfield's. Zusätzlich Möbel
im bestehenden Hotel-Obergeschoss ergänzt. Falsche Tisch-/Bar-Platzhalter bei
Liege, Lager, Waffenregal und Gitter ersetzt. Keane's erhält schlichte Tische;
die neue Referenz belegt dort weder Klavier noch einen ausgestatteten Pokertisch.
Tür-/Boden-/Treppenparameter und Außenpositionen wurden nicht verändert.

Die18Typen umfassen zusammen5548Dreiecke in den eigenständigen Modellen.
GLBs/Galeriebild und jeweilige Dreiecks-/Texturzahlen liegen lokal unter
`data/runtime/valentine/interior-intake-2026-10-24/models/`. Laufzeit benutzt die
vorhandene Factory und gemeinsam geladene Texturen; die separaten GLBs dienen
als überprüfbare3D-Bibliothek, sind keine zusätzliche Map-Auslieferung.
17Typen sind bereits in Raumdaten eingesetzt; Klappstuhl ist für das noch
nicht angeschlossene Kino vorbereitet, nicht als verfügbarer Kinoinnenraum.

## Geprüft und Grenzen

-25gezielte Modell-/Material-/Treppentests bestanden.
-8/8betroffene Gebäude: frische Raumaufnahmen, Innenkontext, texturierte
  Flächen ohne gemeldete fehlende Ressourcen und freie physische
  Eingang→Innenpunkt-Probe. Initiale DEV-Verlagerung, keine neue vollständige
  Maus-/Ortsrouten-Abnahme. Hotel-Obergeschoss zusätzlich abgebildet.
-Waffenständer zuletzt separat als exportiertesGLB gerendert: freie Läufe,
  Halteleisten hinter den Waffen, keine durch Waffen laufenden Regalflächen.
-`npx pnpm -r build` bestanden; übliche Chunkgrößenwarnung bleibt.

Hotelzimmer sind bisher Möbelgruppen im bestehenden Obergeschoss, kein fertiger
Mehrzimmergrundriss. Zusätzliche obere Räume/Treppen bei Smithfield's und Laden,
das Kinozelt sowie die exakte Zuordnung von Hof/Camp/Auktionsbildern bleiben
offen. Fotos beweisen keine maßstäblichen Räume oder Original-Assetnamen.
Eine vollständige visuelle Wiedererkennbarkeits-Abnahme ist damit nicht erklärt.

Restart-Worktree, Main separat erhalten. Keine Binärdateien zumGit hinzugefügt,
keinCommit/Push. LinearH4R-47 bleibt InProgress.
