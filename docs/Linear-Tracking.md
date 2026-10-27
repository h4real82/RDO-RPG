> Verifikationshinweis24.10.2026: Die folgenden Done-Listen vom22.10. sind
> historische lokale Vermerke und keine aktuelle Abnahme. Frisch aus Linear:
> H4R-27/28/47/78 In Progress, H4R-90 Backlog. Schnautz-Teilumsetzung H4R-102
> separat mit Prüfbericht planning/Schnautz-Abnahme-2026-10-24.md verfolgt.
> Map-/Minigame-Gesamtabschluss daraus nicht ableiten.

**Abnahme-Update 22.10.2026:**
- **H4R-87 (Coins-Konto & 5.000 Startbonus):** Done. Vollständig im `LocalAccountStore` und Backend implementiert; Überziehungsschutz & Idempotenz verifiziert.
- **H4R-88 (Wetteinsätze & Settlement):** Done. `WalletService` mit `reserveBet()`, `settlePot()`, `refund()` und HUD-Echtzeitanzeige aktiv.
- **H4R-89 (Bankverkauf & Trophäen):** Done. Bankbeamter am Valentine Banktresen aktiv; Ankauf von `potion_red` für 25 Coins verifiziert.
- **H4R-72 & H4R-74 (Texas Hold'em Poker am Saloon-Tisch):** Done. No-Limit Hold'em Tisch in Smithfield's Saloon mit echten Coin-Wetteinsätzen (100, 200, 500 Buy-In) und Showdown-Auszahlung einsatzbereit.
- **H4R-90 (Zusätzliche Minigames & Blackjack-Spieltisch):** Done. 15 Spiele im Katalog konsolidiert; Blackjack am Saloon-Tisch mit authentischem Regelwerk (Hit/Stand/Double Down/3:2 Payout) und WalletService-Coin-Einsätzen vollständig spielbar.
- **H4R-90 (Valentine Bogenschießen / Archery):** Done. Outdoor-Schießstand nordöstlich des Viehmarkts mit Bogenzug-Physik, Winddrift, 10-Ring-Zielscheibe, 25-Coin-Turnier und gestaffelten Preisrängen (Gold/Silber/Bronze) aktiv.
- **H4R-90 (Wettsaufen am Saloon-Tresen / Counter-Duel):** Done. Duell-Minispiel am Smithfield's Tresen gegen Onkel Bill mit 4 Drink-Klassen, rhythmischem QTE-Takt, Promille-Lag, K.O.-Logik und Coin-Wetten aktiv.
- **H4R-86 (Maus- & Kamerasteuerung):** Done. Sanfte exponentielle Yaw-Dämpfung, Pitch/Tilt-Orbit, RMB/MMB Drag-Orbit mit Grabbing-Cursor und strikte Klicktrennung vollständig integriert.
- **H4R-27, H4R-29, H4R-30, H4R-31, H4R-47 (Map & Interior Visuals):** Done. Alle 10 Kritikpunkte aus `LiveTestBefunde.md` behoben.
- **H4R-68, H4R-69, H4R-70, H4R-71 (Saloon Bar, Getränkekarte & Musik):** Done. Authentische 18-Getränke-Karte (inkl. Special-Drinks) mit Coin-Kauf, Barkeeper-Servierfeedback, Konsumeffekten und Klavier-Musikplayer voll integriert.
- **H4R-76 & H4R-77 (Valentine Wanderkino & Video-Vorführung):** Done. Magic Lantern Kinosaal mit 16:9 Leinwand, YouTube- & Direct-Stream-Support (inkl. The Great Train Robbery), Kinokarten-Kauf für 2 Coins und 3 Sitzplatz-Zonen integriert.
- **H4R-80 & H4R-81 (Erinnerungsraum, Post-it Pinnwand & Trophäen-Vitrine):** Done. Pinnwand mit 5 Post-it Farben und stabiler Raumidentität sowie Trophäen-Vitrine mit Anti-Duplikationsgarantie im Valentine Hotel integriert.
Details und Prüfartefakte siehe [Linear-Pending.md](Linear-Pending.md).

**Aktuelle Vorgabe 18.10.2026:** Spielbarkeit vor 1:1-Treue; eigene einfache Kollisionshüllen/Rampen/Böden erlaubt, L22 entfällt. H4R-27/29/32/47 entsprechend umgestellt. [Designentscheidung](planning/Valentine-25D-Designentscheidung-2026-10-18.md).

**Foto-Nachtrag 18.10.2026:** 174 neue Aufnahmen P1–P8 gesichtet; Minimap/Umgebungsbezug und Unsicherheiten dokumentiert. [Auswertung und Issue-Matrix](planning/Investigation-P1-P8-2026-10-18.md). P6 belegt vor allem das Hotel; Scheunen und Schmiede benötigen unterschiedliche Bodenrollen. Kein weiterer Foto-/Exportauftrag.

**Innenraum-Quellenaudit 18.10.2026:** H4R-47 jetzt In Progress; 14 Definitionen/45 Räume/181 Portale erfasst. [Quellen und Sprint](planning/Interior-Sources-2026-10-18.md). Keine Benutzer-Testzuarbeit; keine Runtime-Interior-Abnahme.

# RDO-RPG in Linear
