# Account-Umsetzung: Arbeitsprotokoll

Stand 19.10.2026 · H4R-61, H4R-35, H4R-87, H4R-62.

- Benutzerfreigabe für Menü-/Kontenumsetzung und spätere Git-Übergabe erhalten. Google zunächst freigegeben, danach auf Benutzerwunsch wieder entfernt, weil keine OAuth-/Domainkonfiguration vorhanden ist. Aktive Methode: E-Mail/Passwort; Discord ist optionaler Link.
- Ruling: Aktiven Restart-Worktree weiterverwenden. Er enthält die echte App-Shell und viele vorherige Änderungen; keine Kopie der alten Main-Runtime und kein pauschales Staging.
- Ruling: Ein E-Mail-Provider benötigt keine parallele Accountidentitäts-Tabelle. `player_profiles.account_id` ist die interne ID, `auth_user_id` die geprüfte Providerbindung; bestehende Discord-Profile werden additiv migriert.
- SQL-/API-Tests zuerst fehlgeschlagen wegen fehlender Module, danach mit Implementierung grün. Client-State-/Viewtests ebenso vor Implementierung rot, danach grün. Browser fand eine ungebundene native Fetch-Funktion; Wrapper korrigiert, vier produktive UI-Szenarien danach grün.
- Direkter kompilierter Serverstart fand einen bestehenden ESM-Importfehler. `.js`-Referenzen und JSON-Importattribute korrigiert; Serverstart auf Node 24.21.0 anschließend erfolgreich.
- Finale unabhängige Codeprüfung: Recoverytyp-Verwechslung und verlorene Retry-Daten gefunden. Zweckprüfung gegen Supabase-Primärquelle verifiziert, gezielter Regressionstest rot (HTTP 200 statt 400), strikte `signup`-Zuordnung und Recovery-Sperre korrigiert; Test danach grün. Verifikationsdaten bleiben bis Erfolg erhalten. Ein zusätzlicher Owner-ID-Guard verwirft verspätete Buchungsantworten nach Kontowechsel. Reviewer hat beide Korrekturen erneut gelesen und bestätigt.
- Ruling: Archify-Diagramme beschreiben den uncommitteten lokalen Integrationsstand. Keine HEAD-Provenienz für neue Dateien erfinden. Logische Modelle + Betriebsgrenzen im Diagramm, validate/deliver/check/browser-check bestanden; PNG-Diagrammflächen erzeugt und gesichtet. Git-Revision erst nach Benutzercommit als Referenz ergänzen.
- Noch offen: echte Supabase-Zugangskonfiguration, SMTP/Templates und Live-Migration/-Abnahme; Discord-Providerzustimmung; vollständiger autoritativer Welt-/Sessionadapter. Preview, Lobby- und Wirtschaftsbonus-Freigaben bleiben deshalb ehrlich getrennt. Keine Done-Markierung für den vollständigen Plan.
- Kein Commit, Push, Live-Apply, Binärasset-Upload oder Kontozusammenführung durchgeführt. Git-Übergabeliste und Betriebsrunbook liegen bei.

## Frische Abschlussprüfung · 19.10.2026

- Workspace-Build `npx pnpm -r build`: bestanden (Vite meldet bestehende CJS-/Chunkgrößenhinweise).
- Gesamter Client: 47 Testdateien, 170 Tests bestanden.
- Konten-/HTTP-Suite: acht Tests bestanden, einschließlich aktuell parallel ergänzter Bankprüfung. Dies ersetzt keine separate fachliche Bankabnahme.
- Gebauter Server: echter Node-Start, Health 200, unkonfigurierte Konten gesperrt (Profil 503) bestanden.
- Gebaute Oberfläche: fünf Browser-Szenarien bestanden; Konto-HTTP dabei simuliert. Login/Reload, Registrierung/Recovery, mobile Ansicht, Verifikations-Retry und Ausfallzustand geprüft.
- Keine Live-Migration oder echte Mail-/Discord-Providerabnahme. Welt-Autosave und private/Discord-Spielsession weiterhin offen. Kein Commit oder Push.

## Git-Veröffentlichung · 19.10.2026

Auf ausdrücklichen Benutzerauftrag werden Kontenimplementierung und die für einen baubaren Stand benötigte bestehende App-/Runtimebasis auf `codex/rdo-restart-foundation` veröffentlicht. Enthalten sind deshalb auch Gebäude-/Minigamekataloge und bereits integrierte Venue-/Bankmodule; diese Aufnahme erweitert deren fachliche Abnahme nicht. Pipelinewerkzeuge, lokale Assets, Geheimnisse und andere Hauptcheckout-Änderungen bleiben außerhalb des Commits. Frisch vor Commit: 172 Clienttests, acht Konten-/HTTP-Tests, fünf Konto-Browserszenarien, echter Serverstart und Workspace-Build bestanden. Kein Live-Deployment.
