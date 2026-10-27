# Livery, Camp, Nordbereich und Rennen ·24.10.2026

Aktiver Checkout: `C:/Users/h4rea/.codex/worktrees/rdo-restart-foundation/RDO-RPG`.
Main bleibt separat. Linear: H4R-27, H4R-28, H4R-47, H4R-78, jeweils In Progress.

## Auftrag und Gestaltungsgrenze

Der Benutzer meldet fehlenden Wald/Objekte oberhalb von Kirche und Stall,
fehlendes Camp gegenüber Kino sowie unbrauchbare Livery-Architektur ohne
Händler-Innenraum. Zusätzlich sollen vorhandene Gemini-Minispiele verwaltet,
auf der Karte erreichbar und qualitativ ausgebaut werden. Er hat weitere
mehrstündige selbstständige Arbeit autorisiert. Kein Stilwechsel.

Eigene Spielgeometrie ist ausdrücklich erlaubt und wird als authored-gameplay
geführt. Quellenmodelle und TRS-Belege bleiben erhalten. Der dekorative Wald
bleibt außerhalb der bestätigten Spielgrenze; Original-YBNs sind weiterhin
nicht unabhängig dekodiert. Keine neue vollständige RAGE-/Map-Abnahme.

## Livery und Camp

- Livery erhält erstmals eine registrierte Erdgeschossdefinition mit sicherer
  Rampe, gemeinsamem Kollisions-/Kamerabesitzer, sechs Boxenteilern, Trögen,
  Futter-/Sattelablage und Händler. Der angepasste Boden liegt auf115.6m;
  die irreführenden oberen Quell-Floor-Kandidaten um118m wurden nicht als
  Spieleingang übernommen. Rampenfuß:115.2563m an(-356.6304,-790.2720).
- Neue einfache texturierte Außenhülle:258Dreiecke, Giebeldach mit0.25m
  Überstand. Original `val_03_stable_ext.glb` unverändert erhalten und im
  Renderer ausdrücklich ersetzt. Neue Hülle hat keine zweite Spielkollision.
- Ergänzender Außenzaun:2232Dreiecke, terraingegründete Pfosten/Riegel,
  freie Ostzufahrt. Separate unsichtbare Hülle mit432Dreiecken hält den Spieler
  zwischen Pfosten auf; die sichtbaren Riegel sind keine zweite Kollision.
  Quelle hierfür ist eigene Gestaltung, kein Originalzaunzug.
- Camp gegenüber gemessenem Kino: drei begehbare A-Zelte, zwei Planwagen mit
  Speichenrädern, Kisten, Tisch/Hocker und Wäscheleine;4075Sichtdreiecke.
  Zentrum(-300,-705) liegt auf der anderen Straßenseite. Relationale Lage vom
  Benutzer bestätigt, eigene Abstände/Größen; keine Vermessungsbehauptung.
- Separate unsichtbare Camp-Kollisionshüllen:192Dreiecke; Zelte vorn offen,
  Wagen/Kisten/Tisch blockieren. `render:physics-only` erhält Kollision bei
  verborgener Darstellung. Sichtbare Kleinteile erzeugen keine doppelte Hülle.
- Camp-Materialien werden pro Objekt getrennt, damit ein Tisch zwischen Kamera
  und Spieler nicht alle Wagenräder/Holzteile durchsichtig macht.

Reproduzieren: `node scripts/prepare-livery-camp.mjs`.
Konfiguration: `data/reference/valentine/north-environment.json` sowie eigener
Gebäudeordner `buildings/val-03-stable-ext/`. Texture-SHA-Belege stehen lokal in
`verified-scene/north-environment-report.json`; Originaldateien unverändert.

## Vegetation und Randboden

- 209eigene Bäume:189dekorative Waldbäume,20Orts-/Schattenbäume. Bisherige
  32m-Höhenbeschränkung hatte fast alle äußeren Waldkandidaten ausgelassen.
- Für explizite äußere Waldgruppen ist nun dekorative Höheninterpolation bis
  160m erlaubt; Ortsobjekte behalten den Native-/32m-Guard. Diese Höhen sind
  keine native Terrain- oder spielbare Kollisionsbehauptung.
- Ergänzender Hintergrundboden ist aus Sicht-/Kollisionssystem getrennt:
  `role:dressing`, `collision:none`, `occlusion:none`. Er wird gegen native
  Renderabdeckung und die bestätigte Spielgrenze beschnitten. Dasselbe adaptive
  Rand-Clipping wie beim geprüften Landscape-Generator schließt grobe Rasterlöcher.
