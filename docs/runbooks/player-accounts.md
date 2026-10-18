# Spielerprofil und Anmeldung: Betrieb und Prüfstand

H4R-61 / H4R-35 / H4R-87 · Stand 19.10.2026 · aktive Codebasis: Restart-Worktree.

## Was implementiert ist

Die DOM-Shell enthält E-Mail-Anmeldung, Registrierung, Bestätigungs-/Recoveryansicht und eine Charakterseite mit eigenem Inventar, Coins-Saldo, Buchungen und Discord-Verknüpfung. Die Google-Anmeldung ist nach der letzten Benutzerentscheidung vollständig aus dem aktiven Funktionsumfang entfernt. Die vorhandene Stitch-Atmosphäre und lokale Schriftdateien bleiben erhalten; keine externen UI-CDNs eingebaut.

Express validiert die Supabase-Identität und erstellt eine eigene zufällige HttpOnly-Sitzung. In Postgres liegt nur der Hash des Cookies; Provider-Access-/Refresh-Tokens werden mit AES-256-GCM serverseitig verschlüsselt. Die Datenbank wird über `pg` vom Server angesprochen. `player_profiles.account_id` ist die feste Spielerkonto-ID, `auth_user_id` die explizite Zuordnung zur bestätigten Supabase-Identität; Discord-ID und Anzeigename sind keine Konto-Schlüssel. Eine zusätzliche Identitätstabelle aus dem frühen Entwurf wird für den beschlossenen einzelnen E-Mail-Provider nicht benötigt.

Starterinventar und 5000 Coins entstehen beim ersten transaktionalen Konto-/Charakter-Bootstrap. Erneute Anmeldung erzeugt keinen zweiten Bonus. Coins-Buchungen sind idempotent, Salden nichtnegativ, Buchungseinträge gegen Update/Delete geschützt. Legacy-`cash/gold` wird nicht zu Coins umgedeutet. Die vorhandenen Charakter-/Inventartabellen werden weiterverwendet. Nur der Besitzer erhält seine privaten Daten über `/api/me`; Clientwerte können weder Coins noch Inventarmengen setzen.

## Was noch nicht live verfügbar ist

Es fehlen lokale/produktive Datenbankzugangsdaten und die bestätigte Auth-Konfiguration. Es wurde **keine Live-Migration** angewendet und kein Testkonto beim echten Anbieter erstellt. Ohne Konfiguration melden die Kontoendpunkte 503; die Oberfläche zeigt einen Verbindungszustand statt eines erfundenen leeren Profils. Ein tatsächlicher Browserstart ist noch keine erfolgreiche Live-Anmeldung.

Die lokale Solo-Welt ist weiterhin eine **ungespeicherte Vorschau**. Gameplay-Leases, Fencing und Koordinaten-Checkpoints sind Repository-Primitiven, noch kein vollständiger autoritativer Weltadapter. Private/Discord-Lobbys, gemeinsame Spielteilnahme, persistente Weltbewegung und der 100-Coins-Sessionbonus bleiben ausgeschaltet. Die Discord-Verknüpfung ist vorbereitet, benötigt aber echte App-Konfiguration und eine eigene Providerabnahme. Sie macht kein gesamtes Discord-Mitgliederverzeichnis verfügbar.

## Serverkonfiguration

Werte im Secret-Store oder in einer ignorierten `.env` im Server-Arbeitsverzeichnis setzen; keine Secrets in Git oder in `VITE_*`. Die URL der Website muss exakt mit der Browseradresse übereinstimmen (`localhost` und `127.0.0.1` sind verschiedene Origins).

```dotenv
PORT=2567
PUBLIC_ORIGIN=http://127.0.0.1:4180
SUPABASE_URL=https://scprntjzambjhpbhccei.supabase.co
SUPABASE_PUBLISHABLE_KEY=
DATABASE_URL=
ACCOUNT_SESSION_KEY=
# Optional für explizite Discord-Verknüpfung:
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
```

