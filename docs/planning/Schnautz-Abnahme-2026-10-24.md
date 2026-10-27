# Schnautz31 in Keane’s · lokale Abnahme24.10.2026

Issue: [H4R-102](https://linear.app/h4real82/issue/H4R-102/schnautz31-als-vollstandiges-lokales-kartenspiel-in-keanes-saloon).
Aktiver Restart-Worktree, keine Veröffentlichung und keine Main-Übernahme.

## Ergebnis und Umfang

Schwimmen/Schnautz ist das Kartenspiel31. Geminis statischer Karten-/Statusdialog
ist ersetzt durch ein vollständiges lokales Match gegen zwei klar benannte
KI-Gäste.32einzigartige Karten, drei offene Tauschkarten, Einzel-/Gesamttausch,
Schieben, Klopfen, letzte Züge, Markenverlust, Ausscheiden und Neustart.
Eigene Hausvariante: Farbsumme; Drilling30½, dreiAsse33. Regeln/Parameter stammen
ausschließlich aus variants/schnautz-31.json; keine Regelinhalte in Gebäudedaten.

Start am vorhandenen Kartentisch in second-saloon/ground über zentrale
Gebäudeaktion und MinigameHost. Aktionspunkt einmal aus dem lokalen Layout
transformiert. Doc Morgan und Rose Callahan benutzen nur ihre eigene Hand und
die offene Mitte, mit unterschiedlicher Klopfschwelle. Keine fremden verdeckten
Hände, keine simulierten Online-Gäste, kein Wallet und keine Coin-Buchungen.

Die Oberfläche zeigt Filztisch/Holzrahmen, wählbare rot/schwarze Karten, verdeckte
Gäste, Marken und Zugfolge. Ergebnis zeigt die drei wirklichen Hände und deren
Wertung. Mobile Darstellung kompakter mit sichtbaren Aktionen; mindestens44px
Bedienhöhe. Rückkehr über Schankraum-Taste oder Escape. Optionale lokale Karten- /
Klopfgeräusche, abschaltbar. Timer, Listener und Audio beim Schließen freigegeben.
Tab-Fokus, Tastatur-Kartenwahl und ReducedMotion bleiben unterstützt.

## Frische Evidenz

- Reiner Zustandskern: neun Tests einschließlich echter31-Tauschwertung,
  Gleichstand/mehrfacher Markenverlust, Ausscheiden ohne erfundenen KI-Sieger,
  illegale/fremde/veraltete Aktionen, Tausch, Klopfreihenfolge und neue Mitte.
- 40deterministische vollständige Matches ohne Deadlock, negative Marken,
  Kartenverlust oder Duplikat, jeweils unter1000Aktionen.32Karten konserviert.
- Insgesamt363Clienttests in75Dateien grün;14Generator-/Terraintests grün.
  `npx pnpm -r build` grün; vorhandene große Bundlewarnung bleibt sichtbar.
- Desktop1280×950: einmalige DEV-Versetzung auf Terrain vor Keane’s, danach
  echte Mauswege Rampe→Tür→Tisch. Karten über Space/Enter ausgewählt und
  tatsächlich getauscht, verdeckte KI-Hände, Pause mit stabiler Revision,
  vollständige Schlussrunde/Markenwertung, neue Runde und Escape während
  ausstehendem KI-Zug. Nach1.7s keine Wiederbelebung, richtiger Raum erhalten.
- Mobil390×844/ReducedMotion: gleicher begehbarer Zugang, echte Tap-Kartenwahl,
  Tausch/Runde/Wertung und Schankraum-Tap während ausstehendem KI-Zug. Kein
  horizontaler Überlauf und keine Browserexceptions. Desktop-/Mobilbilder von
  Spielfeld und Wertung tatsächlich betrachtet, nicht nur gespeichert.

Reproduzieren: `node scripts/e2e-schnautz.mjs` und
`node scripts/e2e-schnautz.mjs --mobile`. Ergebnisse/Bilder unter
`data/runtime/valentine/schnautz-2026-10-24/` (desktop/mobile-report.json,
*-lobby.png, *-playing.png, *-result.png). Nur Startposition der Welt wird im
Browser per DEV versetzt; Karten-/Matchzustand nie per Browserhook manipuliert.

## Abnahmegrenze

Der lokale Schnitt von H4R-102 ist erfüllt. Ein komplettes Match ist durch
Zustandstests belegt, browserseitig eine wirkliche Runde samt Folgerunde und
Cleanup; kein menschliches vollständiges Durchspielen oder Multiplayer-Test
behauptet. H4R-90 bleibt Erweiterungskatalog im Backlog; ungeladene Spiele sind
nicht dadurch fertig. Map-, Foto- und Netzwerkabnahme bleiben eigene Aufgaben.
