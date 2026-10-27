# Kontextkamera, Bewegung und einfache Innenräume

Status: ausführbare Designvorgabe aus dem Benutzerauftrag vom 18.10.2026; noch keine neue Laufzeitfunktion. Die bestehende Freigabe zu autonomer Planung wird verwendet, ohne weitere Bestätigungsschleifen. Linear: H4R-92, H4R-93, H4R-94, H4R-95; bestehender Innenraum-Ausbau H4R-47.

## Ziel und verbindlicher Umfang

Valentine soll draußen räumlich übersichtlich und drinnen gut lesbar sein. Die Kamera begleitet die Annäherung an einen tatsächlich zugänglichen Eingang. Innen zählt das aktive Stockwerk mit seinen Ausgängen, Treppen und Funktionen. Jedes tatsächliche Gebäude im spielbaren Valentine erhält einen einfachen, sicher begehbaren Innenraum. Ohne brauchbaren vorhandenen Boden wird ein eigener Holzboden eingesetzt. Wände, Öffnungen und Einrichtung dürfen bewusst vereinfacht werden; keine 1:1-Rekonstruktion und keine vollständige Regaldekoration.

Verbindlich vom Benutzer: außen weiter Blick; Shift zum Rennen und Kontextmenü LAUFEN/RENNEN auf aktionsfreien Boden; innen ausschließlich laufen; Annäherungszoom an Veranda/Tür/Aktion; innen nur das aktuelle Stockwerk und keine umliegenden Häuser; bedarfsgerechte Highlights von Ausgang und Treppe; gebäudespezifische Funktionen. Bar, Sitzen, Musikgerät/Musiker und andere Aktivitäten bleiben getrennte Funktionsaufträge. Ein passender Gegenstand allein behauptet keine fertige Musik- oder Multiplayerfunktion.

Bestehende Entscheidungen bleiben: dekorativer Wald nicht zugänglich, bestätigte äußere Grenze unverändert, L22 ausgenommen, Maßstab und Koordinatenbasis unverändert. Originale bleiben erhalten; selbst gestaltete Geometrie heißt `authored-gameplay`.

## Verifizierter Ausgangspunkt

Aktiver Renderer: Restart-Arbeitsstand. `ValentineRuntime.ts` verbindet bisher Welt, Gelände, Kollision, Input, Kamera und Darts. `OrthographicFollowCamera.ts` hat weiches manuelles Zoomen, Yaw und kamerabezogene Bewegung, aber keinen Innenraumzustand. `PlayerController.ts` nutzt Geschwindigkeit 6 mit kollisionsgeprüften Teilschritten. Bank und Smithfield’s besitzen einfache Erdgeschossflächen aus `AuthoredBank.ts`/`AuthoredSaloon.ts`; keine vollständige Geschosszuordnung. Die Pilot-Kollisionswände sind bislang unsichtbare Körper, keine fertige Innenwanddarstellung.

Manifest-Snapshot SHA256 `4823c2651fb5715573fa3582807734f07abf36186113731a77a99cc7def43be8`: 150 Platzierungen, davon 103 im Layer buildings, 25 Terrain, 22 Straßen/Gleise. Die 103 enthalten zahlreiche Decals, Zäune und Details. Bestandsaufnahme: 28 Hüllenkandidaten, 3 Sonderklärungen, 72 ergänzende Platzierungen; **keine bestätigte Anzahl aller Häuser oder Stockwerke**. Alle Datensätze stehen in `data/reference/valentine/interior-rollout-inventory.json` und die Kandidatenliste in `docs/planning/Valentine-Innenraum-Bestand-2026-10-18.md`.

Zusätzlich die gelieferten Gesamtansichten/P1–P8 abgleichen: Ein auf den Bildern vorhandenes Haus darf nicht fehlen, nur weil seine vollständige Hülle im aktuellen Manifest fehlt. Dafür einen eigenen Gebäude-Datensatz anlegen, fehlende Originalzuordnung markieren und einen einfachen eigenen Innenraum gestalten. Ein unbekannter Original-Dateiname ist kein Exportauftrag und kein Verbot eigener Geometrie.

