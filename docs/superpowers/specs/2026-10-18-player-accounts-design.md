# Spielerprofil, Anmeldung und dauerhafter Spielstand

**Implementierungsstand 19.10.2026:** Konten-/UI-/Persistenzbasis lokal umgesetzt und geprüft; Livekonfiguration, vollständiger autoritativer Weltadapter und gemeinsame Sessions bleiben offen. Google ist auf Benutzerwunsch gestrichen. Maßgeblicher aktueller Betriebsstand: docs/runbooks/player-accounts.md im Restart.

Stand: 18.10.2026. **Reviewentwurf, keine Implementierung und keine Live-Freigabe.**
Auftrag: Registrierung/Login, automatische Wiederanmeldung im Browser, dauerhaftes Inventar und Coins-Konto, optionale Discord-Verknüpfung und gemeinsame Discord-Sessions. Spielerzahlen und Ping entfallen vorerst in der Menügestaltung.
Tracking: [H4R-61](https://linear.app/h4real82/issue/H4R-61), [H4R-35](https://linear.app/h4real82/issue/H4R-35), [H4R-87](https://linear.app/h4real82/issue/H4R-87), [H4R-62](https://linear.app/h4real82/issue/H4R-62).

## Frisch geprüfter Bestand

- Aktive App-Shell: `C:/Users/h4rea/.codex/worktrees/rdo-restart-foundation/RDO-RPG`; dort `apps/client/src/app/AppShell.ts`, `AppSessionController.ts`, `AppSettings.ts`. Der Router ist bisher Teil der Shell, keine vorhandene Datei ScreenRouter.ts voraussetzen.
- `apps/server/src/index.ts` tauscht Discord-Codes aus; fehlende Secrets erzeugen aktuell Mock-Tokens. `WorldRoom.ts` übernimmt Identitätsfelder aus JoinOptions und erstellt Starterinventar bei jedem Join. Beides ist keine produktive Account-/Persistenzlösung.
- `SourceBoundaryRoom.ts` ist nur ein Grenz-/Bewegungspilot, keine vollständige autoritative Valentine-Simulation. Die lokale Solo-Szene darf deshalb noch keine dauerhaften Wirtschaftsbelohnungen erzeugen.
- Supabase `scprntjzambjhpbhccei`, lesend am 18.10.2026 geprüft: zehn angewendete historische Migrationen; `characters` mit UUID und obligatorischer eindeutiger Discord-ID, `inventory_items` mit Charakter-FK und RLS. Keine live vorhandenen `player_profiles` oder Coins-Ledger voraussetzen.
- `supabase/migrations/20261015191526_relational_player_state.sql` ist weiterhin nur lokal vorbereitet: Profile sind darin nach Discord-ID geschlüsselt. Das muss vor Freigabe des neuen Kontomodells explizit migriert werden. Historische Live-Migrationen nicht editieren.
- H4R-61/35/87/62 sind Backlog. Vorhandene Planung ist Grundlage, kein Nachweis vorhandener Funktionen.

## Architekturentscheidung zur Prüfung

Umgesetzt im lokalen Integrationsstand: Supabase Auth verwaltet E-Mail/Passwort und Wiederherstellung; Express bleibt die einzige Autorisierungs- und Spielzustandsgrenze. Eine interne UUID `account_id` identifiziert das Spielerkonto unabhängig von Anbieter, Browser, Discord-Name und Colyseus-Verbindung.

Alternativen: Eigene Passwortverwaltung würde zusätzliche Passwort-, Recovery- und Missbrauchslogik erfordern. Discord als einziges Login würde die gewünschte unabhängige Registrierung nicht erfüllen. Supabase Auth wird hier **als neue explizite Integration vorgeschlagen**; die bisherige Vorgabe gegen implizites Discord→Supabase-Auth-Mapping bleibt gewahrt. Discord-Tokens authentifizieren weiterhin ausschließlich am eigenen Server.

Aktuelle Benutzerentscheidung 18./19.10.2026: E-Mail/Passwort registrieren und anmelden; Google entfällt ausdrücklich. Discord anschließend am bestehenden Konto verknüpfen. Der Implementierungs- und Betriebsstand mit offenen Live-Gates steht im Restart unter docs/runbooks/player-accounts.md.

## Menü und Profil

- Header rechts: vor Login „Anmelden / Registrieren“, danach Avatar, Anzeigename und „Profil“. Kein Ping und keine Spielerzahl. Keine Platzhalterguthaben.
- Anmeldung: E-Mail, Passwort, vorausgewähltes „Angemeldet bleiben“, Passwort vergessen; Registrierung: Anzeigename, E-Mail, Passwort, Bestätigung und E-Mail-Verifizierung. Anzeigename ist kein Login-Schlüssel.
- Profilseite: Anzeigename, Avatar, Kontoverbindung, eigener Charakter, Coins-Saldo, Inventar und Speicherstatus. Coin-Historie gehört zum Konto. Private E-Mail und Verbindungsdaten erscheinen nur dem Besitzer.
- Kontoaktionen: Passwort ändern/zurücksetzen, abmelden, alle Sitzungen abmelden und Discord verbinden/trennen. Trennen erst nach erneutem Login und nur mit weiter nutzbarer verifizierter Anmeldemethode.
- Nach Webseitenöffnung zuerst „Profil wird geladen“. Während der Prüfung weder Gastprofil anlegen noch Nullstände anzeigen. Erfolg lädt das bestehende Konto; ungültige/abgelaufene Sitzung führt zur Anmeldung, Netzwerkfehler zu Wiederholen. HTTP 401 und Verbindungsfehler sind unterschiedliche Zustände.
- Gast-Solo bleibt als ausdrücklich ungespeicherte Vorschau möglich; kein dauerhaftes Coins-Konto, keine übertragbaren Belohnungen und kein stiller Import lokaler Gastwerte bei Registrierung.
- Persistentes Solo heißt Alleinspielen mit Serververbindung. Bei Serverausfall ist nur die getrennte Vorschau möglich. Account/Persistenz können zuerst fertig werden, bevor dieses vollständige Spielmodell freigegeben wird.
- Discord-Karte: unverknüpft „Discord verbinden“, danach bei gültiger Berechtigung „Discord-Session öffnen“. Verknüpfung allein macht noch keine nicht implementierte Lobby verfügbar. Zustände: Verbindung nötig, Prüfung, kein Zugriff, widerrufen, vorübergehend nicht erreichbar.
- Login-/Profilflächen übernehmen Stitch-Farben, Typografie und Atmosphäre; reduzierte Bewegung, Tastatur, Fokus, mobile Lesbarkeit und vorhandener Menü-Fallback bleiben verbindlich.

## Datenmodell und Besitz

| Entität | Schlüssel und Verantwortung |
| --- | --- |
| `player_profiles` | `account_id` UUID als PK; Anzeigename, Sprache, Zeitstempel; unabhängig von Discord |
| `player_profiles.auth_user_id` | Eindeutige servervalidierte Supabase-User-UUID am dauerhaften Spielprofil; keine separate Identitätstabelle für den beschlossenen E-Mail-Provider |
| `characters` | bestehende UUID und Zustände erhalten; neuer Besitzer `account_id`, erste Version ein Charakter je Konto; Discord-ID wird optionale Legacy-Zuordnung |
| `inventory_items` | vorhandene Charakter-FK erhalten; Slot-/Mengen-/Itemregeln transaktional erzwingen; individuelle Preisitems erst nach H4R-89 |
| `coin_accounts` / `coin_entries` | ein Coins-Konto je Account, ganzzahlige Beträge, unveränderliche Buchungen, eindeutiger Ereignisschlüssel, nichtnegativer Saldo |
| `app_sessions` | gehashte zufällige Sitzungsschlüssel, Besitzer, Ablauf/Widerruf, serverseitige Provider-Session-Referenz; Refresh-Secrets nur verschlüsselt serverseitig |
| `game_sessions` / Mitgliedschaften | persistente logische Session-ID, Modus, Zugang; Transport-Room-ID ist nicht die dauerhafte Identität |

Supabase `auth.users.id` wird nach verifizierter Auth-Antwort explizit in player_profiles.auth_user_id gebunden. Keine Zuordnung nach gleicher E-Mail, Name, Avatar oder Clientangabe. Discord-Verknüpfung erzeugt keinen zweiten Charakter oder Startbonus. Bereits belegte Discord-IDs werden abgewiesen; automatische Kontozusammenführung bleibt außerhalb des Umfangs.

`characters.cash/gold` bleiben Legacy-Felder und werden nicht stillschweigend als neue Coins interpretiert. Coins haben genau eine autoritative Quelle. Inventar ist zunächst charaktergebunden, das Coins-Konto accountgebunden; bei einem Charakter je Konto ist das in der Oberfläche ein gemeinsames Profil.

## Browser-Sitzung und Serververträge

Browser → gleiche Website `/api` → Express → Supabase Auth/Postgres. Vite-Entwicklung und Produktionsproxy müssen denselben Cookie-/Originvertrag abbilden. Kein Provider-Access-/Refresh-Token im LocalStorage und kein Service-Key im Client.

Nach erfolgreicher Provider-Prüfung setzt Express ein zufälliges HttpOnly-/Secure-Cookie, SameSite=Lax für den Browser. Vorgeschlagene konfigurierbare Grenzen: 30 Tage Inaktivität, 90 Tage absolute Laufzeit bei „Angemeldet bleiben“; ohne Auswahl ein Browser-Sitzungscookie mit serverseitig maximal 12 Stunden. Automatisches Laden gilt nur bei weiter gültiger Sitzung und erhaltenen Cookies. Logout widerruft die Serversitzung; „alle abmelden“ alle Sessions. Passwortreset widerruft bestehende App-Sessions. Rotation/Refresh werden serverseitig gegen parallele Tab-Anfragen serialisiert.

Geplante API:
- `POST /api/auth/register`, `/login`, `/logout`, `/logout-all`, `/password-reset`, `/password-update`; Verifikations-/Recovery-Callbacks mit geprüften Return-URLs.
- `GET /api/me` liefert ausschließlich das eigene Profil und die verfügbaren Fähigkeiten; `PATCH /api/me` ändert nur erlaubte Profilfelder.
- `GET /api/me/inventory`, `/wallet`, `/wallet/entries`; keine generischen Client-Schreibendpunkte für Mengen oder Guthaben.
- `POST /api/discord/link/start`, geprüfter Callback, `POST /api/discord/unlink`; Activity-Bootstrap separat vom Web-Callback behandeln.
- `POST /api/game-sessions/:id/join-ticket`: kurzlebiges einmaliges Ticket, gebunden an Konto, logische Session, Modus und Ablauf. Beide Room-Typen prüfen serverseitig, bevor sie dauerhafte Daten freigeben.

Mutationen: Origin-/CSRF-Prüfung, feste CORS-Allowlist, Eingabegrenzen und Rate-Limits. OAuth-state ist zufällig, kurzlebig, einmalig und an den auslösenden Account/Flow gebunden; Callback- und Issuerprüfung. Auth-Cookies und Tokens werden nicht geloggt. Fehlende Produktionskonfiguration führt zu einem gesperrten Login, niemals zu einer Mock-Identität. Supabase-Rollenrechte/RLS sperren direkte Spieltabellenzugriffe durch Browserrollen; jedes Server-Repository prüft Eigentum auch mit privilegiertem DB-Key.

## Speichern und Wiederherstellen

- Konto-/Charakter-Bootstrap ist idempotent, transaktional und konkurenzfest; Starteritems entstehen genau einmal beim Erstanlegen, nie beim Room-Join.
- Profil, Inventar und Coins werden über die Konto-ID geladen, nicht über die Verbindung. Ein DB-Lesefehler erzeugt weder Ersatzaccount noch leeres Inventar.
- Inventarverbrauch/-erwerb und Coins-Mutationen werden vor Erfolgsbestätigung atomar gespeichert. Gleicher Request-/Ereignisschlüssel liefert dasselbe Ergebnis, abweichender Payload unter gleichem Schlüssel wird abgelehnt. Keine Browser-Snapshots zurückschreiben.
- Position: letzter servervalidierter sicherer Punkt, Koordinatenraum/Map-Version und Character-State-Version mitführen. Checkpoint zunächst alle 10 Sekunden und bei geordnetem Verlassen; wirtschaftliche Änderungen warten nicht auf diesen Timer. Ein harter Abbruch kann höchstens die letzte Positionsperiode verlieren, keine bestätigten Buchungen.
- Ein Charakter hat eine aktive schreibende Gameplay-Session mit DB-gestützter Lease und Fencing-Version. Zweiter Spielstart wird mit verständlicher Rückmeldung abgewiesen; mehrere Profil-Tabs dürfen lesen. Reconnect übernimmt nur dieselbe autorisierte Lease. Abgelaufene Besitzer können keine verzögerten Writes mehr committen.
- Disconnect, Tab-Schließen und Serverneustart müssen ohne zuverlässiges unload funktionieren. Beim nächsten Login aus DB laden; bei veralteter/ungültiger Position einen geprüften sicheren Spawn verwenden. Legacy-Pixelkoordinaten nie als Three-Meterkoordinaten interpretieren.
- Bei DB-Ausfall keine bestätigungspflichtigen Wirtschaftsaktionen; sichtbarer Fehler und Retry. Keine unbeschränkte In-Memory-Buchungsqueue, kein stilles Zurücksetzen. Konto wechseln erst nach Stop/Dispose der alten Session; verspätete Antworten dürfen nicht ins andere Profil gelangen.
- Vorhandene H4R-87-Regeln bleiben erhalten: 5000 Coins genau einmal; 100 je neuer logischer Valentine-Session, nicht pro Minigame. Die 100er-Vergabe bleibt bis zu ausdrücklich festgelegten und getesteten Anti-Farming-Grenzen deaktiviert. Kein neuer Betrag durch diesen Plan.

## Discord-Teilnehmer

Discord zeigt Identität und Kontext, unsere Datenbank enthält Inventar, Coins und Spielstand. Jeder Teilnehmer muss seine eigene Discord-Identität autorisieren und sie seinem Konto zuordnen. Nur serverseitig bestätigte Mitglieder einer erlaubten Session dürfen beitreten.

Öffentlichen Room-State und private Besitzdaten trennen: das bestehende gemeinsame Player-Schema darf private Inventare, Guthaben, E-Mail oder Providerdaten nicht an alle Clients replizieren. Eigene Details nur über Besitzer-Endpunkte bzw. eine ausdrücklich private Spielersicht liefern; Zwei-Client-Tests müssen auch tatsächliche WebSocket-Nachrichten und Schema-Replikation prüfen.

Erste Version zeigt die tatsächlich teilnehmenden Spieler mit freigegebenem Discord-Anzeigenamen/Avatar. Eine Verbindung mit Discord gibt keinen pauschalen Zugriff auf alle Servermitglieder. `identify` betrifft den autorisierenden Nutzer; `guilds` dessen Serverliste, `guilds.members.read` dessen eigene Mitgliedschaft. Eine vollständige Server-Mitgliederliste benötigt eine gesonderte Bot-/Berechtigungsplanung und gehört nicht zur ersten Version.

Activity-Teilnehmerereignisse sind Darstellungshinweise; sie ersetzen keine Serverauthentifizierung. Drittanbieter-Cookiebeschränkungen im Discord-iframe separat prüfen: kein blindes SameSite=None-Umschalten. Falls Browsercookies nicht verfügbar sind, Activity-Code serverseitig verifizieren und ein kurzlebiges, nur im Speicher gehaltenes App-Ticket für das bereits verknüpfte Konto verwenden. Nach Reload erneut über Discord verifizieren. Keine Tokens in URLs, keine offenen Redirects.

## Migration, Betrieb und Abnahme

Vor neuer SQL-Datei Live-Schema, History, tatsächliche Daten und RLS/Grants erneut prüfen; Dateinamen mit Supabase CLI erzeugen. Zehn historische Migrationen bewahren. Die noch nicht angewendete elfte Vorbereitung im Test als eigenen Pfad berücksichtigen: Migration vom historischen Live-Stand sowie vom lokal vorbereiteten Stand müssen zum gleichen Accountmodell führen. Keine parallelen Profilquellen.

Legacy-Discord-Konten nach bestätigter Discord-ID in neue Accounts übernehmen; Charakter-/Inventar-IDs erhalten. Keine fiktiven auth.users anlegen. Ein bestehendes Discord-Konto wird erst nach Identitätsnachweis beansprucht; kein automatisches Zusammenführen zweier Bestände. Grants und bestehende Discord-RLS-Annahmen explizit prüfen. Erst additive Backfill-/Validierungsphase, dann neue Serverversion, erst später destruktive Bereinigung. Kein Reset und kein Live-Apply in diesem Auftrag.

Deployment-Voraussetzungen: Auth-E-Mail-Verifizierung, eigenes SMTP für produktive Registrierung/Recovery, erlaubte Redirect-URLs, HTTPS/Same-Origin-Proxy, Discord-App-Callbacks, serverseitige Secrets und Wiederherstellungstest aus Backup. Werte und Anbieter-/iframe-Verhalten vor Umsetzung erneut aus offiziellen Dokumenten prüfen.

Abnahme: Registrierung/Bestätigung/Login/Recovery/Logout; Browser schließen/öffnen; zwei Accounts und fremde IDs; Cookieverlust/abgelaufene Sitzung/Netzfehler; parallele Erstlogins; Inventar-/Coins-Buchung und Restart; verzögerter Write nach Leasewechsel; Discord link/unlink/Kollision/Widerruf; zwei autorisierte Discord-Teilnehmer; Smartphone/Tastatur/reduzierte Bewegung; vorhandene Runtime-Lebenszyklus-/Inputguards. Build allein reicht nicht. H4R-61/35/87/62 bleiben bis eigener Implementierung und frischer Abnahme offen.

## Quellen

- [Supabase Passwort-Authentifizierung](https://supabase.com/docs/guides/auth/passwords)
- [Supabase Sessions](https://supabase.com/docs/guides/auth/sessions)
- [Supabase Server-Side Auth](https://supabase.com/docs/guides/auth/server-side)
- [Discord OAuth2, Scopes und state](https://docs.discord.com/developers/topics/oauth2)
- `supabase/README.md`, lokale Migrationen und oben genannte Server-/Clientdateien; Live-Schema und Migrationsliste am 18.10.2026 lesend geprüft.