`DATABASE_URL` ist die serverseitige Postgres-Verbindung aus dem Supabase-Projekt, mit verschlüsselter Verbindung und passenden Tabellenrechten. `ACCOUNT_SESSION_KEY` ist ein einmalig lokal erzeugter zufälliger Schlüssel von 32 Bytes, Base64-kodiert. Den Schlüssel weder bei jedem Serverstart neu erzeugen noch im Client ausliefern; sonst sind vorhandene Sitzungen nicht mehr lesbar. Ein Schlüsselwechsel braucht einen geplanten Sitzungswiderruf. Keine Passwörter als CLI-Argument weitergeben.

Die Entwicklungs- und Build-Vorschau leiten `/api` an Port 2567 weiter. Für den Produktivbetrieb dieselbe Website als API-Origin über HTTPS verwenden. Das Sessioncookie ist HttpOnly, SameSite=Lax und bei HTTPS Secure. „Angemeldet bleiben“: 30 Tage Inaktivität, maximal 90 Tage; ohne Auswahl Browser-Sitzungscookie und serverseitig maximal 12 Stunden. Cookieverlust, Widerruf und abgelaufene Sessions benötigen eine neue Anmeldung. Anbieter-Tokens sind kein LocalStorage-Spielstand.

## E-Mail-Provider und Templates

In Supabase Auth E-Mail/Passwort und E-Mail-Bestätigung aktivieren, Site URL und erlaubte Rückkehradresse auf `PUBLIC_ORIGIN` setzen. Für verlässliche produktive Zustellung eigenes SMTP konfigurieren; der Standardversand ist nur begrenzt für Tests geeignet.

Die Anwendung erwartet **TokenHash-Links** und prüft diese nach einem ausdrücklichen Klick. Die E-Mail-Templates müssen zur App zurückführen, nicht einen impliziten Access-/Refresh-Token im URL-Fragment hinterlassen:

- Registrierung: `{{ .SiteURL }}/?account=verify&token_hash={{ .TokenHash }}&type=email`
- Passwort vergessen: `{{ .SiteURL }}/?account=recovery&token_hash={{ .TokenHash }}&type=recovery`

Die Anwendung entfernt die Parameter aus der Browseradresse und hält sie nur bis zur erfolgreichen Bestätigung im Speicher. Providerseitig wird `email` strikt auf `signup` abgebildet: Supabases generischer `email`-Modus akzeptiert auch Recoverytokens und wäre für die Trennung ungeeignet. Recovery-Sitzungen dürfen nur das Passwort ändern/abmelden, kein Profil laden oder Discord verknüpfen. Nach erfolgreicher Passwortänderung werden alle App-Sitzungen dieses Accounts gelöscht und eine neue Anmeldung verlangt.

Vor Livefreigabe: Registrierung mit echter Zustellung, Bestätigungslink, Login, Wiederöffnen des Browsers, Passwortreset, Widerruf und abgelaufene Sitzung tatsächlich testen. Diese Providerprüfungen werden durch lokale Stubs nicht ersetzt.

## SQL-Kette

Vor Deployment Live-History und Schema erneut prüfen. Aktuell zuletzt lesend bestätigt: zehn historische Live-Migrationen; die relationale Vorbereitung vom 15.10. und die neue Kontenmigration sind nicht live angewendet.

- Historische SQLs unverändert lassen.
- `20261015191526_relational_player_state.sql` ist die vorhandene lokale Vorbereitung.
- `20261018151227_player_accounts.sql` migriert das Profil auf interne UUID, ordnet vorhandene Charaktere zu und ergänzt Coins, App-Sessions, Link-Flows und Gameplay-Leases. Der Test prüft den Ausgangsstand mit und ohne die lokale Vorbereitung.
- Bei Legacy-Discord-Konten werden Charakter-/Inventar-IDs erhalten. Eine bereits anderweitig belegte Discord-ID wird als Konflikt abgewiesen; keine automatische Kontozusammenführung. Eine spätere Bestandsübernahme braucht eine ausdrücklich geprüfte Identitätsbindung.