## Gewählter Ansatz

Ein gemeinsames Register bestimmt Gebäude, Stockwerk, Eingänge, Treppen und Aktionen. Kontext wird aus begehbaren Flächen und registrierten Übergängen abgeleitet. Kamera, Sichtmaske, Bewegung und Highlights verwenden denselben Zustand.

Nur Entfernungszoom wäre klein, könnte aber durch die Rückwand des Saloons hineinzoomen und kein Geschoss zuverlässig wählen. Separate neue Indoor-Szenen pro Haus wären möglich, brächten aber unnötige Lade-/Koordinaten-/Rückkehrübergänge. Gewählt wird eine gemeinsame Welt mit eigenen Innenraumgruppen und gezielten Rendergruppen; dadurch bleibt der sichtbare Übergang Straße → Veranda → Raum erhalten.

## Originalnähe und getrennte Register – Präzisierung

Im Original zugängliche Innenräume sollen anhand ihrer Raumorganisation, prägenden Einbauten und Materialien erkennbar bleiben. Wenige belegte Merkmale übernehmen und den Rest vereinfachen; ein leerer Standardraum ist dort nur vorläufiger Bodenpilot. Im Original nachweislich geschlossene Häuser werden dagegen zunächst als eigene leere Holzbodenräume geöffnet. Ungeklärte Originalzugänglichkeit bleibt ausdrücklich offen, Story/RDO-Ausgabe und Evidenz werden getrennt geführt.

Editierbare Einzelordner sind jetzt unter `data/reference/valentine/buildings/` und `data/reference/minigames/` angelegt. Registries indizieren Einzeldateien; Gebäudedefinitionen referenzieren Spiel-/Varianten-IDs statt Regeln zu kopieren. Diese Daten sind noch nicht an die Laufzeit angeschlossen. Verbindliche Detailvorgabe und Ordnerverantwortung: `docs/planning/Gebaeude-Minigame-Register-2026-10-18.md`; separate Minigame-Migration: `docs/superpowers/plans/2026-10-18-minigame-registry.md`.

## Register und Zustände

`BuildingDefinition`: stabile ID, Quellplatzierungen/Anhänge, Kennzeichnung eigener Geometrie, Name, Floors, Entrances und sichtbare Außenhülle. Mehrere Quellteile dürfen dasselbe Gebäude beschreiben; keine zweite Bank aus einem Decal erzeugen.

`FloorDefinition`: stabile ID/Bezeichnung, eigene Innenraum-/Raumpolygone, Höhe und Höhenband, begehbare Supportgruppen, eigene Rendergruppen, Kollisionsgruppen, Kamerarahmen und Aktionsanker. Die Form darf einfacher als die Originalhülle sein. Keine riesige Gesamt-AABB einschließlich Veranda/Leiter als automatischer Fußboden über Nachbarstraße legen.

`EntranceDefinition`: außen liegender erreichbarer Vorbereich, gerichteter Türquerschnitt, außen/innen referenzierte Flächen, Schwellhöhe, Verbindung zur Rampe und Lage für das Ausgangssymbol. `StairDefinition`: verbundene Floor-IDs und begehbare durchgehende Rampe mit Fuß-/Kopfpunkten. `ActionAnchor`: Gebäude/Floor/Ort, erreichbare Aktionsfläche, Reichweite und Capability-ID.

`SpatialContext` unterscheidet `outdoor`, `approach`, `indoor` und `stairTransition`; eine Aktivität ergänzt `activity` mit Rückkehrkontext. Eine Veranda ist Annäherungsbereich, noch kein Innenraum. Ein Haus gilt nicht allein durch Nähe, eine Quell-AABB oder eine passende Y-Höhe als betreten. Beim Start/Recovery Innenpolygon plus gültige begehbare Höhe prüfen; während normaler Bewegung tatsächlichen registrierten Übergang verwenden.

