# Gebäudeaktionen außerhalb von Minigames

Planungsstand 31.10.2026 · [H4R-112](https://linear.app/h4real82/issue/H4R-112) · [Gesamtplan](Valentine-Lebendige-Welt-Ausstattung-2026-10-31.md).

**Alle Angebote dieser Matrix sind Zielplanung, keine Verfügbarkeitsmeldung.** Vorhandene Pilotaktionen werden bei Umsetzung separat geprüft und wiederverwendet. Quelle sind der aktuelle Restart-Index `data/reference/valentine/buildings/registry.json` und jede referenzierte `building.json`: 37 Records mit 42 Floor-Definitionen. Keine Koordinaten oder neue Originalgrundrisse werden erfunden.

## Gemeinsamer Aktionsvertrag

Für jedes Haus/Floor werden erreichbare Anker aus dessen eigener Detaildatei verwendet. Ein zentraler Aktionstyp (`sit`, `talk`, `inspect/read`, `trade`, `try-on`, `horse-care`, `rest`, `service`, später `quest-offer`) führt Verhalten, Abbruch und Berechtigungen. Minigame-Regeln und Artikel-/NPC-Details werden nicht in jedem Haus dupliziert.

Angebote erscheinen bei erreichbarer Nähe und richtigem Stockwerk. Keine Marker durch Wände. Eine Sitz-/Dialog-/Handelsteilnahme pro Spieler, oberstes Modal besitzt Fokus, Escape/Abbruch führt sicher zurück. Fehlende Kategorie/Assets/Serverfähigkeit liefern eine verständliche geschlossene Alternative mit Schließen-Funktion.

Untergeschosse/obere Floors bekommen nur ausdrücklich passende Anker, mindestens untersuchen/lesen oder ruhigen Aufenthalt, falls möbliert. Kein Kauf- oder Talk-Prompt im falschen Stockwerk. Die Tabelle fordert keine neuen Etagen. Sichtgeometrie, Spielkollision und Support bleiben getrennt; eigene Aktionsgestaltung heißt `authored-gameplay`.

## Vollständige Planmatrix

| Registry-ID | Vorhandener Name | Floor-Definitionen | Erster sinnvoller Aktionsschnitt | Spätere Erweiterung |
| --- | --- | --- | --- | --- |
| `station` | Bahnhof | `ground` | Fahrplan lesen, sitzen, Schaltergespräch | Post-/Gepäckauftrag, spätere Ticket-/Reisefunktion |
| `val-01-aucyard-stables` | Viehmarkt-Stall | `ground` | Pferd ansehen, anbinden/auswählen, Stallpersonal ansprechen | Pflege, Ausrüstungsanprobe und Pferdehandel über H4R-113/114 |
| `val-01-aucbarns-barn3` | Auktionsscheune 3 | `ground`, `upper` | Werkzeug/Anschlag lesen oder untersuchen, Arbeitergespräch | Freiwillige Liefer-/Reparaturaufträge, verwaltete Lagerplätze |
| `val-01-aucyard-chkcoop` | Viehmarkt-Hühnerhaus | `ground` | Tiere beobachten, betreuendes Personal ansprechen | Einfaches Füttern/Pflegen; keine Pflicht-Hofarbeit |
| `val-01-aucyard-stable2` | Viehmarkt-Stall 2 | `ground`, `upper` | Pferd ansehen, anbinden/auswählen, Stallpersonal ansprechen | Pflege, Ausrüstungsanprobe und Pferdehandel über H4R-113/114 |
| `val-01-aucbarns-barn2` | Auktionsscheune 2 | `ground`, `upper` | Werkzeug/Anschlag lesen oder untersuchen, Arbeitergespräch | Freiwillige Liefer-/Reparaturaufträge, verwaltete Lagerplätze |
| `val-01-aucyard-shed` | Viehmarkt-Schuppen | `ground` | Werkzeug/Anschlag lesen oder untersuchen, Arbeitergespräch | Freiwillige Liefer-/Reparaturaufträge, verwaltete Lagerplätze |
| `val-01-aucyard-barn` | Viehmarkt-Scheune | `ground` | Werkzeug/Anschlag lesen oder untersuchen, Arbeitergespräch | Freiwillige Liefer-/Reparaturaufträge, verwaltete Lagerplätze |
| `church` | Kirche | `ground` | Sitzen, Erinnerungs-/Infobuch lesen, ruhiger Aufenthalt | Kerze/Erinnerung nur mit Eigentums-/Moderationsregeln |
| `val-07-resf-ext` | Wohnhaus F | `ground` | Sitzen, persönliche Gegenstände/Bücher untersuchen, Bewohner ansprechen | Private Gesprächs-/Erinnerungsszenen; Entnahme nur mit ausdrücklicher Berechtigung |
| `val-07-magic-ticketbooth` | Kassenhäuschen | `ground` | Programm lesen, Platz ansehen/reservieren | Eintritt und gemeinsame Vorführung nach Anbieter-/Sessionabnahme |
| `val-03-stable-ext` | Livery-Stall | `ground` | Pferd ansehen, anbinden/auswählen, Stallpersonal ansprechen | Pflege, Ausrüstungsanprobe und Pferdehandel über H4R-113/114 |
| `general-store` | General Store | `ground` | Katalog öffnen, Vorräte ansehen, Händlergespräch | Kaufen/Verkaufen und Kleidung am eigenen Körper anprobieren |
| `val-05-res-e` | Wohnhaus E | `ground` | Sitzen, persönliche Gegenstände/Bücher untersuchen, Bewohner ansprechen | Private Gesprächs-/Erinnerungsszenen; Entnahme nur mit ausdrücklicher Berechtigung |
| `val-05-res-d` | Wohnhaus D | `ground` | Sitzen, persönliche Gegenstände/Bücher untersuchen, Bewohner ansprechen | Private Gesprächs-/Erinnerungsszenen; Entnahme nur mit ausdrücklicher Berechtigung |
| `val-07-magiclantern-ext` | Kinozelt | `ground` | Programm lesen, Platz ansehen/reservieren | Eintritt und gemeinsame Vorführung nach Anbieter-/Sessionabnahme |
| `val-03-jail-ext` | Sheriff & Gefängnis | `ground` | Spielregeln/Steckbriefe lesen, Sheriff ansprechen | Freiwillige NPC-Aufträge/Meldung; kein ungefragter Spieler-Kopfgeldmodus |
| `gunsmith` | Büchsenmacher | `ground` | Waffe/Angebot in 3D ansehen, Munition erklären lassen | Kaufen, ausrüsten, reinigen/reparieren; Schießprobe nur an sicherem Außenanker |
| `bank` | Bank | `ground` | Kontostand/Inventarangebot ansehen, Schaltergespräch | Servergeprüfter Verkauf/Transfer; keine zweite lokale Kontowahrheit |
| `val-freightstn` | Frachtstation | `ground` | Fracht-/Postanschlag lesen, Angestellte ansprechen | Freiwillige kleine Zustellaufträge mit eindeutiger Abgabe |
| `law-office` | Law Office | `ground` | Anschläge/Regeln lesen, NPC-Gespräch | Spielinterne Verträge und freiwillige Ruf-Aufträge |
| `smithfields-saloon` | Smithfield’s Saloon | `ground` | Sitzen, reden, Getränkekarte und lokale Aushänge ansehen | Bestellung, Musik/Hostangebote; seltener Überfall erst über Ereignis-Director |
| `val-auchouse-ext` | Auktionshaus | `ground` | Angebote/Termine lesen, Waren untersuchen, Personal ansprechen | Gezielte Auktion erst mit servergeprüftem Bieten/Settlement |
| `val-06-auchouseb-ext` | Auktionshaus B | `ground`, `upper` | Angebote/Termine lesen, Waren untersuchen, Personal ansprechen | Gezielte Auktion erst mit servergeprüftem Bieten/Settlement |
| `hotel` | Hotel | `ground`, `upper` | Zimmerangebot ansehen, sitzen/reden | Zimmer mieten, Ausruhen/Outfit wechseln ohne globale Zeit vorzuspulen |
| `sheriff-house` | Sheriff-Haus | `ground` | Spielregeln/Steckbriefe lesen, Sheriff ansprechen | Freiwillige NPC-Aufträge/Meldung; kein ungefragter Spieler-Kopfgeldmodus |
| `smithy` | Schmiede | `ground` | Material/Werkstück ansehen, Schmied ansprechen | Einfache Reparatur/Pflege mit Katalogangebot und festem Ergebnis |
| `doctor` | Arztpraxis | `ground` | Angebot lesen, Arzt ansprechen | Spielerische Heilung/Pflegeartikel; optionale Versorgung ohne Pflicht-Timer |
| `second-saloon` | Zweiter Saloon | `ground` | Sitzen, reden, Karte/Anschläge lesen | Eigenes ruhigeres Treffpunktprofil und passende Händlerangebote |
| `val-05-res-a` | Wohnhaus A | `ground` | Sitzen, persönliche Gegenstände/Bücher untersuchen, Bewohner ansprechen | Private Gesprächs-/Erinnerungsszenen; Entnahme nur mit ausdrücklicher Berechtigung |
| `val-05-res-c` | Wohnhaus C | `ground` | Sitzen, persönliche Gegenstände/Bücher untersuchen, Bewohner ansprechen | Private Gesprächs-/Erinnerungsszenen; Entnahme nur mit ausdrücklicher Berechtigung |
| `shipping-stand` | Versandstand | `ground` | Fracht-/Postanschlag lesen, Angestellte ansprechen | Freiwillige kleine Zustellaufträge mit eindeutiger Abgabe |
| `val-05-pigpen-a` | Schweinestall A | `ground` | Tiere beobachten, betreuendes Personal ansprechen | Einfaches Füttern/Pflegen; keine Pflicht-Hofarbeit |
| `main-street-map-house` | Haus an der Hauptstraße | `ground` | Untersuchen/Lesen an bewusst gestalteten Ankern | Erst nach Rollenklärung weitere Nutzung; keine ungeklärte Identität als Händlerfunktion ausgeben |
| `northwest-farm-map-shed` | Nebengebäude am Nordwesthof | `ground` | Untersuchen/Lesen an bewusst gestalteten Ankern | Erst nach Rollenklärung weitere Nutzung; keine ungeklärte Identität als Händlerfunktion ausgeben |
| `doctor-yard-map-shed` | Nebengebäude im östlichen Hinterhof | `ground` | Untersuchen/Lesen an bewusst gestalteten Ankern | Erst nach Rollenklärung weitere Nutzung; keine ungeklärte Identität als Händlerfunktion ausgeben |
| `store-yard-map-shed` | Nebengebäude hinter dem General Store | `ground` | Untersuchen/Lesen an bewusst gestalteten Ankern | Erst nach Rollenklärung weitere Nutzung; keine ungeklärte Identität als Händlerfunktion ausgeben |

## Nicht als zusätzliches fertiges Haus zählen

- `val-03-default-jail`: vorhandener ungeklärter Zusammenhang mit Sheriff-/Gefängnishüllen; kein Floor definiert. Keine zweite Händler-/Innenraumfunktion erfinden.
- `val-butcher-collapsed`: Ruinenrecord ohne Floor; keine fertige Metzgerei oder Originalnutzung daraus ableiten. Ungeklärte Identität/Nutzung bleibt [FLAG: Data Missing].

Die vier Map-Gap-IDs am Tabellenende sind bewusst gestaltete Spielbereiche. Ihre Namen beschreiben die Arbeitslage; sie behaupten keine verifizierte Originalgebäudeidentität. L22 ist nicht Teil dieser Matrix und kein neuer Untersuchungsauftrag.

## Erste Lieferung und Abnahme

Zuerst je eine vollständige Sitz-, Gesprächs- und Lese-/Untersuchungsaktion sowie ein vorhandenes Händlerangebot über den gemeinsamen Vertrag anbieten. Danach Store-Anprobe/Stall, Hotel/Post und weitere Dienstleistungen in eigenständigen Issues. Nicht alle 37 Häuser mit gleichzeitig neuen Minispielen oder einer Pflicht-Aufgabenliste füllen.

Je angebundener Aktion: echter Hin-/Rückweg, ausreichender Platz, richtige Blick-/Sitzrichtung, erreichbarer Anker, gültiger Floor, Abbruch/Fehlladung, Inputschutz und gegebenenfalls Besitz-/Preis-/Kapazitätsprüfung. Kosten/Belohnung nur serverseitig und idempotent. Eine Registernotiz oder ein grüner Build ist keine fertige Spielhandlung.
