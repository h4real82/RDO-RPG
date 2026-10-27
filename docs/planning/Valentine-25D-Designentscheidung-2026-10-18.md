# Valentine als gut spielbare 2,5D-Map

Verbindliche Benutzerentscheidung18.10.2026: **Wiedererkennbares Valentine statt1:1-Rekonstruktion.** Diese Entscheidung ersetzt strengere frühere Anforderungen an die exakte Spielgeometrie.

| Beibehalten | Vereinfachen |
| --- | --- |
| Ortsgefühl, Hauptstraßenverlauf, wichtige Gebäude und Viertel; bestätigte Spielgrenze, dekorativer Wald außerhalb | Laufwege und Eingänge dürfen verbreitert und begradigt werden. |
| Passende Fassaden, Proportionen und Westernmaterialien | Einzelne Treppenstufen können durch eine durchgehende Kollisionsrampe ersetzt werden. |
| Verständliche Räume und sichtbare Bodenflächen | Innenraumgrundrisse, Treppen und Möblierung dürfen gestalterisch angepasst werden. |
| Wände und Geländer an sinnvollen Stellen | Kleine Vorsprünge, Verzierungen, lose Props und Türzargen müssen den Spieler nicht blockieren. |
| Sicht auf Figur und eigene Laufebene | Einfache Raum-/Dachgruppen genügen; keine vollständige originale MLO-Raumstruktur nötig. |

Leere Regale, einfache Tische/Stühle/Theken und wenige prägende Details reichen. Keine Einzelobjekte für jedes Regal, kein Original-Prop-Vollständigkeitsziel. **L22 wird bewusst ignoriert** und ist kein offener Abnahme- oder Exportpunkt mehr.

## Technischer Ansatz

Sichtmodell und Spielkollision werden getrennt. Die vorhandenen Originalmodelle dürfen als Kulisse bleiben; eigens gestaltete einfache Böden, Wandsegmente und Rampen definieren die Bewegung. Eine sichtbare Tür muss mit einer freien Öffnung in der Spielkollision übereinstimmen. Die originale Rendergeometrie darf an freigegebenen Stellen nicht zusätzlich unsichtbar blockieren.

Anpassungen werden ausdrücklich als eigene Spielgeometrie gekennzeichnet, zentral und reproduzierbar konfiguriert. Rohdaten bleiben erhalten; keine eigene Geometrie als verifiziertes Rockstar-Asset ausgeben. Fehlende exakte Raum-/Portal- oder YDR-Daten blockieren eine passende eigene Lösung nicht. Achsensystem, Maßstab, registrierte äußere Grenze und bestehende Sicherheits-/Buildregeln bleiben erhalten.

## Nächste Umsetzung

1. **Bewegung zuerst (H4R-29):** am konkreten Festhäng-Gebäude eine einfache Kollisionshülle mit freiem Eingang, ebenem Innenboden und glattem Übergang zum Boardwalk aufbauen. Kleinteilige Renderkollision dort gezielt ablösen. Schräge Wandkontakte sollen Bewegung entlang der Wand erlauben.
2. **Einfacher Innenraum (H4R-47):** Boden, wenige Wandflächen und plausible Einrichtung; keine exakten Originalraumgrenzen erforderlich. Treppen/Etagen nur wo sie dem Spiel nutzen; sonst vereinfachen.
3. **Auf Kernorte übertragen (H4R-27/32):** Bahnhof, Saloon, Hotel, Stallungen und Kirche nach derselben Regel behandeln. Wiedererkennbarkeit und Kamerasicht erhalten, kleine Details nachrangig.
4. **Selbst prüfen:** jeder freigegebene Zugang hinein und hinaus ohne Pixelpositionierung; Treppenübergänge ohne Festhängen; keine durchlässigen Außenwände, sichtbare tragende Böden, klare Wege bei normalem Zoom. Fehlende Dekoration verhindert keine Abnahme.

Die früheren Quellenanalysen und174 Referenzfotos bleiben nützliche Gestaltungshilfen. Sie sind kein Katalog zur1:1-Pflichterfüllung. Keine weiteren Benutzerfotos, Spieltests oder OpenIV-Exporte erforderlich.

Stand dieses Schritts: Designvorgaben und Aufgaben angepasst. **Die neue vereinfachte Spielkollision ist noch nicht implementiert.** Die bestehenden Quellmodelle und das aktive Manifest bleiben unverändert.