An Grenzen bleibt der Kontext stabil: Anfangswert 0,15s Bestätigung und ungefähr 0,35m getrennte Eintritts-/Austrittszone; beide Werte sind zentral abstimmbar. Kein Pendeln beim Stillstehen auf der Schwelle. Eine unzugängliche Seite des Hauses löst keinen Annäherungszoom aus. Bei Treppenwechsel ist nur das aktive Geschoss samt benutztem Treppenverbinder sichtbar; das Zielgeschoss übernimmt erst am definierten Übergang. Die Stützdaten des nächsten Geschosses dürfen bereits geladen sein.

## Kameraablauf

| Situation | Fokus und Darstellung |
| --- | --- |
| Straße, auch direkt gegenüber dem Saloon | Weiter Überblick um die Figur, Startwert sichtbare Höhe 42 Welt-Einheiten |
| Erreichbarer Veranda-/Türvorbereich | Mit abnehmender begehbarer Entfernung sanft zur Tür/Raummitte und näher zoomen |
| Unzugängliche Wand oder nur Maus über einer Aktion | Überblick behalten; kein Zoom durch Wände oder beim Hover |
| Innenraum | Gesamtes aktives Stockwerk mit etwa 8% Sicherheitsrand einpassen; Raumzentrum statt ständiges Hinterherziehen |
| Treppe | Weiche Übergabe zwischen Floor-Rahmen; Figur und benutzter Verbinder bleiben sichtbar |
| Benutzbare Aktion | Lokaler, begrenzter Fokus, nur wenn verfügbar und erreichbar; Aktivität darf ihren eigenen Dialog besitzen |
| Ausgang zur Straße | Stockwerk lösen und Überblick wiederherstellen, ohne Teleport oder harten Kamerasprung |

Einstellbare Startwerte: Annäherung ab etwa 7m bis 1m zur Tür; Blend über smoothstep aus erreichbarer Vorzone, nicht Luftlinie durch Wände. Beginn/Fokus-Zoom entspricht der aktuell gewählten Nutzeransicht und läuft zur näheren Zielansicht. Startwert 0,6–0,9s für Übergänge; keine zusätzliche Roll-/Pitchanimation. Reduced Motion: Kontext bleibt identisch, aber ohne Kameraflug, langes Nachschwingen oder pulsierende Highlights.

Der Innenrahmen wird aus den projizierten Floor-Eckpunkten für aktuelle Yaw und Seitenverhältnis berechnet. Verfügbare Breite/Höhe berücksichtigt HUD und sicheren Bildschirmrand. Kein fester Zoomfaktor, der bei Hochformat Türen abschneidet. Große Geschosse werden vollständig eingepasst; Nahaufnahme einer Aktion ist ein zusätzlicher lokaler Zustand. Vollständige Geschossübersicht hat Vorrang vor einer unrealistisch großen Vergrößerung sehr großer Scheunen.

Q/E/Rechtsziehen bleiben nutzbar; Innenrahmen nach Drehung neu einpassen. Mausrad erzeugt einen begrenzten manuellen Offset pro Kontext und kämpft nicht in jedem Frame gegen den Autozoom. Beim Kontextwechsel Offset übernehmen oder sanft begrenzen; 0 setzt lokale Zoom-/Yaw-Korrektur zurück, schaltet die Innenansicht aber nicht aus. DEV-Referenzkamera bleibt ausdrücklich von Auto-Framing ausgenommen.

## Nur aktives Geschoss rendern

