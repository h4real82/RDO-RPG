# ADR-0002: Boden-, Wege-, Innenraum- und Kinosteuerungs-Architektur

## Status
Akzeptiert (31.10.2026)

## Kontext & Problemstellung
Im Rahmen des visuellen und spielerischen Reviews von Valentine wurden mehrere Diskrepanzen identifiziert:
1. **Innenraum-Überstrahlung & Porch-Bleed**:
   - Die Übernahme von warmen Kiefern-Dielen albedo auf `accessMaterial` färbte unbeabsichtigt alle Außen-Veranden, Stufen und Rampen in leuchtendes Gelb.
   - Zu hohe Shader-Gains (1.30–1.35) führten zu überbelichteten Innenräumen ohne natürlichen Schattenabfall.
2. **Wegebeschaffenheit & Terrain-Monotonie**:
   - Wege wirkten wie flache, gleichförmig dunkelbraune Bänder ohne Spurrillen, Hufspuren, Unebenheiten oder organische Ausfransung in das Gras.
   - Der Farbkontrast zwischen Spielfigur und Straße war unzureichend.
   - Große Grasflächen wiederholten dieselbe Texturkachel ohne Makro-Variation.
3. **Interaktive Innenraum-Features**:
   - Wandbilder waren statische Deko; es fehlte eine fokussierte Kunst-Inspektionsansicht und die Möglichkeit, eigene Bilder einzubinden.
4. **Kino-Zelt (Magic Lantern)**:
   - Spieler saßen in der Isometrie weit weg von der Leinwand; gewünscht ist ein direkter First-Person Theater-Modus beim Hinsetzen inklusive synchroner Steuerung für Co-Watching.
5. **Ingame-Navigation**:
   - Es fehlte eine Ingame-Kartenansicht mit Mitspieler-Ortung und 3D-Bodenleitsystem zu selbst gesetzten Wegpunkten.

## Entscheidung

1. **Entkopplung von Außen- und Innenholz**:
   - `accessMaterial` (für Außen-Veranden, Treppenstufen und Rampen) ist architektonisch von `floorMaterial` getrennt und erhält die Rolle `boardwalk` mit verwittertem, dunklem Westernholz (`#5c4834`, Roughness 0.92). `RoomAppearance` überschreibt niemals `boardwalk`-Rollen mit Innenraumböden.
   - Innenraumböden werden mit moderatem Gain (1.02–1.05) betrieben, um natürliche Lichtstimmung zu wahren.
2. **Organischer Straßen- und Terrain-Shader (H4R-119)**:
   - Die Weggeometrie erhält prozedurale Wagenspuren (Kutschenfahrrillen), Pferdehufabdrücke und Kieselsteine über einen Mehrkanal-Albedo- und Normal-Shader.
   - Kanten erhalten einen weichen Alpha-/Displacement-Übergang zum Gras.
   - Die Grasflächen erhalten einen Frequenz-Makro-Noise zur Brechung von Wiederholungen.
3. **Interaktive Wandkunst (H4R-120)**:
   - Bei Annäherung an Gemälde wird ein Inspektions-Trigger aktiviert. Klick auf `[E]` öffnet eine detailreiche Galerieansicht im Vordergrund.
4. **Kino-Theater-Modus & Co-Watching (H4R-121)**:
   - Das Einnehmen eines Stuhls triggert einen Kamera-Interpolations-Modus direkt auf die Leinwand in maximaler Fenstergröße.
   - Ein HUD klappt Bedienelemente (Play/Pause, Zeitleiste, Rollenauswahl) aus und synchronisiert den Status über Colyseus.
5. **Ingame-Weltkarte & Navigationsführung (H4R-122)**:
   - Eine Overlay-Karte auf Taste `M` zeigt Gebäude, Aktivitäten und Live-Icons anderer Spieler.
   - Klick auf die Karte erzeugt einen Wegpunkt, der über einen dezenten 3D-Bodenstrahl in der Spielwelt gerendert wird.

## Konsequenzen
- Klare Trennung von Innenraum- und Außengeometrie in Kollision und Shader-Zuweisung.
- Drastisch verbesserte visuelle Tiefe und Atmosphäre des Wilden Westens.
- Neue Tickets `H4R-119` bis `H4R-122` in Linear führen die operative Umsetzung.

