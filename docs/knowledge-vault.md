# Das RDO-RPG-Wissens-Vault

Stand: 31.10.2026 · [H4R-50](https://linear.app/h4real82/issue/H4R-50).

Das Vault unter `docs/Obsidian/` erklärt Entscheidungen und Zusammenhänge. Linear führt Aufgaben und Abnahme; das Repository führt ausführbare Technik und Quellenregister. Statuslisten werden nicht gegenseitig kopiert.

## Aufbau

| Ort | Inhalt |
| --- | --- |
| `Index.md` | Ein sichtbarer Einstieg |
| `00_Inbox/` | Schnelle eigene Gedanken |
| `10_Projekt/` | Ziel, Architektur, Arbeitsstände |
| `20_Entscheidungen/` | Entscheidungen mit Anlass, Gründen und Folgen |
| `30_Handbuch/` | Bewährte Abläufe und Wiederherstellung |
| `40_Recherche/` | Belegte Fakten, offene Fragen, klar benannte Ideen |
| `90_Vorlagen/` | Wissen, Entscheidung, Recherche |

Die [versionierte Grundstruktur](vault-starter/Index.md) enthält 16 kleine, verbundene Notizen. Sie ist die Ausgangsbasis des Neuaufbaus, kein automatischer Spiegel des persönlichen Vaults. Spätere eigene Notizen bleiben lokal.

## Neuaufbau und Sicherung

Vor der Bereinigung wurden sämtliche 1.354 Dateien inklusive 1.297 Markdown-Notizen und Obsidian-Konfiguration kopiert und einzeln mit SHA-256 verglichen. 1.229 Notizen waren technische Asset-Einträge. Die vollständige Sicherung liegt **außerhalb** des Vaults und Repositorys unter `D:/Projects/RDO-RPG-Backups/2026-10-31-vault-cleanup/`; das lokale Manifest enthält Pfad, Größe und Prüfsumme.

Historische Agenten-Dashboards, generierte Asset-Graphen, Chatlogs und doppelte Kanban-Boards gehören nicht in den täglichen Wissenseinstieg. Brauchbare Benutzerideen wurden kuratiert übernommen. Die Originale bleiben in der Sicherung auffindbar.

Zum Wiederherstellen einzelner Erkenntnisse die betreffende Originalnotiz lesen, Datum und heutige Gültigkeit prüfen und nur das benötigte Wissen zurückführen. Für eine vollständige Rückkehr Obsidian schließen, den neuen Stand separat sichern und `vault-original/` wiederherstellen. Plugin-Konfigurationen können Zugangsdaten enthalten; die Sicherung bleibt lokal.

## Pflege

Eine Notiz beantwortet eine Frage, nennt Quelle und Datum und verlinkt mindestens eine verwandte Notiz. Fakten, Vorschläge und Entscheidungen werden ausdrücklich unterschieden. Vor neuer Notiz nach einer passenden bestehenden suchen.

Wikilinks bleiben innerhalb des Vaults. Repository-Quellen verwenden HTTPS-Links auf GitHub: Obsidian kann relative Markdown-Links nicht über die Vault-Grenze hinaus auflösen.

Neue Aufgaben kommen nach Linear. Keine Agenten-Aktivitätsbehauptungen oder Fortschrittsprozente ohne frische Evidenz. Ein Datei-Write startet keinen Agenten. Der frühere lokale `sync:kanban`-Befehl entfällt; er war keine Linear-Synchronisierung.

Obsidian verwendet die eingebauten Vorlagen aus `90_Vorlagen/`. Der lokale REST-Connector bleibt erhalten. Die früheren zusätzlichen Community-Plugins werden im neu aufgebauten Vault deaktiviert; ihre Dateien und Einstellungen bleiben in der Sicherung.

## Git-Grenzen

`/docs/Obsidian/`, lokale Arbeitsbilder, Rohdaten und generierte Runtime-Assets bleiben ignoriert. Die beiden früher versionierten Vault-Boards werden aus Git entfernt; sie bleiben in Git-Historie und Sicherung. Keine pauschale Stage-Aktion im gemischten Hauptcheckout.

Die Repository-Bereinigung verändert keine Spiellogik und führt keine Datenbankmigration oder Asset-Veröffentlichung aus.

