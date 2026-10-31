# Spezifikation: Benutzerdefinierte Wandbilder & Gemälde-Austausch (RDO-RPG)

## 1. Übersicht & Ziel
In sämtlichen begehbaren Innenräumen von Valentine (z. B. *Smithfield's Saloon*, *Hotel*, *Bank*, *Doctor*, *Sheriff*) sind an den Wänden gerahmte historische Gemälde und Bilder platziert. 
Diese Spezifikation definiert das einheitliche Format, die Seitenverhältnisse, Auflösungen und das Ablagekonzept, mit dem Spieler und Entwickler standardmäßige Wandbilder durch **eigene Bilder** ersetzen sowie im laufenden Spiel in **voller Detailansicht (Inspection Modal)** betrachten können.

---

## 2. Unterstützte Bildformate & Farbräume

| Eigenschaft | Anforderung / Empfehlung |
| :--- | :--- |
| **Dateiformate** | `PNG` (verlustfrei, empfohlen), `WebP` (optimale Kompression), `JPG` / `JPEG` |
| **Farbraum** | `sRGB` (Standard für Three.js / WebGL-Shader) |
| **Farbtiefe** | 8-Bit pro Kanal (24-Bit RGB bzw. 32-Bit RGBA) |
| **Maximale Dateigröße** | Empfohlen $\le 2.5\,\text{MB}$ pro Bild (für verzögerungsfreies Streaming) |
| **Transparenz** | Bei gerahmten Bildern voll deckend (kein Alpha erforderlich) |

---

## 3. Standard-Seitenverhältnisse & Auflösungen

Gemälde und Wandbilder in den Innenräumen sind in vier feste Gestaltungsformate unterteilt. Für jedes Format gilt eine empfohlene native Arbeitsauflösung:

### 3.1 Format A: Breites Landschaftsgemälde (16:9)
* **Verwendung**: Große Szenerien, Panoramen (z. B. Dakota River, Cumberland Falls, Prärie-Ausblicke).
* **Empfohlene Auflösung**: `1920 × 1080 px`
* **Minimale Auflösung**: `960 × 540 px`
* **Maximale Auflösung**: `3840 × 2160 px` (4K)

### 3.2 Format B: Klassisches Saloon-Ölgemälde (4:3)
* **Verwendung**: Hauptgemälde an Saloon- und Hotelwänden (z. B. historische Stadtansichten, Jagdszenen, Porträts mit Hintergrund).
* **Empfohlene Auflösung**: `1024 × 768 px` (oder `1600 × 1200 px`)
* **Minimale Auflösung**: `800 × 600 px`
* **Rahmen-Format**: 1.15m × 0.85m im Spielraum

### 3.3 Format C: Quadratisches Bild / Wappen (1:1)
* **Verwendung**: Wappen, Siegel, Tierporträts (Bison, Bär, Adler), Schießsport-Plaketten.
* **Empfohlene Auflösung**: `1024 × 1024 px`
* **Minimale Auflösung**: `512 × 512 px`

### 3.4 Format D: Hochformat / Porträt (3:4 oder 9:16)
* **Verwendung**: Steckbriefe (*Wanted Posters*), Porträts historischer Persönlichkeiten, Werbeplakate.
* **Empfohlene Auflösung**: `768 × 1024 px` (3:4) bzw. `1080 × 1920 px` (9:16)
* **Minimale Auflösung**: `600 × 800 px`

---

## 4. Speicherorte & Namenskonvention

Eigene Bilder werden modular pro Gebäude und Bild-Slot in den Projekt-Asset-Ordner abgelegt:

```text
public/
  assets/
    artworks/
      smithfields-saloon/
        wall-picture-a.png    <-- Nordwand (Hauptgemälde, 4:3)
        wall-picture-b.png    <-- Westwand über Klavier (Landschaft, 4:3)
      hotel/
        reception-painting.png
        room-portrait-01.png
      bank/
        directors-landscape.png
      doctor/
        anatomical-chart.png
```

### Automatischer Fallback
Existiert in `public/assets/artworks/{buildingId}/{pictureId}.png` kein benutzerdefiniertes Bild, greift die Engine nahtlos auf die standardmäßige, verifizierte Western-Textur (`val_cs_salpaintings08_ab.png` bzw. prozedurale Ölgemälde) zurück.

---

## 5. Ingame-Großansicht (Inspection Modal)

### 5.1 Interaktionsablauf
1. Der Spieler nähert sich im Innenraum einem Wandgemälde (Erfassungsradius: $2.0\,\text{m}$).
2. Dezent am Bildschirmrand bzw. über der Aktion erscheint die Einblendung:
   `[F] Gemälde betrachten`
3. Drücken von `[F]` öffnet das **Artwork-Inspektions-Modal**:
   * Ein zentrierter, abgedunkelter Kinomodus mit viktorianischem Prunkrahmen.
   * Das Gemälde wird in voller Bildauflösung scharf dargestellt.
   * Bildtitel, Urheber und Ort werden im Western-Stil typografiert.
   * Ein Dateipfad-Hinweis zeigt an, welche Datei für dieses Bild zuständig ist.
   * Über die Schaltfläche **„Eigenes Bild wählen“** kann direkt aus dem Dateisystem ein lokales Bild gewählt werden. Die Engine aktualisiert die WebGL-Textur im 3D-Saloon sofort in Echtzeit!
4. Schließen über `[Esc]`, Klick auf das Schließen-Kreuz oder Klick außerhalb des Bildes.
