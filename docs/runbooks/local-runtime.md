# Lokale Runtime-Dateien in Vite ausliefern

Die importierten Minigame-HTMLs verwenden `/runtime/valentine/...`. Vite darf an diesen URLs keine HTML-Startseite als Ersatz für JSON oder GLBs zurückgeben.

## Konfiguration

Der Client mountet genau ein ausgewähltes generiertes Runtime-Verzeichnis unter `/runtime/valentine` — sowohl im DEV- als auch im Preview-Server. Standard: `data/runtime/valentine/` im Checkout.

Bei einer externen oder versionierten lokalen Vorschau `apps/client/.env.example` nach `.env.local` kopieren und `RDO_VALENTINE_RUNTIME_DIR` auf deren `runtime/valentine/`-Verzeichnis setzen. Relative Pfade gelten ab `apps/client/`. Keine Rohdaten-Verzeichnisse eintragen. `.env.local` bleibt ignoriert; die Einstellung wird nur vom Server gelesen, nicht als Client-Umgebungsvariable veröffentlicht.

Das Verzeichnis muss die von den Exporten referenzierten Dateien enthalten, beispielsweise `verified-scene/rdo_world_manifest.json` und dessen Modelle/Texturen. Den konkreten Quellstand bewusst wählen; die Konfiguration ersetzt oder ändert weder Startskripte noch vorhandene Vorschau-Snapshots.

```powershell
npx pnpm --filter @rdo-rpg/client dev
# Nach dem Build für eine getrennte Produktionsprobe:
npx pnpm --filter @rdo-rpg/client exec vite preview --host 127.0.0.1 --port 4208 --strictPort
```

## Prüfen

Eine vorhandene Manifest-URL liefert HTTP 200 und `application/json`. Fehlende Dateien liefern 404, Schreibmethoden 405; Traversal und Links außerhalb des ausgewählten Verzeichnisses werden abgewiesen. Kein Directory Listing und keine Auslieferung von `data/raw/`.

`npx pnpm --filter @rdo-rpg/client test` prüft diese Grenzen mit einem temporären HTTP-Server. Der Client-Build schließt Testdateien weiterhin in die TypeScript-Prüfung ein.

Beim Playtest zuerst alle Paket-Builds beenden. Ein Build von `packages/shared` während einer DEV-Browserprüfung kann über Vite einen vollständigen Seitenreload auslösen und iframe-Prüfungen abbrechen. Ein vorhandener Selektor im iframe belegt noch keine gerenderte Karte: Ladezustand und tatsächliches Bild ansehen.

Herkunft und Abnahmegrenzen: [H4R-107](https://linear.app/h4real82/issue/H4R-107), [H4R-106](https://linear.app/h4real82/issue/H4R-106).
