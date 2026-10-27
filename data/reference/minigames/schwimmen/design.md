# Schnautz31 · Keane’s Saloontisch

Stand24.10.2026: Lokaler Spielschnitt implementiert und geprüft (H4R-102).
Vorheriger Gemini-Dialog mit feststehender Dreierhand und Status-Schaltflächen
ist durch ein vollständiges lokales Übungsmatch ersetzt. Netzwerk/Einsätze bleiben
getrennt; Prüfbericht: docs/planning/Schnautz-Abnahme-2026-10-24.md.

## Konkreter Spielschnitt

Lokale Übungsrunde mit Mensch und zwei KI-Gästen am vorhandenen Tisch in
`second-saloon/ground`. Kein Wallet, kein Netzwerkbeitritt, keine vorgetäuschten
menschlichen Mitspieler. Ein vollständiges Match besitzt drei Marken pro Gast.
Eine Auswahlregelkarte ist vor Beginn und jederzeit während des Spiels erreichbar.

Die vorhandene Gemini-Punktewertung wird als ausdrückliche Hausvariante erhalten:
32Karten(7–Ass), Ass11, Bild/10je10, Zahlen nach Nennwert. Beste Summe einer Farbe;
Drilling30½, dreiAsse33. Keine Übernahme ungeprüfter Regeln aus Webseiten.

Pro Zug genau eine Aktion: eine eigene Karte gegen eine offene Tischkarte
tauschen; alle drei tauschen; schieben; klopfen. Keine verdeckten Bot-Karten
auslesen. Nach Klopfen erhalten alle übrigen aktiven Gäste genau einen letzten
Zug.31oder33beendet eine Runde sofort. Haben alle aktiven Gäste nacheinander
geschoben, wird die Tischmitte aus dem restlichen Stapel erneuert; verbrauchte
Tischkarten kommen in den Ablagestapel und können später neu gemischt werden.

Bei Wertung verliert jede niedrigste Hand eine Marke, also auch mehrere bei
Gleichstand. Mit null Marken ausgeschieden. Ein verbliebener Gast gewinnt das
Match. Scheidet der Mensch vorher aus, endet seine lokale Partie mit dieser
klaren Meldung; kein fiktiver Sieger für eine noch nicht ausgespielte KI-Partie.
Neustart ist jederzeit möglich. Keine Coins werden gebucht.

## Gestaltung und Bedienung

Holzrahmen und grüne Tischauflage im vorhandenen Western-Materialcharakter,
echte Spielkartenflächen mit Rang/Symbol/Farbe und klarer Auswahl. Eigene Hand
unten, drei offene Tauschkarten in der Mitte, beide Gäste oben mit verdeckten
Händen und sichtbaren Marken. Keine Liste generischer Aktionsschaltflächen als
Ersatz für die Karteninteraktion. Vorherige Aktion und Schlussrunde dezent lesbar.

Klick/Tap wählt eine eigene und eine Tischkarte; erst die bestätigte Tauschtaste
führt den Zug aus. Während KI-Zügen keine Eingaben doppelt verbuchen. Klopfen,
Schieben, Gesamttausch, Neustart und Schließen besitzen klare Zustände. Tastatur-
Fokus, Escape/Rückkehr und Reduced Motion erhalten. Timer/Listener beim Schließen
freigeben; verzögerte KI-Aktionen dürfen kein geschlossenes Spiel wiederbeleben.

## Architektur und Abnahme

Punktewertung bleibt `SchwimmenRules.ts`; zusätzlicher reiner Zustandkern für
Deck, Tisch, Hände, Zugfolge, Klopfen und Marken. Variantendatei ist einzige
Quelle der Regeln/Parameter. Tisch-/Aktionskoordinaten stehen ausschließlich im
Gebäudeordner, Start über bestehende Registry/MinigameHost.

Prüfen:32einzigartige Karten ohne Verlust/Duplikation; illegale/fremde/doppelte
Aktionen zurückweisen; einfacher und Gesamttausch; drei Schieber; letzte Züge
nach Klopfen;31/33/Drilling; Gleichstand/Marken/Ausscheiden; begrenzte vollständige
Bot-Partien; Schließen während KI-Zug. Browser vom begehbaren Tisch bis Runde,
Wertung/Neustart und Rückkehr, außerdem kleiner Bildschirm. Pflichtbuild.