Ein Schema-Push gehört nicht in Build oder Serverstart. Erst Dry-run, Datensicherung, Rechte-/RLS-Prüfung und dann gezieltes Deployment. Die neue Anwendung benötigt Zugriff auf die migrierten Tabellen; bei fehlendem Schema niemals Ersatzprofile oder Nullguthaben zurückschreiben.

## Reproduzierbare lokale Prüfungen

Getestete Runtime: Node.js 24.21.0. Der kompilierte Serverstart wurde geprüft; explizite `.js`-Importe in `shared` und JSON-Importattribute in `content` beheben den zuvor beim direkten Node-Start sichtbaren ESM-Fehler.

```powershell
npx pnpm --filter @rdo-rpg/server exec tsx --test src/accounts/Accounts.test.ts src/accounts/AccountHttp.test.ts
npx pnpm --filter @rdo-rpg/client test -- src/app/AccountController.test.ts src/app/AccountViews.test.ts
npx pnpm -r build
node scripts/e2e-player-accounts.mjs
```

Der Browserlauf erwartet eine laufende Build-Vorschau auf Port 4180 (überschreibbar mit `ACCOUNT_UI_URL`). Er testet die echte gebaute Oberfläche mit **absichtlich simulierten Konto-HTTP-Antworten**. Screenshots unter `data/runtime/valentine/account-evidence/` sind Testfixtures, keine echten registrierten Spieler. Die Servertests führen SQL auf PGlite/PostgreSQL aus, simulieren aber Supabase-Netzwerkantworten. Sie belegen keinen Produktionsbetrieb, keinen Mehrprozess-Lasttest und keine echte Discord-Zustimmung.

Ein zusätzlicher Test schließt eine dateibasierte PGlite-Datenbank und öffnet sie erneut: Account-/Charakter-ID, verbrauchtes Inventar und Coins-Buchungen bleiben erhalten. Der API-Test prüft auch den strikt getrennten Recoveryzweck und den Widerruf aller App-Sitzungen nach Passwortänderung. `node scripts/test-account-server-start.mjs` startet den tatsächlich kompilierten Node-Server und prüft Health sowie das gesperrte Kontoangebot ohne Konfiguration.

Archify: [Anmeldung/Profil](../architecture/account-access.html) und [dauerhafte Besitzdaten](../architecture/account-state.html). Beide bestanden validate/deliver/check/browser-check; PNGs zeigen die Diagrammfläche. Es sind logische Übersichten des uncommitteten lokalen Integrationsstands, keine an HEAD gepinnten Repositorynachweise. Vor Veröffentlichung nach Commit gegebenenfalls mit dessen Revision neu belegen.

## Git-Übergabe

Kein Commit, Push oder pauschales Staging wurde vorgenommen. Der Restart enthält umfangreiche fremde/vorherige Änderungen. Die Kontenänderungen sind mit `docs/planning/player-account-files.txt` aufgelistet; dort ist zwischen neuen Kontendateien und gemeinsam geänderten Integrationsdateien unterschieden. Vor dem Commit alle aufgelisteten Diffs prüfen. Die bereits zuvor unversionierten App-/Weltmodule sind notwendige Basis der aktiven Runtime und müssen unabhängig vollständig im Commitstand vorhanden sein; ein einzelner Account-Commit über einen unvollständigen Basisstand wäre nicht reproduzierbar.

Vorgeschlagener Titel nach Review: `H4R-61: Spielerprofile mit E-Mail-Anmeldung und Kontomenü ergänzen`. H4R-61/35/87 bleiben bis ihrer jeweils vollständigen Live-/Gameplayabnahme offen.