- Vegetation wird in32m-Materialzellen exportiert. Verdeckung eines Baumes
  blendet damit keine vollständige Waldfläche aus; Zellen können separat aus
  dem Kameraausschnitt fallen. Blätter sind weiterhin eigene texturierte Karten,
  keine zurückgewonnenen Original-Baummodelle.
- Dressing einschließlich Hintergrund zuletzt439853Dreiecke. Übrige
  Dekozahlen bleiben11Fässer,16Laternen und14Masten. Nicht mit wiedergefundenen
  Originalplacements verwechseln.

Reproduzieren: `node scripts/prepare-authored-dressing.mjs --source-root D:/Projects/RDO-RPG`.
Ein Standard-GLTF-Material mit Daten-Alpha wird jetzt nicht mehr versehentlich
als Alpha-Cutout behandelt. Regressionstest erst rot, nach Korrektur grün.
Native Source-MASK/BLEND/OPAQUE-Metadaten behalten ihre getrennte Behandlung.

## Minigame-Verwaltung und Pferderennen

Geminis vorheriger horse-race-Eintrag war ein Dialog mit Galopp-/Checkpoint-
Schaltflächen. „Mario Kart Valentine Edition“ war dabei nur eine Beschriftung,
kein zweites implementiertes Spiel. Dieser lokale Prototyp ist ersetzt durch:

- **Staub & Sekunden:** eine Runde Solo-Zeitfahren, persönliche lokale Bestzeit.
- **Hufeisen-Rallye · Valentine Kart:** drei Runden, drei KI-Rivalen,
  Kurvenritt-Schub, Hufeisen-/Tonikum-/Ölspur-Pickups und Positionsanzeige.
- Gemeinsam: steuerbare animierte Pferde, eigener Sitzpose-Adapter für Cowboy,
  Countdown, Ausdauer/Galopp, Bremsen, geordnete Holzportale, Seitenstreifen-
  Verlangsamung, Rücksetzen mit5s Strafe, Pause/Fokusverlust, Neustart und
  Rückkehr in den Stall. Audio optional lokal synthetisiert, keine Remote-Medien.
- Quelle der535.24m langen Runde sind Straßen0059,0060(6–13),0062(0–24).
  Spline, Rennbreite und joins sind authored-gameplay. Eine doppelt enthaltene
  Teilstrecke wurde durch den vollständigen Streckentest erkannt und korrigiert.
- Rennsimulation liegt getrennt von Three.js und DOM. Tastatur/Pointer werden
  beim Schließen entfernt; späte Modelllieferungen verworfen/freigegeben.
- Neun Kulissenvarianten:108.19MB Quellen →36.87MB Runtime, höchster Drawable-
  LOD, exaktes Vertex-Welding/Dedup und Texturen maximal512px/WebP88.
  Dreieckszahlen bleiben erhalten. Originale UVs/Quellen bleiben unangetastet;
  Belege in `horse-race/scenery-provenance.json`.
- Pferd von Ayan und Cowboy von human being bleiben CC BY4.0 mit Quellen im
  bestehenden Projektstand-/Modellnachweis. Keine Herkunft aus RDR2 behauptet.

Es ist eine lokale 3D-Übungsinstanz, kein serverautoritatives berittenes
Open-World-Rennen. Keine Einsätze, Wallet-Buchungen oder Online-Rangliste.
`horse-arena` bleibt geplant und wird nicht als spielbar angeschlossen.

## Abgeschlossene Prüfungen dieses Batches

- Sechs echte Mauswege Terrain→Tür→Innenkamera→Ausgang bis zum tatsächlichen
  Terrain: Kirche, Livery, Smithfield, Hotel und beide nördlichen Wohnhäuser.
  `scripts/e2e-map-survey.mjs exit-route-final church,val-03-stable-ext,smithfields-saloon,hotel,val-05-res-d,val-05-res-e`.
- `ExitRoute` verwendet registrierte Veranda-/Treppenpunkte und validiert jedes
  Segment. `WaypointMovement` löscht alte Wegpunkte bei direkter Eingabe,
  Capture und Recovery. Tür-Picking und Kontextkamera verwenden gemeinsam
  `exteriorAccessHeight`; die Hotelveranda ist keine lange schräge Rampe mehr.
- Durchgehender Mausweg von Hauptstraße durch Kirche und bis(-285,-900):
  zehn Schritte bestanden, nur eine anfängliche DEV-Versetzung. Der letzte
  abgelehnte Klick war eine echte numerische Naht im Terrain-Ray statt fehlender
  Weltgeometrie. An(-283.8,-896) fehlen exakt mittige Treffer, ±0.01m beidseitig
  treffen Höhen120.85466/120.84922. `TerrainGround` überbrückt ausschließlich
  solche beidseitig bestätigten Nähte bis0.05m Höhendifferenz. Größere Lücken,
  Klippen und einseitige Kanten bleiben gesperrt; gezielte Regressionen grün.
