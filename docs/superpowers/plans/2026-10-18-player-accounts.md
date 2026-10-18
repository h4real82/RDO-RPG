# Umsetzungsfolge: Spielerprofil und Persistenz

**Implementierungsstand 19.10.2026:** Konten-/UI-/Persistenzbasis lokal umgesetzt und geprüft; Livekonfiguration, vollständiger autoritativer Weltadapter und gemeinsame Sessions bleiben offen. Google ist auf Benutzerwunsch gestrichen. Maßgeblicher aktueller Betriebsstand: docs/runbooks/player-accounts.md im Restart.

18.10.2026 · Reviewentwurf, Ausführung noch nicht begonnen. Design: [Kontenentwurf](../specs/2026-10-18-player-accounts-design.md). Dieser ausdrücklich angeforderte Plan nimmt die Designabnahme nicht vorweg; nach Review Entscheidungen festschreiben und API-/SQL-Verträge vor dem jeweiligen Implementierungsschritt konkretisieren.

Aktive Codebasis: `C:/Users/h4rea/.codex/worktrees/rdo-restart-foundation/RDO-RPG`. Planung liegt im Hauptcheckout `D:/Projects/RDO-RPG`. Vor Ausführung Branch/AGENTS/Dateien und uncommittete Arbeit erneut abgleichen; keine Main-Runtime statt der aktiven Shell bearbeiten. Keine automatische Delegation, Commits oder Deployments durch diesen Plan.

## 1. Account- und Auth-Basis — H4R-61

- Benutzerkorrektur 18./19.10.2026: Google entfällt. E-Mail/Passwort und separate Discord-Verknüpfung bleiben; keine Google-Cloud-Konfiguration erforderlich.

- Vorhandene `apps/server/src/index.ts`, `config.ts`, `apps/client/src/discord.ts`, `apps/client/src/app/AppShell.ts` und beide Rooms prüfen. Supabase Auth als neue explizite Auth-Integration zur Designabnahme stellen; Auth-/SMTP-/Redirectkonfiguration prüfen, keine Zugangsdaten dokumentieren.
- Neue Servermodule: `auth/AuthProvider.ts` (E-Mail-Provideradapter), `auth/AppSessions.ts` (Cookie/Rotation/Widerruf), `auth/AuthRoutes.ts` (Registrierung/Login/Recovery), `auth/RequireAccount.ts` (Besitzkontext). Keine Providerlogik in WorldRoom.
- Neue gemeinsame Typen in `packages/shared/src/account.ts`: `AccountId`, `AccountSummary`, `AccountCapabilities`, `AuthState`. Zustände: checking, signed-out, verification-required, authenticated, unavailable. Keine Tokens in DTOs. Export aus `index.ts`.
- Neue `apps/server/src/accounts/AccountRepository.ts`: `ensureAccount(identity: VerifiedIdentity): Promise<AccountSummary>`; `getOwnProfile(accountId: AccountId): Promise<AccountSummary>`; `updateOwnProfile(accountId, allowedPatch)`. VerifiedIdentity entsteht ausschließlich am Provideradapter.
- Test zuerst: anonymer/fremder Zugriff abgewiesen; falsches Passwort, Bestätigung und Recovery; wiederholtes Ensure liefert gleiche ID; paralleles Ensure erzeugt einen Account; Produktionsmodus ohne Secrets liefert keine Mock-Session; CSRF/Origin und Sessionrotation geprüft.
- Ergebnis: echtes E-Mail-Konto und servervalidierte Sitzung ohne Gameplay-Freigabe. DB-Arbeit dazu mit Schritt 2 gemeinsam integrieren, bevor der Schnitt als funktionsfähig gilt.

## 2. Schema und dauerhafter Zustand — H4R-35

