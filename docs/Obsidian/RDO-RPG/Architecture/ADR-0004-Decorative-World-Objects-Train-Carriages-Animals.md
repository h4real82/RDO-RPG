# ADR-0004: Dekorative Großobjekte – Valentine-Dampfzug, Straßenkutschen und Straßentiere

## Status
Angenommen & Implementiert (Ticket H4R-127, Meilenstein S5)

## Kontext
Valentine im Wilden Westen von 1899 wirkt erst lebendig und atmosphärisch dicht, wenn die charakteristischen Großobjekte der Epoche die Welt prägen:
1. Ein rauchender Dampfzug mit Kohletender und Personenwagen auf den Gleisen am Bahnhof Valentine.
2. Historische Concord-Postkutschen und Fracht-Arbeitswagen entlang der Hauptstraße und in den Ladehöfen.
3. Straßentiere: Angebundene Westernpferde an den Holzbalken der Saloons und Geschäfte, dösende Hunde auf den Holzveranden und Hühner im Gehege des Auction Yards.

## Architekturentscheidung
- **Single Source of Truth**: Konfiguration in `data/reference/valentine/map-completion.json` unter dem Knoten `decorativeWorldObjects`.
- **Echte Terrain-Höhenanbindung**: Alle Objekte werden über `height(x, z)` exakt auf das tatsächliche Geländeniveau bzw. die Gleise aufgesetzt.
- **Dampfzug (4-4-0 American Steam Locomotive)**:
  - Lokomotive: Zylindrischer Dampfkessel, konischer Schornstein mit Funkenfänger, Dampf- und Sanddom, Messingglocke, Messingpfeife, beleuchtete Frontlaterne, vorderer Kuhfänger (Wedge Pilot), 4 Vorlauf- und 4 große Triebräder mit Kuppelstangen sowie Führerhaus.
  - Kohletender: 8 Drehgestellräder, Stahlwasserbehälter und aufgeschüttete Kohlebrocken (`coal`-Material).
  - Personenwagen: Reichhaltige Holzvertäfelung (`coachWood`), Monitor-Dachaufbau, 8 Passagierfenster je Seite, offene Endplattformen mit Eisengeländern.
  - Positioniert auf den Schienen bei `x: -171.0, z: -618.0, yaw: -0.635`.
- **Kutschen & Frachtwagen**:
  - 2 Concord-Personenkutschen mit Speichenrädern, Lederband-Aufhängung, Gepäckträgern und Deichsel (Saloon-Frontage und Livery-Zufahrt).
  - 2 offene Buckboard-Frachtwagen mit Fässern, Kisten und Kornsäcken (Auction Yard Laderampe und Güterbahnhof).
  - 1 gedeckter Planwagen (Conestoga Prairie Schooner mit Stoffverdeck) auf der Nord-Hauptstraße.
- **Straßentiere**:
  - 5 angebundene Pferde (Fuchs, Brauner, Rappe, Palomino) an den Hitching Posts von Saloon, Sheriff, Stall und Arzt mit Satteldecke, Westernsattel, Zaumzeug und angebundenen Zügeln.
  - 3 Straßenhunde (schlafend auf der Saloon-Veranda, wachsam sitzend am Stall, ruhend am Bahnhof).
  - 6 Hühner im Gehege des Auction Yards (pickend, scharrend, auf dem Zaun sitzend, brütend).
- **Kollisions- & Physikintegration**:
  - Lokomotive, Tender, Wagen und Kutschen erhalten solide Kollisionsboxen in `valentine-completion-collision.glb`, um ein Hindurchgehen zu verhindern.
  - Tiere besitzen sanfte Puffer, sodass der Spieler nicht hängenbleibt.

## Konsequenzen
- Die lebendige Atmosphäre von Valentine steigt drastisch, da Schienen und Straßen ihren authentischen Zweck erfüllen.
- Alle 607+ Monorepo-Tests und der `npx pnpm -r build` Build-Gate bleiben zu 100% grün.