Innen werden Gelände/umliegende Gebäude, Außenhülle und nicht aktive Floors ausgeblendet. Sichtbar bleiben der eigene Boden, einfache Innenwände als aufgeschnittene Darstellung, Einrichtung, Figur, erreichbare Interaktionsorte und der benutzte Treppenverbinder. Sicht durch Ausgänge wird zunächst gestalterisch einfach als Außenlicht/Schwellenfläche dargestellt; kein zweiter Welt-Renderpass nötig.

Quellmeshes, die Dach und mehrere Floors in einem Drawcall enthalten, nicht anhand der gesamten Mesh-AABB einem Stockwerk zuweisen. Für das minimale Innenbild darf die vollständige Quellhülle verborgen und durch eigene getrennte Boden-/Wand-/Propgruppen ersetzt werden. Optional vorhandene originale Innenraumteile nur übernehmen, wenn sie sinnvoll trennbar sind. Dadurch wird eine aufwendige Neu-Segmentierung aller Rockstar-Modelle vermieden.

Render-Maske und physische Welt bleiben getrennt. Versteckte Nachbarhäuser verlieren keine Kollision. Auswahl-Rays dürfen keine ausgeblendeten/anderen Geschosse treffen; Ground-/Kollisionsprüfungen verwenden ihre expliziten Supportgruppen. Außenansicht beim Verlassen, Laden/Entladen, Recovery und Sessionende vollständig restaurieren. Verdeckung auf opacity0.15/depthWrite=false bleibt für tatsächlich sichtbare blockierende Teile zuständig; ursprüngliche Materialwerte korrekt erhalten. Figur und Boden bleiben lesbar.

## Gehen und Rennen

Gehen bleibt die Standardbewegung, Rennen ist ausschließlich draußen erlaubt. Zunächst bestehende Gehgeschwindigkeit 6 beibehalten, Sprintfaktor 1,5 (9) als zentral abstimmbarer Startwert; keine Ausdauer oder zusätzlichen Animationspakete. Shift wirkt auf manuelle Bewegung nur während des Haltens. Rechtsklick auf erreichbaren Boden ohne primäre Objektaktion bietet **LAUFEN** und **RENNEN**; die Wahl gilt für dieses Ziel. Linksklick bleibt normales Gehen.

In der engen Türvorzone, innen, auf Treppen und bei Aktionen wird Rennen gesperrt. Bei einem Laufziel ins Haus draußen rennen und vor der Tür automatisch auf Gehen wechseln; Modus für diesen Weg abwerten, sodass draußen nicht plötzlich wieder Sprint anspringt. Eine über die Schwelle gehaltene Shift-Taste erfordert danach Loslassen und erneutes Drücken. Bei Aktivität/Sitzen keine Fortbewegung bis zum tatsächlichen Verlassen.

Geschwindigkeitswechsel pro Bewegungsteilschritt begrenzen: Ein langsamer Frame darf keinen Sprint-Schritt tief ins Haus oder durch eine Wand tragen. Bestehende vollständige Wegprüfung, maxStep/maxDrop und Ortsgrenze gelten weiter. Finale Klickschritte erhalten ihre analoge Länge, um Überschwingen zu vermeiden. Keine neue automatische Hindernisumgehung in diesem Auftrag. Multiplayer: dieselben erlaubten Modi/Geschwindigkeiten später am autoritativen Server prüfen; keine Sicherheitsbehauptung aus einem lokalen Clientmodus ableiten.

## Orientierung und Aktionen

Highlights sind orts- und geschossgebunden und erscheinen nur bei erreichbarer Nähe. Startwerte: auf ungefähr 2,5m einblenden, oberhalb 3,5m ausblenden, ohne dauerhaftes Pulsieren. Ausgang: kurze Schwellen-/Kantenbetonung mit „Draußen“. Treppe: Richtung plus Zielgeschoss. Priorität Ausgang/Treppe vor Spielzeug; Text/Symbol neben Farbe. Keine Marker durch Wände oder in fremden Floors; nur unmittelbar erreichbare Übergänge zeigen. Kontextmenü/F/Maus verwenden dieselbe Aktionsdefinition.

