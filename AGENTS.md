# RDO-RPG Project Directives (Antigravity & Gemini Agent Rules)

## ThreeJS Guard
- Dachüberhänge bei Gebäuden dürfen maximal 0.5 Einheiten über die Fassade ragen (historisch bündige Dachtraufen).
- Bei Verdeckung des Spielers zwischen Kamera und Charakter MUSS das blockierende Material (Dächer, Vordächer, Wände) stufenlos transparent werden (opacity: 0.15, depthWrite = false).

## Map Source of Truth
- Straßen, Sektoren und Gebäude richten sich strikt nach den Referenzdateien im Ordner `Media/`:
  - `Media/Valentine MAP.jpg` (Geografische Ausrichtung, S-Kurve der Hauptstraße, Bahnhof im Südosten, Zonenaufteilung)
  - `Media/Valentine Station.png` (Bahnhof, Bahnsteig, Gleisbett, Wasserturm)
  - `Media/Valentine Saints Hotel and Bank.jpg` (Zweistöckige Fassaden, Proportionen, Farbgebungen)
  - `Media/Valentine Screenshot RDO street...` (Dachüberhänge, Boardwalks, Wagenspur-Rillen)
  - `Media/Valentine Screenshot RDO with all buildings.jpg` (Gesamtdorf-Relationen, Livery Barn, Koppeln)

## Code Guard
- Bei jedem Event-Listener (speziell Keydown wie 'E' für POI-Interaktionen, 'Tab', 'Escape' oder DOM-Clicks) sind strikte Null-Checks und defensive `try...catch`-Blöcke Pflicht.
- Kein unhandled Exception darf den Input- oder Simulations-Loop einfrieren.
- Unbekannte oder fehlende Menü-Kategorien müssen immer auf ein sauberes Fallback-Menü mit Schließen-Funktion zurückgreifen.

## Build Gate
- Jeder Agent-Task und jede Code-Modifikation schließt zwingend mit `npx pnpm -r build` ab, um TypeScript- und Bundling-Fehler sofort abzufangen.
