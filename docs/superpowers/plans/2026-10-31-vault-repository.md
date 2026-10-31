# H4R-50: Wissens-Vault und Repository konsolidieren

> **For agentic workers:** Use superpowers:executing-plans to implement this plan in the current session.

**Goal:** Ein kleines, verknüpftes Wissens-Vault und einen verlässlichen Repository-Einstieg herstellen.

**Architecture:** Linear führt Status, Git führt Technik, das lokale Vault führt Wissen. Vollständige Sicherung außerhalb des Repositorys vor dem Neuaufbau; isolierter Dokumentationsbranch schützt die laufenden Gameplay-Änderungen.

**Tech Stack:** Markdown, Obsidian, Git; einmalige lokale Python-Dateioperationen mit SHA-256-Prüfung.

**Spec:** Direkter Benutzerauftrag vom 31.10.2026 und H4R-50; Struktur und Regeln in `docs/knowledge-vault.md`.

## Entscheidungen

Kuratierten Neuaufbau gewählt. Bloßes Umsortieren behält 1.229 maschinelle Asset-Notizen im Alltag; ersatzloses Leeren verliert nützliche Benutzerideen. Die vollständige externe Sicherung und 16 verbundene Kernnotizen erfüllen beide Bedürfnisse.

Ausführung durch einen Agenten, da Konfiguration, Vault und Git-Grenzen zusammenhängen. Keine separaten Implementierungsagenten. Benutzer hat Rückfragen/Entscheidungsfreigaben ausdrücklich abgewählt.

## Umsetzung und Nachweis

- [x] Aktuelle Linear-Issues lesen; H4R-50 wiederverwenden und tatsächlich auf In Progress setzen.
- [x] Gemischten Hauptcheckout inventarisieren; isolierten Worktree anlegen.
- [x] Baseline mit eingefrorenem Lockfile installieren und vollständig bauen.
- [x] Vollständige Sicherung: 1.354 Dateien, 23.043.374 Bytes; alle SHA-256 identisch.
- [x] 16 Kernnotizen mit Quellen, Wikilinks und klarer Datenhoheit verfassen.
- [x] Lokales Vault ersetzen, Plugins/Vorlagen und Einstieg anpassen.
- [x] Git-Grenzen, README, Dokumentationsindex und lokale Skill-Regeln konsolidieren.
- [x] Historische Boards/Arbeitsbilder aus dem aktiven Git-Bestand nehmen.
- [x] Links, Frontmatter, Backup, Git-Grenzen und unveränderte Gameplay-Quellen prüfen.
- [x] `npx pnpm -r build` im isolierten Dokumentationsbranch ausführen.

## Ergebnis und Grenzen

16 Notizen mit 39 gültigen Wikilinks, vollständigem Frontmatter und externen HTTPS-Quellenlinks. Alle Sicherungsdateien erneut SHA-geprüft, REST-Connector bytegleich erhalten, 160 Anwendungs-/Paketquellen unverändert. 13 lose Root-Screenshots in ignorierten Arbeitsordner verschoben. Obsidian öffnet das neue Vault; Startseite und Spielzielnotiz sichtbar geprüft.

Unabhängige Abschlussprüfung ohne verbleibende materielle Findings. Quellenregeln in AGENTS.md aktualisiert; neue Python-Pipeline-Quellen trotz ignorierter Tool-Binärdateien gezielt versionierbar. Keine produktive Spiellogik geändert und keine neue Map-Abnahme behauptet.

Der Build im gemischten Hauptcheckout scheitert an bereits vorhandenen fehlenden Modulen/Typverträgen. Vollständiges Protokoll lokal unter `docs/local-artifacts/vault-cleanup-2026-10-31/main-build.log`; Folgeaufgabe [H4R-107](https://linear.app/h4real82/issue/H4R-107). Das wird nicht als erfolgreicher Main-Build ausgegeben und nicht mit dem grünen isolierten Branch vermischt.

## Review Focus

Keine Sicherung im Vault oder Git. Keine Secrets aus Plugin-Daten ausgeben. Keine erneute Veröffentlichung fremder lokaler Gameplay-Änderungen. Historische Dokumente behalten Datum und Kennzeichnung. Keine automatische Linear-Synchronisierung behaupten.

