# ADR-0003: Tripo-3D Asset-Pipeline, Saloon-Innenraum-Upgrade und Custom Artwork Spezifikation

## Status
Akzeptiert (31.10.2026)

## Kontext & Problemstellung
Im Rahmen des Spielerfeedbacks zu den Innen- und Außenansichten von Valentine wurden folgende Problemstellen adressiert:
1. **Barkeeper & NPCs**:
   - Die bisherige prozedurale Box-Figur wirkte grafisch wie eine untexturierte Lego-Figur und brach den immersiven Western-Look massiv.
   - Kling AI steht wegen aufgebrauchter Credits nicht mehr zur Verfügung und lieferte ohnehin keine produktionsreifen, drehbaren 3D-Modelle.
2. **Minispiel-Tische & Deko**:
   - Tische und Stühle waren schlicht und ließen nicht erkennen, welche Minispiele (Poker, Blackjack, Mäxchen) an welchem Tisch gespielt werden.
   - Die Dartscheibe an der Wand bestand lediglich aus flachen Kreisscheiben.
3. **Wandbilder & Personalisierung**:
   - Der Wunsch, Gemälde in Innenräumen durch eigene Bilder zu ersetzen und bei Annäherung detailreich in einer Großansicht zu betrachten, erforderte eine einheitliche Spezifikation für Bildformate und eine interaktive Inspektions-Schnittstelle.
4. **Kamera-Ausschnitt in Innenräumen**:
   - Die Innenräume wurden in der 2.5D-Orthographic-Kamera zu klein gerendert; viel Bildschirmfläche blieb als graublauer Rand ungenutzt.
5. **Verkohlte Verandaböden & Schindeln**:
   - PBR-Texturen der Außenfassaden (Veranden, Treppen, Schindeln) litten unter ACES-Filmic-Black-Crush und wirkten verbrannt/verkohlt.

## Entscheidung

1. **Ablösung von Kling AI & Einführung von Tripo 3D**:
   - Kling AI wird formell außer Betrieb genommen.
   - Die offizielle **Tripo 3D CLI** (`tripo-cli`) wird als standardisierte Generierungspipeline für 3D-Western-Assets (NPCs, Kleidung, Waffen, Reittiere, Verbrauchsgüter) etabliert.
2. **Saloon-Interior-Überholung**:
   - **Western-Barkeeper (`SaloonFurniture.ts`)**: Vollständig modellierter Western-Bartender mit hoher Schürze, Taillenweste mit Uhrenkette, hochgekrempelten Ärmeln mit Manschetten, Halstuch, Koteletten, Schnauzbart und Glas in der Hand.
   - **Tisch-Typisierung**: Spezifische Aufbauten für Poker (grüner Filz, Karten, Chips, `🃏 POKER`-Schild), Blackjack (Halbkreisfilz, Kartenschuh, `♠️ BLACKJACK`-Schild) und Mäxchen (Würfelbecher, Holzteller, Bierkrüge, `🎲 MÄXCHEN`-Schild).
   - **3D-Dartboard-Kabinett (`DartboardCabinet.ts`)**: Schrankgehäuse aus dunklem Walnussholz, geöffnete Flügeltüren mit beschrifteten Schiefer-Kreidetafeln (301/501, Tallies), Sisal-Board mit Drahtspinne und Messingpfeilen.
3. **Custom Artwork Spezifikation & In-game Betrachter**:
   - Spezifikation in `docs/specifications/custom-artwork-spec.md` dokumentiert zulässige Bildformate (16:9, 4:3, 1:1, 3:4; WebP, PNG, JPG) und Ordnerpfade (`public/assets/artworks/`).
   - Der `ArtworkViewer` bietet ein modales Dialogfenster im viktorianischen Rahmen mit Bildmetadaten, Format-Empfehlungen und lokalem Datei-Upload zur Live-Ersetzung der 3D-Materialtextur.
4. **Dynamischer Innenraum-Kamerazoom**:
   - In `ContextCamera.ts` wird die sichtbare Höhe im Innenraum-Modus dynamisch um den Faktor `0.72` skaliert (`visibleHeight = Math.max(5.5, Math.min(20, fit * 0.72))`). Räume füllen den Viewport komfortabel aus.
5. **PBR-Albedo-De-Charring**:
   - In `DrawableMaterialPreview.ts` werden unterbelichtete RDR2-Holztexturen (`val_cs_woodporch_1_ab`, `str_fl_woodplank03_ab`, `nbx_roofs_shingle11_ab` etc.) über gezielte Farb-Skalierung aufgehellt, um den natürlichen Charakter von sonnengebleichtem Kiefern- und Zedernholz wiederherzustellen.
6. **Verbindliche Referenzen**:
   - Die 12 User-Intake-Ordner unter `docs/TEMP/User-Intake/Investigation/24-10-26/Innen Pläne/` bilden die maßgebliche Raumplan- und Detailevidenz.

## Konsequenzen
- Stark verbesserte Raumwirkung und lebendige Atmosphäre im Smithfields Saloon.
- Saubere, reproduzierbare 3D-Asset-Pipeline mit Tripo 3D.
- Spieler können Gemälde interaktiv betrachten und anpassen.
- Build-Gate und Test-Suites bleiben bei 100% grün (607/607 Tests).