Saloon als erster verständlicher Funktionsraum: eigene einfache Theke, Tisch-/Sitzanker und Dartscheibe an einer Wand. Musik erhält einen Boombox- oder Musiker-Anker; aktive Mediensteuerung folgt H4R-68–71, kein automatischer Streamstart. Andere Gebäude unterscheiden sich über wenige passende Formen/Funktionsanker statt viele Kleinteile. Es ist zulässig, einen noch funktionslosen Raum mit sauberem Boden und wenigen Formen auszuliefern.

## Vollständigkeit und Aufwand

Für jedes tatsächliche Gebäude: zugeordneter Datensatz, mindestens ein Raum/Boden, eindeutig begehbarer Eingang und Ausgang, eigenes aktives Stockwerk, sichere Bewegung und Rückkehr. Mehrgeschossige Häuser erhalten einfache verbundene Geschosse; leere obere Floors sind zulässig, unverbundene unsichtbare Zielgeschosse nicht. Ein Obergeschoss ist erst spielbar, wenn Boden, Zugang und Sicht gemeinsam geprüft sind.

Vorhandener brauchbarer Boden darf bleiben; wo Ausstattung fehlt, eigener Holzboden als Mindeststandard. Keine neue Material-/Möbel-Exportsuche zur Voraussetzung machen. Kleintierbau, Ruine, Gefängnis-Komponenten und fehlende Hüllenzuordnungen bleiben explizite Klassifikationsaufträge; sie verschwinden nicht aus der Liste. Die endgültige Gebäudeliste mit den Mapreferenzen abgleichen, anstatt die 28 Hüllenkandidaten als vollständige Stadt auszugeben.

Aufwand wird durch wiederverwendbare Raum-, Wand-, Tür- und Rampenbausteine begrenzt. Ein grundlegender Innenraum-Preset plus kleiner Satz Bank/Saloon/Hotel/Laden/Stall/Kirche genügt. Jeder Floor speichert nur Layout und Funktionsanker. Eine exakt möblierte Originalkopie, dynamische Spiegel, vollständige NPC-Musik und komplexe Portalrenderer sind nicht Bestandteil dieser Grundlage.

## Abnahme und Rollout

1. Register/Bestand: alle 103 vorhandenen Einträge klassifiziert und referenzierte zusätzliche Häuser erfasst; keine unbemerkte Lücke. Ein Coverage-Bericht unterscheidet geplant, gebaut und geprüft pro Gebäude/Floor.
2. Bank und Saloon als komplette Vertikalschnitte: Straße → Veranda → Innenraum → Treppe/weiteres Geschoss soweit vorhanden → zurück; danach Hotel und übrige öffentliche Häuser.
3. Rennen: Shift, Kontextziel, Türvorzone, gehaltene Taste, niedrige Bildrate, Richtungs-/Kameradrehung, Wall/Boundary/MissingGround, Modal/Blur/Recovery.
4. Sicht: aktive Floor-Maske, ursprüngliche Außenansicht restauriert, Quellmesh über mehrere Floors, Nachbarhaus bleibt physisch da, unsichtbare Floors nicht anklickbar.
5. Kamera: Nähe zur Hausrückseite ohne Fokuswechsel; Stehen an der Tür ohne Pendeln; Desktop/Hochformat, manuelles Zoomen, Q/E, Reduced Motion, mehrere schnell folgende Türwechsel.
6. Alle restlichen Gebäude chargenweise mit Mindestboden/Geschossen verbinden. Allgemeines Ticket H4R-47 bleibt offen bis vollständiger Gebäude-/Floor-Coverage und Ein-/Austrittsprüfung; Build allein genügt nicht.

Keine weitere Zuarbeit nötig. Falls eine konkrete Originalquelle später wirklich fehlt: getrennte präzise Dateianforderung nach AGENTS.md, ohne bereits gelieferte Exporte erneut zu verlangen.
