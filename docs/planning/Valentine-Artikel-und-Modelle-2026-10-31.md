# Artikel, Modelle und Store-Anprobe

Planungsstand 31.10.2026 · [H4R-114](https://linear.app/h4real82/issue/H4R-114), [Gesamtplan](Valentine-Lebendige-Welt-Ausstattung-2026-10-31.md).
**Keine der folgenden neuen Artikel-/Modellzeilen meldet bereits verfügbare Ware.**

## Ein Katalog, getrennte Zuständigkeiten

Artikel definieren Identität, Variante, Kategorie, Equip-Slot, Kompatibilität, Gewicht/Stapeln, Asset-/Bildreferenzen und Verfügbarkeitsstatus. Händlerangebote referenzieren Artikel plus Preis/Bestand; Besitz und ausgerüsteter Zustand sind Spieler-/Pferdedaten. Ein Preis oder Outfit wird nicht nochmals in jeder Gebäude-, NPC- oder UI-Datei definiert.

Empfohlene spätere Ablage, noch kein angeschlossenes Runtime-Register:

```text
data/reference/catalog/items/index.json
data/reference/catalog/items/<artikel-id>/item.json
data/reference/catalog/assets/<asset-id>/source.json
data/reference/catalog/assets/<asset-id>/recipe.json
data/reference/catalog/offers/<haendler-id>.json
data/raw/authored/<asset-id>/                 # lokale Blender-/Originalquellen
data/runtime/catalog/models/<asset-id>/<version>/model.glb
data/runtime/catalog/images/<asset-id>/<version>/thumb.webp
```

Metadaten/Rezepte werden versioniert; Rohdateien und erzeugte Modelle/Bilder bleiben lokale Runtime-Assets. Spätere gezielte Verteilung ist ein eigener Schritt. Produktbilder entstehen aus dem **gleichen finalen Modell** unter festem Kamera-/Lichtprofil; keine schöne Konzeptgrafik als Abbild eines anderen In-Game-Gegenstands.

Ein Asset benötigt Herkunft/Autor/Lizenz, erlaubte Ableitung, Originalhash, Generator-/Rezeptversion, reale GLB- und Bildpfade, Bounds/Pivot, Rig-/Socketprofil sowie Prüfergebnis. Unbekannte Originalzuordnung bleibt [FLAG: Data Missing]; Arbeitsnamen sind keine Originaldateinamen.

## Startverzeichnis der geplanten Artikel und Medien

Die IDs sind vorgeschlagene eigene Katalogidentitäten. Preise, Gewichte, Assets und konkrete Quellen werden vor Freigabe separat belegt/abgestimmt; keine Original-RDR2-Werte behaupten.

| Vorgeschlagene ID | Inhalt | Benötigte Darstellung / Passform | Status |
| --- | --- | --- | --- |
| clothing.hat.felt | Filzhut, Farbvarianten | GLB am Kopf-Socket, Thumbnail und 3D | geplant; Modellprüfung offen |
| clothing.shirt.cotton | Baumwollhemd | passende Skins/Körpermaske, Ärmelbewegung | geplant; Modelldaten fehlen |
| clothing.vest.work | Arbeitsweste | Hemd-/Torso-Kompatibilität | geplant; Modelldaten fehlen |
| clothing.coat.duster | Langer Mantel | Sitzen/Reiten/Arme, definierte Unterteilmasken | geplant; Modelldaten fehlen |
| clothing.trousers.work | Arbeitshose | Hüfte/Knie, Stiefelüberdeckung | geplant; Modelldaten fehlen |
| clothing.boots.leather | Lederstiefel | Fuß-/Knöchelpassform und Bodenkontakt | geplant; Modelldaten fehlen |
| weapon.revolver.basic | Basisrevolver | Hand-/Holster-Socket, Ziehen/Feuer/Nachladen | geplant; Modelldaten fehlen |
| weapon.repeater.basic | Repetiergewehr | Zwei-Hand-/Rücken-Socket | spätere Stufe; Modelldaten fehlen |
| ammo.revolver.standard | Revolvermunition | eigenes Pack-/Patronenbild aus passendem Modell | geplant |
| ammo.repeater.standard | Gewehrmunition | getrennte Munitionsfamilie, passendes Packbild | spätere Stufe |
| horse.tack.saddle.work | Arbeitssattel | pro Körper-/Rasseprofil geprüfte Reiteranker | geplant |
| horse.tack.bridle.leather | Zaumzeug | Kopfproportionen, Zügel/Handkontakt | geplant |
| horse.tack.bag.small | Kleine Satteltasche | Anker, sichtbare Größe, eigener Stauraumvertrag | geplant |
| horse.care.brush | Bürste | Handmodell und Pflegeaktion | geplant |
| horse.care.feed | Pferdefutter | Verpackung/Handgabe, kein Offline-Zerfallszwang | geplant |
| horse.care.tonic | Pflegeprodukt | Flasche/Packung und klare Spielwirkung | geplant |
| horse.body.compact | Kleiner Reittyp, Arbeitsziel Morgan | eigene Proportionen,3 Fellvarianten, Rigprüfung | Zielprofil; vorhandene Rasse nicht belegt |
| horse.body.medium | Mittlerer Allroundtyp, Arbeitsziel Tennessee Walker | eigene Proportionen,3 Fellvarianten | Zielprofil; vorhandene Rasse nicht belegt |
| horse.body.heavy | Großes Kaltblut, Arbeitsziel Shire | Körper-/Kopf-/Beinproportionen und breitere Sattelpassform | Zielprofil; vorhandene Rasse nicht belegt |
| npc.role.bartender | Neuer Barkeeper | Hemd/Weste/Schürze, Hände/Gesicht, serve/talk/sit | geplant; ersetzt sichtbaren Block-Pilot |
| npc.role.citizen | Bürgerfamilie | unterschiedliche Körper/Outfits, walk/idle/talk | geplant |
| npc.role.stablehand | Stallpersonal | Arbeitskleidung und horse-care-Animation | geplant |

Die 16 vorhandenen Cowboy-/Pferde-Varianten bleiben als Quellen-/Vorschauinventar erhalten. Passende Teile können wiederverwendet werden; sie erfüllen nicht automatisch den Rasse-, Kleidungs-, NPC- oder Reitanimationskatalog.

## Store-Fenster und Anprobe

1. Gebäudeaktion am erreichbaren General-Store-Anker öffnen; Spieler kann mit Waffe in der Hand nicht nebenbei einkaufen/schießen.
2. Links Kategorien und Filter, mittig der eigene Körper in 3D, rechts Variante, Besitz, Preis, Passform und bewusster Kauf. Auf kleinem Bildschirm als nacheinander erreichbare Bereiche statt abgeschnittene Spalten.
3. Anprobe ersetzt nur die Vorschau. Bereits getragene Kleidung kann ein-/ausgeblendet werden; Körpermasken vermeiden doppelte Hemden und sichtbare Haut durch den Mantel.
4. Drehen/Zoomen nur auf der Vorschau. Beleuchtung entspricht dem gemeinsamen Figurenprofil; Hintergrund ruhig, keine automatisch laufenden Kamerafahrten.
5. **Anprobieren**, **Zurücksetzen**, **Kaufen**, **Anziehen**, **Schließen** sind getrennte Aktionen. Schließen/Abbrechen stellt das echte ursprüngliche Outfit wieder dar.
6. Erst bestätigter serverseitiger Kauf erzeugt Besitz und Coins-Buchung. Request-ID, Angebot/Preisversion, Kapazität und Kompatibilität prüfen; Netzfehler erzeugt keine doppelte Ware.
7. Ausrüstung speichert Artikel-/Varianten-IDs; das Runtime-Modell wird über die Assetversion aufgelöst. Quellencredits im discoverbaren Nachweisbereich, nicht als lange Texte unter jeder Karte.

Schmied/Büchsenmacher und Stall verwenden denselben Katalog mit anderen Angeboten. Waffen zeigen rotierende echte Modelle, passende Munition/Slot; Pferdeartikel werden am ausgewählten Pferd anprobiert. Kein eigener zweiter Besitz-/Kaufpfad.

## Produktions- und Abnahmefolge

Zuerst ein Outfit und ein Barkeeper komplett, ein Sattel auf einem Pferdekörper sowie ein Revolver als Pilot. Danach Varianten aus geprüften Körper-/Materialrezepten. Kleidung darf nicht über undeutliche Umfärbungen des nackten Körpermodells simuliert werden.

Für jedes freizugebende Asset: Original erhalten → Geometry/UV/Rig prüfen → konservativ optimieren und tatsächliche Reduktion messen → glTF validieren → drei repräsentative Posen/Bewegungen prüfen → Thumbnail aus derselben GLB-Version rendern → im tatsächlichen Spiellicht und in der Anprobe ansehen. Nachweis für Fehlladung, mehrfaches Öffnen und Freigabe der Vorschauressourcen.

Keine feste Polygonzahl oder garantierte FPS aus dem Bauch. Einfache Kollisionshüllen, LODs und gemessene Speicher-/Drawcall-Kosten entscheiden. Geldbeträge und Besitz werden nur autoritativ verwaltet; lokale Vorschauen behaupten keine Live-Persistenz.