- `supabase/README.md`, Live-Migrationsliste, Tabellen, FK/RLS/Grants erneut prüfen. Neue lokale Migrationsdatei nur über CLI erstellen. Accountmodell aus dem Design umsetzen; vorhandene Charakter-/Inventaridentitäten bewahren. Die lokal vorbereitete Discord-Profilmigration nicht ungeprüft deployen.
- Neue Repositories unter `apps/server/src/persistence/`: `CharacterRepository.ts`, `InventoryRepository.ts`, `GameplayLeaseRepository.ts`; Positionadapter mit explizitem Koordinatenraum. `ensureCharacter(accountId)` initialisiert Starterinventar einmal atomar. Bestehendes Inventar nicht durch Schema-Defaults ersetzen.
- Tests in `supabase/tests/accounts.test.mjs`: zehn historische Migrationen plus neue Kette; separat Stand inklusive bisheriger lokaler Vorbereitung; deterministische Legacyfixtures; identisches Zielmodell, FK-Erhalt, Unique-Bindung, verbotene Browserrechte und rollbackfähige Konflikte. Die finale Migrationskette erst nach Vergleich beider Pfade wählen.
- Integrationstests auf echtem lokalen/isolierten PostgreSQL: konkurrierende Erstellung, Leaseübernahme, Fencing gegen verspätete Writes, Transaktionsrollback und Neustart. PGlite allein ist kein Nachweis für konkurrierende Prozesse oder Supabase Auth.
- Ergebnis: Profil und Inventar bleiben bei Reload/Serverneustart erhalten. Live-Apply separat prüfen/freigeben; keine Änderung historischer SQLs.

## 3. Kontomenü und automatisches Laden — H4R-61

- `AppShell.ts/.css` erweitern; neue `AccountController.ts` (HTTP/Auth-Zustand, Abort/Generation), `AccountViews.ts` (Login/Registrierung/Recovery/Profil). AppSessionController behält alleinige Runtime-Verantwortung.
- Auth-State vor Spielstart laden: `GET /api/me`; 401 öffnet Anmeldung, Netzwerkfehler zeigt Retry. Cookie wird serverseitig geprüft; niemals lokalen Account-/Coinswert als Wahrheit nutzen. Accountwechsel stoppt zuerst die alte Runtime.
- Header/Directory um Profil ergänzen; kein Ping und keine Spielerzahlen. Eigene Coins/Inventar nur nach echten API-Daten zeigen. Passwortfelder, Fehlermeldungen, Verifikations-/Recovery-Zustände, Abmelden und alle Sitzungen abmelden aufnehmen.
- Listener mit Nullchecks und try/catch; deaktivierte Aktionen, Fokus, Escape und unbekannte Screens mit Schließen-Fallback. Stitch-Atmosphäre respektiert reduzierte Bewegung. Fehlende Auth-Konfiguration als bedienbarer Zustand.
- Browsernachweis: Registrierung → E-Mail-Bestätigung → Login → Browserkontext mit Cookiepersistenz schließen/neu öffnen → identisches Profil; zusätzlich ohne „Angemeldet bleiben“, nach Logout, mit abgelaufenem Cookie, im zweiten Tab und bei ausgefallener API. Echte E-Mail-Zustellung separat abnehmen, Mockprovider nur für deterministische Tests.

## 4. Coins als atomare Kontobuchungen — H4R-87

- Neue `economy/WalletRepository.ts` und `WalletService.ts`. Vertrag `applyEvent(accountId, eventId, validatedEvent): Promise<WalletSnapshot>`; nur servervalidierte Ereignisse, persistente Idempotenz und atomare Balance-/Ledgeränderung. Ganzzahlige Salden ohne JavaScript-Präzisionsverlust im API übertragen.
- Starteranspruch 5000 genau einmal pro Account; kein neuer Bonus bei Login, Discord-Link oder Charakter-Neuladen. Bestehendes `cash/gold` nicht automatisch umrechnen.
- 100er-Sessionbonus bleibt bis Entscheidung der Anti-Farming-Grenzen ausgeschaltet. Aktivierung später separat: stabile logische Session-ID, eindeutiger Anspruch und Regeln gegen schnell neu erstellte Sessions. Keine erfundenen Grenzwerte stillschweigend aktivieren.
- Echte DB-Tests: paralleler Erstbonus, identischer/differierender Replay-Payload, unzureichender Saldo, Transaktionsabbruch, Wiederholung nach Restart. Kein generischer „setBalance“-Endpunkt.

## 5. Autoritative Spielsession anschließen — H4R-35 / H4R-62

