---
title: "Architektur und Datenhoheit"
type: architecture
tags: [rdo]
updated: 2026-10-31
status: active
---

# Architektur und Datenhoheit

| Bereich | Verantwortung | Einstieg |
| --- | --- | --- |
| Client | Three.js, Darstellung, Eingabe, Menüs | `apps/client/` |
| Server | Colyseus, autoritative Spielzustände, Discord-Tokenaustausch | `apps/server/` |
| Gemeinsame Verträge | Netzwerktypen, Schemas, Inhaltsdaten | `packages/shared/`, `packages/content/` |
| Restart-Pipeline | Weltverträge, Import-/Prüfwerkzeuge | `packages/world-contracts/`, `tools/rdo_pipeline/` im Restart |
| Infrastruktur | Proxy und Deployment-Konfiguration | `infra/` |

## Eine zuständige Quelle je Inhalt

- **Linear:** Aufgaben, Priorität, Abhängigkeiten, Status und Abnahme.
- **Repository:** ausführbarer Code, Konfiguration, Datenregister und technische Evidenz.
- **Obsidian:** Warum Entscheidungen gelten, wie Systeme zusammenhängen, wiederverwendbare Abläufe und belegte Recherche.
- **Lokale Asset-Verzeichnisse:** Rohdaten und erzeugte Runtime-Dateien.

Geplante Funktion ist keine vorhandene Funktion. Die Existenz einer SQL-Datei beweist kein Live-Schema. Im Hauptcheckout und Restart kann unterschiedlicher Code stehen.

Quellen: [Client-Paket](https://github.com/h4real82/RDO-RPG/blob/main/apps/client/package.json), [Server-Paket](https://github.com/h4real82/RDO-RPG/blob/main/apps/server/package.json), [Shared-Paket](https://github.com/h4real82/RDO-RPG/blob/main/packages/shared/package.json), [[10_Projekt/Arbeitsstaende|Arbeitsstände]].