- Camp-/Zaun-Kollision: Wagen, Zeltseiten, Tisch und Stallzaun blockieren;
  Zeltvorderseite und Campgasse sind begehbar (sechs Proben grün).
- Native steile Westkante bleibt gesperrt. Quell-TRS168/168ohne Abweichung,
  176eindeutige Placements einschließlich eigener Ergänzungen. Native25Terrain-
  GLBs unverändert. Ein Quell-Zauntor und ein Sheriff-Hauptgebäude, keine Dublette.
- Beide Rennvarianten über das gemeinsame Händlermenü: Tastaturbeschleunigung,
  Pause und Rückkehr in richtigen Innenraum ohne Browserexception. Hauptwelt
  pausiert ihr Rendering während des Spiels und setzt danach fort.
- Vollständiges Solo-Zeitfahren mit gehaltenen W/A/D/S/Space:30Passagen,
  49.90s,0Strafe, Ergebnis und Rückkehr. Frischer nach Kurvensteuerungs-Anpassung
  als der frühere38.17s-Lauf. Rennzustände werden nur gelesen, nicht verändert.
- Neuer Arcade-Dreirundenlauf mit echten gehaltenen Tasten:90Passagen,
  165.17s Fahrzeit plus15sStrafe =3:00.17 Ergebnis, Rückkehr bestanden.
  Drei Rücksetzungen (einmal Strecke verlassen, zweimal Passage verpasst) wurden
  mit Meldungen erfasst; danach blieb der Lauf abschließbar. Kein Nullstrafenlauf
  behauptet. Der erste neue Versuch erfüllte die frühere strenge Nullstrafen-
  Bedingung nicht; Bericht unter valentine-kart-zero-penalty-attempt-report.json
  erhalten. Test trennt jetzt korrekt Abschluss und cleanRun; Solo verlangt
  weiter null Strafe. Arcade-Kurven-/Rivalenabstimmung bleibt Qualitätsarbeit.
- Frisches Rennbild deckte fehlende Rivalenpferde auf: Farbvariation hatte
  Einzelmateriale in Arrays verwandelt, obwohl die GLTF-Primitiven keine
  Materialgruppen besitzen. RivalAppearance erhält nun Einzel-/Mehrfachslots
  und verändert keine geteilten Originalmateriale. Zwei Regressionen grün.
  Vier montierte Pferde tatsächlich im frischen Bild sichtbar; isolierter
  originaler RaceView-Adapter:4Akteure/40Skinned-Primitiven,0ungültige Material-
  Arrays,78DrawCalls, keine Exceptions. Dieser Probeaufbau ist kein Maplauf.
  Dreirunden-Physikprüfung erfolgte vor dieser reinen Materialkorrektur;
  Händler-/Start-/Pause-/Rückkehrlauf anschließend separat erneut geprüft.
- Verpasstes Tor setzt mit5sStrafe zur letzten bestätigten Passage zurück;
  kein endloses Weiterfahren ohne erreichbare Wertung. Reiner vollständiger
  Streckentest für beide Varianten, Reihenfolge, Countdown, Pause/Reset grün.
- Mobil390×844, echte gehaltene Touch-Schaltfläche, ReducedMotion, Pause,
  kleiner Minimap-Canvas, Schließen und lebender Haupt-WebGL-Kontext grün.
- Holzmaterial-Fallback für ältere Raumdateien korrigiert; authored opaque
  GLTF-Materialien werden nicht anhand unbrauchbarer Daten-Alpha ausgeschnitten.
- Breite Clienttests zuletzt365/365, Generator-/Terraintests14/14 und
  `npx pnpm -r build` grün (enthält zusätzlichen Schnautz-Folgebatch).

Evidenz: `data/runtime/valentine/livery-race-2026-10-24/` und
`test-artifacts/headless-map-2026-10-23/survey-exit-route-final/`.
Sichtbilder Livery/Camp/Wald wurden tatsächlich betrachtet. Die neue Livery
ist eine bewusst einfache eigene texturierte Hülle. Am äußeren Hintergrund
bleiben kleine blaue Randsäume sichtbar; einzelne native CPV-/Materialflächen
brauchen weitere Prüfung. Fotowiedererkennbarkeit, weitere fehlende Ortsobjekte,
Original-YBN-Abgleich und vollständige Map-Abnahme bleiben offen. H4R-27/28/47/78
werden deswegen nicht auf Done gesetzt.