- Neue `sessions/JoinTickets.ts` und Leaseintegration; `WorldRoom.ts` und `SourceBoundaryRoom.ts` vor persistentem Join authentifizieren. Der bestehende Grenzpilot genügt nicht als vollständiger Server für die lokale Valentine-Szene.
- Zuerst persistentes Profil/Inventar separat nutzbar abnehmen. Anschließend vollständigen autoritativen Bewegung-/Interaktionsadapter der aktiven 2,5D-Runtime als eigenen Ausführungsschnitt konkretisieren. Erst danach persistentes Solo und Wirtschaftsaktionen im Spiel freigeben; Preview bleibt getrennt.
- `packages/shared/src/schema.ts`: öffentlichen Player-State von privatem Inventar/Wallet trennen; keine globale Inventarreplikation aus dem Legacy-Schema übernehmen. Mit zwei echten Clients empfangene Room-Nachrichten prüfen, nicht nur HTTP-Besitzschutz.
- Zehn-Sekunden-Positionscheckpoint, sichere Spawnvalidierung und Map-/Koordinatenversion; wirtschaftliche Writes sofort vor Bestätigung. Erfolgreiche Buchungen dürfen keinen Positionsautosave überschreiben.
- Test: zweiter schreibender Join abgewiesen; Reconnect ohne neues Starterpaket; Browserabbruch/Serverkill ohne unload; fremdes/abgelaufenes Ticket abgewiesen; keine clientbehauptete Discord-ID oder Position als Identität/Save-Beweis akzeptieren.

## 6. Discord verknüpfen und gemeinsam beitreten — H4R-61 / H4R-62

- Neue `auth/DiscordIdentity.ts`, `auth/DiscordLinkRoutes.ts`; vorhandenen `/api/token`-Mockpfad durch getrennte Dev-/Produktionsverträge ersetzen. Web-OAuth und Activity-Bootstrap nicht gleichsetzen.
- Verknüpfung nur am angemeldeten Konto mit einmaligem state; Discord-ID ausschließlich aus geprüftem Providerresultat. Keine automatische Verknüpfung über E-Mail oder Namen. Konflikt einer schon gebundenen Discord-ID führt zu verständlichem Fehler.
- Activity ohne bestehende Bindung: externes Weblogin plus kurzlebiger Einmal-Verknüpfungscode, an beide bestätigten Identitäten gebunden; nach Erfolg dasselbe Accountprofil laden. Keine Accountneuanlage auf bloßes SDK-Teilnehmerereignis.
- Same-Origin-Browsercookie und Activity-Ticketadapter getrennt testen; blockierte Drittanbietercookies, Providerwiderruf und Callbackreplay berücksichtigen. Erst beide autorisierte Nutzer und servergeprüfte Sessionmitgliedschaft erlauben gemeinsamen Beitritt.
- Teilnehmerliste zeigt nur gemeinsame Spielteilnehmer und freigegebene Discord-Namen/Avatare. E-Mail, Inventar, Coins und OAuthdaten anderer Nutzer bleiben privat. Gesamten Guild-Katalog nicht voraussetzen.
- Zwei-Client-Abnahme: Konto A/B verknüpfen, Session beitreten, eigene Spielstände laden, gegenseitig Name/Avatar sehen, fremde Profil-/Walletabfragen abweisen; unlink/revoke verhindert neue Discord-Joins und behandelt bestehende Discord-Zugriffsleases beim nächsten Berechtigungscheck.

## Abschluss und Reviewfokus

Pro Schnitt zuerst relevante Tests schreiben, implementieren, gezielt testen und `npx pnpm -r build` ausführen. Bestehende Client-/Session-/Inputtests einbeziehen. Keine Done-Markierung allein durch Build oder gemockte OAuthantworten.

Besonders nachweisen: keine Doppelaccounts/-boni bei Link/Mehrfachtab; keine Nullinitialisierung bei DB-Ausfall; kein verspäteter Write nach Konto-/Leasewechsel; kein unerlaubter Zugriff auf fremde Inventare; kein Autorisierungswechsel durch Discord-Anzeigenamen oder Session-ID. Konto, Coins und Discord gelten erst nach den jeweiligen realen Integrationsnachweisen als verfügbar.

Aktuelle Abhängigkeiten: H4R-35 hängt bisher an H4R-34, H4R-34 an H4R-62, H4R-62 an H4R-61. Für accountgebundene Lobbys muss diese Reihenfolge bewusst angepasst werden: H4R-61 Authbasis → H4R-35 Accountpersistenz → H4R-62 Lobby → H4R-34 gemeinsame Revalidierung. Die alte H4R-34-Blockade von H4R-35 darf erst im Review mit entsprechender Begründung entfernt werden. Sonst entsteht bei neuen nativen Blockern ein Kreis. H4R-87 benötigt H4R-61 und H4R-35; Discord-Lobbys benötigen zusätzlich die Linkabnahme. Keine Abhängigkeiten in diesem Entwurfsauftrag stillschweigend ändern.

Planabnahme und Umsetzung bleiben getrennt. Keine Runtime-, Authprovider- oder Live-Datenbankänderung durch diese Dokumente.
