# Valentine Vertical Slice – geprüfter Stand

Stand: 31.10.2026. Diese Notiz beschreibt den aktuellen verifizierten Entwicklungsstand im RDO-RPG-Worktree.

## Abgeschlossene Meilensteine (100% Done in Linear)

1. **M0 – Valentine Exterior: verifizierte Kernroute**: Vollständige Kernroute Bahnhof → Hauptstraße → Saloon → Kirche mit vereinfachter Spielkollision, echtem HD-Terrain und 2.5D-Projektion abgenommen.
2. **M1 – The Outlaw Skeleton**: Stufenlose Kamera-Occlusion, Dachüberhang-Audits, 30s Colyseus Reconnection, Supabase-Persistenz und robuste Input-Guards abgenommen.
3. **UX – App-Struktur und bedienbarer Menü-Entwurf**: Stitch-Menü mit Glasflächen, Navigation und Session-Lebenszyklus integriert.
4. **S1 – Solo und private Valentine-Session**: Kontextkamera für Ortsübersicht/Eingänge/Stockwerke, Raumregister mit vollständiger Bodenabdeckung, WASD/Klick-Bewegung mit Shift-Lauf/Renn-Modus.
5. **S2 – Sozialer Hub, Bahnhof und Saloons**: Saloon-Präsenz, Getränkekarten, Musikplayer mit Host-Warteschlange, Stations-Infostand und Schaffner.
6. **S3 – Karten- und Würfeltische**: Vollständige Server- und Client-Implementierung von Poker (Texas Hold'em), Blackjack, Skat (32 Karten, Reizen, Bedienpflicht), Mäxchen und atomarem WalletService-Settlement.
7. **S4 – Kino, Pferderennen und Erinnerungsorte**: Autoritative Server-Pferderennen-Räume mit Checkpoint-Erzwingung, Magic-Lantern-Kinozelt, kuratierte Erinnerungsorte und 2-Client-Fähigkeitsmatrix.

## Aktuelle Test- und Build-Metriken (31.10.2026)
- **Client Vitest Suite**: 115 Testdateien, 607 Tests bestanden (100%).
- **Server Test Suite**: 20 Tests bestanden (100%).
- **World Contracts**: 14 Tests bestanden (100%).
- **Monorepo Build Gate**: `npx pnpm -r build` kompilierte alle 6 Workspace-Pakete fehlerfrei mit Exit Code 0.

## Neu identifizierte Anforderungen & Geplante Tickets (31.10.2026)

Auf Basis der jüngsten Spieltests und visuellen Analysen wurden folgende Arbeitspakete in Linear angelegt und bearbeitet:
- **H4R-119**: *Weg- und Geländerealismus: Wagenspuren, Hufabdrücke, unregelmäßige Ränder und Grasvariationen* (Organische Western-Wege mit Kutschenrillen, weichen Übergängen zum Terrain und höherem Kontrast zur Spielfigur). [Status: Todo]
- **H4R-120**: *Individuelle Innenraumgestaltung: Detailausbau, interaktive Wandbilder mit Großansicht und Artwork-Wechsel* (Modulare Raumkuratierung, `[E]`-Inspektionsmodal für hochauflösende Gemäldebetrachtung und austauschbare Bilder). [Status: Todo / Erweitert durch H4R-126]
- **H4R-121**: *Kino-Zelt: First-Person-Sitzmodus auf Leinwand, ausklappbares Videomenü und synchrones Co-Watching* (Automatischer First-Person-Kamerafokus auf die Leinwand beim Platznehmen, ausklappbares Steuer-HUD, synchronisierte Wiedergabe für sitzende Zuschauer). [Status: Todo]
- **H4R-122**: *Interaktive Ingame-Weltkarte mit Live-Spielermarkern, POI-Wegpunkten und 3D-Bodenwegweiser* (Übersichtskarte auf `M`, Live-Positionen von Mitspielern, Wegpunkt-Setzung mit In-World-Navigationslinie/Kompassführung). [Status: Todo]
- **H4R-123**: *Tripo-3D-Pipeline: Detaillierter Barkeeper, NPCs, Ausrüstung und Verabschiedung von Kling AI* (Ablösung der Lego-Box-Figur durch authentischen Western-Barkeeper mit Schürze, Weste, Hemdsärmeln, Schnauzbart und Glas; Tripo CLI Integration; Kling AI formell retired). [Status: In Review]
- **H4R-124**: *Veranda- und Dachholz-Aufhellung: Behebung des verkohlten/ausgebrannten Erscheinungsbilds* (Entfernung des ACES-Filmic-Black-Crushs auf verwitterten RDR2-Holztexturen wie `val_cs_woodporch_1_ab` und `nbx_roofs_shingle11_ab` über lineare PBR-Albedo-Skalierung). [Status: In Review]
- **H4R-125**: *Dynamischer Innenraum-Kamerazoom für großformatige, detailreiche 2.5D-Raumansichten* (Fokussierter Innenraum-Orthographic-Zoom `fit * 0.72` [5.5m–20m] für bildschirmfüllende, immersive Raumansicht ohne tote Ränder). [Status: In Review]
- **H4R-126**: *Wandbilder-Spezifikation, Ingame-Großansicht und benutzerdefiniertes Artwork-Austauschsystem* (Technische Spezifikation in `docs/specifications/custom-artwork-spec.md`, interaktiver `ArtworkViewer` mit viktorianischem Rahmen, Format-Guidance und lokalem Datei-Austausch zur Laufzeit). [Status: In Review]

## Umgesetzte Fehlerbehebungen & visuelle Optimierungen (31.10.2026)
1. **Innenraumböden bei Außenkamera isoliert**: `InteriorPresentation.ts` rendert umschlossene Innenraumböden bei Außenansicht nicht mehr (`showFloor` ist draußen strikt false). Keine hervorstehenden braunen Kanten/Bodenplatten mehr an Bank und Außenwänden.
2. **Synthetische Treppen und Veranda-Platten entfernt**: `AuthoredBank.ts` blendet redundante synthetische Verandaplatten (`deck-planks`) und Straßen-Treppen (`access-tread`) aus (`visible = false`). Die originalen, detaillierten 3D-Holzbürgersteige und Stufen der Gebäudemodelle sind nun ungestört sichtbar; die Gehphysik bleibt über unsichtbare Support-Rampen 100% erhalten.
3. **Weiße Attika-/Dachflächen repariert**: `AuthoredSurfaceRepair.ts` und `material-substitutions.json` binden originale Dach- und Blechtrim-Texturen (`nbx_metal_rooftrim03_ab`) für untexturierte CPV- und Missing-Texture-Materialien an der Bank und weiteren Valentine-Gebäuden ein.
4. **Individuelle Böden pro Gebäude**: `BuildingFloors.ts` weist jedem Gebäude authentische, historische Bodenbeläge zu (Smithfields Saloon: viktorianischer Burgunder-Teppich mit Walnussdielen; Saints Hotel: Fischgräten-Parkett; Doctor: medizinische Schachbrettfliesen; Bank: heller Marmor/Kalkstein; Station: Schieferplatten; Sheriff: dunkle Kiefer; Gemischtwarenladen: warme Bernsteindielen).
5. **Wegüberholung & Cowboy-Kontrast**: Strohtextur durch originale RDR2-Kutschenwegspuren (`hea_track_light_je_02_abte.png`) ersetzt. Kutschenrillen in der Geometrie, unregelmäßige Randverläufe, 2.0m weiche Alpha-Überblendung ins Gras und staubig-sonnige Farbgebung garantieren hervorragenden Kontrast zum Cowboy.
6. **3D-Barkeeper & Saloon-Einrichtung**: Der Saloon verfügt nun über einen anatomisch korrekten 3D-Barkeeper in voller Western-Garderobe (Schnurrbart, Koteletten, hochgekrempelte Ärmel, Weste mit Uhrenkette, weiße Schürze, Bar-Tuch, Trinkglas). Tische sind für Minispiele klar gekennzeichnet (`🃏 POKER`, `♠️ BLACKJACK`, `🎲 MÄXCHEN`) mit Baize-Filz, Chips, Karten und Würfelteller.
7. **3D-Dartboard-Kabinett**: Flache Scheiben wurden durch ein historisches Echtholz-Kabinett mit geöffneten Flügeltüren, Schiefertafeln (301/501-Scoreboard, Kreidestriche), Sisal-Board mit Drahtspinne und Messingpfeilen ersetzt.
8. **Veranda- und Dach-Decharring**: Dunkelbraun/schwarz verkohlte Texturen wurden durch PBR-Albedo-Brightening korrigiert; die Holzfasern und sonnengebleichten Schindeln sind nun natürlich lesbar.
9. **Ground Truth Referenzkatalog**: Alle 12 Innenraum-Ordner aus `docs/TEMP/User-Intake/Investigation/24-10-26/Innen Pläne/` (Auction Yard, Bahnhof, Doctor, Gun Smith, Hof, Keanes Saloon, Kino Zelt, Saints Hotel, Sheriff Office, Smithfields Saloon, Worths General Store, Zigeuner Camp) sind inventarisiert und dienen als verbindliche Grundriss- und Detailreferenz für zukünftige Raumausbauten.

---
*Historische Notizen vom 15.10. und 09.10. sind archiviert.*
