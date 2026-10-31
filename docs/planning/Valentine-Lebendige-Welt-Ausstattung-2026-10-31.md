# Valentine: Figuren, Stadtleben, Pferde und Ausrüstung

Stand: 31.10.2026 · Planungsauftrag [H4R-108](https://linear.app/h4real82/issue/H4R-108).
**Status: empfohlener Ausbauplan. Die folgenden neuen Funktionen sind noch nicht implementiert oder abgenommen.**

## Ziel und geprüfter Ausgangspunkt

Eine glaubwürdige, ruhige Westernstadt: passende Menschen und Tiere, sinnvolle Innenraumhandlungen, ein eigenes Pferd und verständliche Ausrüstung. Seltene Ereignisse sollen Geschichten erzeugen, ohne Treffen, Einkäufe oder Minigames zu stören.

Die aktive Restart-Arbeitskopie wurde geprüft, nicht mit veröffentlichtem main gleichgesetzt:

| Quelle | Tatsächlicher Befund |
| --- | --- |
| `apps/client/src/game/player/CowboyAvatar.ts` | Texturiertes Cowboy-GLB, eigene Ruhepose und prozedurale Laufbewegung. Eine vollwertige Ziel-/Reit-/Arbeitsanimationsbibliothek ist dadurch nicht belegt. |
| `apps/client/src/game/interiors/SaloonFurniture.ts`, Zweige `npc-bartender`/`npc-clerk` | NPCs werden noch aus einfacher Box-/Zylindergeometrie und Farbmaterialien gebaut. Der vom Benutzer beschriebene Qualitätsunterschied ist im Code nachvollziehbar. |
| `data/reference/player-models/{sources,variants}.json` und tatsächliche GLB-JSON-Chunks | Acht Menschen- und acht Pferdevarianten, jeweils eine Ausgangsmodellfamilie. Beide Basismodelle besitzen ein Skin und je einen Clip (`mixamo.com`, `metarigAction.003`). Namen allein belegen keine geeigneten Gangarten. Farb-/Skalierungsrezepte sind keine acht Pferderassen. |
| `data/reference/valentine/buildings/registry.json` und Detaildateien | 39 Indexrecords, davon 37 mit insgesamt 42 Floor-Definitionen. Zwei weitere Alias-/Ruinenrecords besitzen keinen Floor; das sind keine 37 fertig abgenommenen Innenräume. |
| `CanvasPointerGestures.ts`, `ValentineRuntime.ts`, H4R-86 | Linksklick-Laufziel, kurzer Rechtsklick-Kontext, rechter/mittlerer Drag-Orbit, Q/E-Kamera und F-Interaktion müssen konfliktfrei fortgeführt werden. |
| H4R-40/41/42/97 | Tiere/Jagd, Inventar, Weltkampf und Modellvorschau besitzen eigene offene Abnahmen. Vorschauen, lokale Coins oder Minigame-Waffen sind keine fertigen Welt-/Besitzsysteme. |

L22 bleibt außerhalb des Scopes. Kein neues Layout: bekannte Straßen, Grenzen, Gleise und gemeinsame Gebäude-/Stockwerksdaten bleiben Grundlage; eigene Anker und Wege werden als `authored-gameplay` ausgewiesen.

## Gewählte Lösungen und Alternativen

| Bereich | Gewählt | Abwägung |
| --- | --- | --- |
| Grafik | Gemeinsames PBR-/Rig-/Animationsprofil für Spieler, NPCs und Pferde | Blockfiguren passen nicht; dieselbe Cowboy-Kopie für jeden NPC wäre eintönig. Rollen, Körper und Kleidung unterscheiden, Materialqualität angleichen. |
| Stadt-KI | Kleine explizite Zustandsautomaten plus Zeitplan, A*-Wege und lokale Ausweichbewegung | Für erste feste Rollen verständlicher als ein großes universelles Behavior-Tree-System. Entscheidung, Wegplanung und Darstellung bleiben getrennt erweiterbar. |
| Ereignisse | Ein serverseitiger Director mit Eignungsprüfung, Ruhezeiten und freiwilliger Beteiligung | Ständige Zufallsspawns oder starre Pflichttermine würden stören. Ein Ereignis darf auch ganz ausfallen, wenn es nicht passt. |
| Pferde | Ein aktives eigenes Pferd, einfaches Stallmenü, sichere Ruf-/Reit-Schleife | Besitz und Pflege vor Herden-/Zuchtkomplexität. Pflege verbessert das Spiel, wird keine tägliche Anwesenheitspflicht. |
| Ausrüstung | Ein Artikel-/Assetkatalog und Anprobe am echten Körper | Einzelne Händlerlisten und dekorative Produktbilder würden auseinanderlaufen. Bilder aus denselben geprüften Modellen rendern. |
| Waffen | Maus-Fadenkreuz und Linksklick nur bei bewusst gezogener Waffe; kleines Waffenrad auf B | Übernimmt den Benutzervorschlag. Q/E bleiben Kamera; ein großes dauerhaftes RDR2-HUD ist für die 2,5D-Ansicht unnötig. |

## 1. Gemeinsame Figurenqualität

Der Cowboy ist die **sichtbare Qualitätsreferenz**, kein Baukasten, dessen unverändertes Outfit alle NPCs tragen müssen. Gleiches Verhältnis von Materialdetail, Gesichts-/Handqualität, Kanten, Texeldichte, Maßstab und Lichtreaktion; Rollen bleiben an Silhouette und Kleidung erkennbar.

Erster Vergleich: Spieler und Barkeeper nebeneinander im Saloon, danach Bürger und Stallpersonal. Barkeeper mit Hemd/Weste/Schürze, Händler mit eigener Arbeitssilhouette, Bürger mit mehreren Körper-/Kleidungsvarianten. Vorhandene Quellen und Credits erhalten; keine bloße Umfärbung der Blockgeometrie als fertige Lösung.

Menschliche Basis: gemeinsame kompatible Rig-Konvention, Füße/Pivot, Größenprofil sowie Hand-/Holster-/Sitz-Sockets. Getrennte Körper-/Kleidungsbausteine mit Körpermasken; unterschiedliche Körperfamilien nur mit nachgewiesener Passform. Benötigt: idle, walk, turn, sit/stand, talk, serve/hand-over sowie später draw/aim/fire/reload und ride. Vorhandene Clips tatsächlich ansehen und prüfen, fehlende Clips neu authoren/retargeten.

Pferde: gemeinsame Material- und Lichtprüfung, eigene Anatomie-/Rig-Familie. Kleine, mittlere und schwere Körperform brauchen unterschiedliche Proportionen und passende Sattel-/Reiteranker. Starter-Zielrassen Morgan, Tennessee Walker und Shire sind **Designziele**; eine vorhandene Quelle wird keiner Rasse ohne Prüfung zugeordnet. Zunächst je drei klare Fellfarben, weitere Muster später.

GLB/UV/PBR-Texturen als Runtime; Originale lokal unverändert. Animationen/Skins, Schulter-/Hüftdeformation, Hände am Zügel/Waffe und Kontakt der Füße/Hufe werden visuell abgenommen. Eigene Quellableitungen und Pose ausdrücklich kennzeichnen.

## 2. Ruhiges Stadtleben und Tiere

Erster Besetzungsschnitt: Barkeeper, Händler, Stallpersonal und vier Bürgerrollen; wenige Hunde/Hühner und Pferde an passenden Orten. Jagdtiere am zulässigen Rand erst separat über H4R-40. Wald außerhalb der Grenze bleibt dekorativ.

Zustände: `idle → travelling → working/socializing/resting`, unterbrechbar durch `yielding/fleeing/event-participant`; danach Rückkehr zum Zeitplan. Ein Zeitplan referenziert Gebäude/Floor/Aktionsanker, keine zweite Koordinatenkopie. Unzugängliche Ziele und geschlossene Verbindungen liefern einen erreichbaren Ersatz oder eine Wartephase.

Navigation nutzt die vorhandene Spielkollision und explizite Tür-/Rampenverbindungen. Erst kleine validierte Wegpunkte statt ungeprüfter vollständiger Navmesh-Migration. Nicht jeden Frame neue Wege berechnen: Entscheidung zunächst etwa 5 Hz, entfernte Routine etwa 1 Hz, Wege bei Ziel-/Blockadeänderung mit Wartefenster. Werte sind Startkonfigurationen, keine gemessenen Leistungszusagen.

NPCs weichen Spielern aus und halten Zugänge frei; wiederholtes Blockieren führt zum Warten/Zurücktreten an einen validierten Punkt. Kein Teleport durch Wände. Renderculling entfernt weder logische Händlerfunktionen noch erforderliche Sicherheit/Kollision.

Server führt Entitäten, Zustände, Ziele und Ereignisse; Clients interpolieren und animieren. Erst wenige Figuren messen, danach Budget erhöhen. Ziel für den ersten Ausschnitt: höchstens etwa 12 nahe animierte Menschen einschließlich Ereignisakteuren, reduzierte Distanzsimulation/LOD. Tatsächliche CPU-/GPU-/Drawcall-Kosten und bestehende H4R-49-Budgets entscheiden über die endgültige Zahl; keine 60-FPS-Zusage.

## 3. Seltene Ereignisse

**Entwurfswerte zur Spielprüfung, keine bereits vorhandene Funktion:**

| Regel | Vorgabe |
| --- | --- |
| Anlauf | Frühestens nach 15 aktiven Spielminuten einer Session |
| Globale Ruhe | Nach Abschluss/Abbruch 45–75 aktive Minuten bis zum nächsten Versuch |
| Persönliche Ruhe | Mindestens 45 aktive Minuten je betroffenem Spieler |
| Wiederholung | Gleiches Szenario nicht innerhalb 120 aktiver Minuten |
| Gleichzeitigkeit | Höchstens ein einschneidendes Stadtereignis; kein Mehrspieler-Multiplikator pro Kopf |
| Bei ungeeignetem Kontext | Versuch verwerfen und später neu entscheiden; keine wartende Ereigniswelle |
| Unterbrechungsschutz | Kauf, Anprobe, Dialog, Minigame, Eintritt/Treppe, Laden/Reconnect und Safe-Zonen schützen |

Der Director gehört zu einer **Weltinstanz mit stabiler worldInstanceId**, nicht zu jedem einzelnen Spieler oder kurzlebigen Socket. Seine aktive Uhr läuft nur, solange mindestens ein Spieler verbunden und nicht pausiert/AFK-markiert ist; leere Zeiten und offline vergangene Stunden werden nicht nachgeholt. Persönliche Ruhe zählt aktive verbundene Spielzeit des Accounts und gilt auch beim Wechsel in einen anderen Raum. Neu beigetretene Spieler erhalten zusätzlich 10 aktive Minuten persönlichen Anlaufschutz.

Restzeiten, zuletzt gespielte Szenarien, eventId, Teilnehmer und bereits erfolgte Auszahlungen werden autoritativ gesichert. Reconnect und Serverneustart erhalten diese Werte, erzeugen keine Sofortfreigabe und keine nachgeholte Ereigniswelle. Eine bewusst neue Welt startet mit der globalen Anlaufzeit; persönliche Account-Sperren bleiben wirksam. Ohne geprüften Persistenzvertrag über H4R-35 wird dieser persistente Ereignismodus samt dauerhaften Belohnungen nicht freigegeben. Seed und Entscheidungsgründe müssen für Tests nachvollziehbar sein.

Drei erste Szenarien:

- **Saloon-Überfall:** hör-/sichtbare Vorphase, wenige Banditen, eine freie Flucht-/Außenroute. Spieler können helfen, beobachten oder gehen. Teilnahme wird nicht aus dem Verlassen eines Minigames abgeleitet; keine Händler- oder Inventarvernichtung.
- **Betrunkener Duellforderer:** Dialog mit klarer Ablehnung. Erst nach bewusster Zusage in einen geeigneten validierten Außenbereich wechseln; kein spontaner Schuss ins Gesicht oder automatisches PvP. Ablehnung wird nicht bestraft.
- **NPC überfällt NPC:** von außen wahrnehmbare Begegnung mit optionalem Helfen/Warnen. Gegner ziehen den Spieler erst bei bewusster Einmischung hinein. Keine dauernden Verfolgungen über die Map.

Zustand: `eligibility → staging → offered/active → resolved/canceled → cooldown`. **Teilnahme ist individuell und ausdrücklich:** Helfen eines Spielers schreibt keinen Zuschauer ein; Ablehnen sperrt dessen Beteiligung und lässt andere Helfer weiterspielen. Gegnerzustand und Ereignisausgang sind für alle Teilnehmer gemeinsam, Beitritt/Flucht/Abbruch und qualifizierte Belohnung individuell. Flucht oder Verbindungsverlust eines Spielers beendet die Begegnung anderer nicht. Ein Wiederbeitritt stellt die bisherige Teilnahme mit kurzer Sicherheitsphase wieder her, statt Gegner oder Auszahlung neu zu erzeugen.

Nur eingeschriebene Teilnehmer werden von Ereignisgegnern angegriffen. Nichtteilnehmer bleiben geschützt und können den Ort verlassen. Ohne aktive Teilnehmer löst eine serverseitige Frist das Ereignis ruhig auf; unerledigte Angebote/Blockaden besitzen ebenfalls eine Frist. Genau ein verbindlicher Ereignisabschluss und höchstens eine qualifizierte Auszahlung je eventId+Account; kein passives Zuschauer-Farming. Niederlage des Spielers ist im ersten Schnitt ein reversibler KO mit Rückkehr an einen vorhandenen validierten sicheren Straßenpunkt, ohne Besitz-/Coins-Verlust.

## 4. Zug und Kutschen

Zug ausschließlich auf dem belegten vorhandenen Gleiskorridor. Startentwurf: alle 20–35 aktiven Minuten eine Fahrt, ungefähr jede dritte mit 60–90 Sekunden Bahnhofshalt. Der Fahrplan ist eigene Spielgestaltung, kein behaupteter Originalfahrplan. Erste Version bietet Beobachten/Fahrplan/Gepäckangebote, noch keine neue Reiseregion.

Wenige NPC-Kutschen auf breiten bestätigten Wegen, nicht durch Boardwalk-Türen oder Treppen. Fahrer, Pferde und Wagen besitzen einen zusammengehörigen serverseitigen Zustand; der Spieler kann eine Begegnung sehen, ohne jedes Mal eine Mission zu erhalten.

Maximal ein Zug je Korridor, begrenzte Fahrzeuge; rechtzeitiges Signal und sichere Querungen. An Spielern bremsen/halten oder ausweichen, keine Spawn-Kollision und kein erzwungenes Überfahren. Bahnhofshalte/Ankunft können Umgebungsleben ergänzen, sollen aber keine Kette von Überfällen auslösen.

## 5. Eigenes Pferd und Stall

Empfohlen: ein gebundenes kostenloses Starterpferd einmal pro Account. Es kann nicht zum Farmen erneut erzeugt, verkauft oder verschenkt werden. Weitere Pferde werden regulär gekauft; genau eines ist als aktives Reitpferd draußen. Besitz, aktive Auswahl, Name, Rasse-/Körperprofil, Fell, Sattel/Zaum/Packtasche sowie Pflegezustand werden separat vom gerenderten Objekt gespeichert.

Rufablauf: prüfen → erreichbaren Pferde-/Stallpunkt bestimmen → Pferd über gültigen Weg annähern → in sicherem Abstand stoppen → F zum Aufsitzen. Ist der Weg blockiert oder das Pferd zu weit weg, erklärt die UI den Grund und bietet den Stall als Rückholort. Kein sichtbarer Teleport durch Häuser und kein Spawnen auf dem Spieler.

Aufsitzen nur bei ruhigem Pferd und erreichbarer Seite; Absitzen nur auf geprüftem Boden mit ausreichend Platz. Bei Geschwindigkeit zunächst abbremsen. Innenräume, Treppen und enge Übergänge erzwingen einen sicheren Halt/Absitzpunkt draußen. Wiederverbindung stellt eine gültige Kombination aus Spieler, Pferd und Besitzer wieder her, niemals doppelte Pferde.

Stallfenster: **Meine Pferde**, **Pferdemarkt**, **Ausrüstung**, **Pflege**. Drehbare echte Modelle und Größenvergleich am selben Maßstab. Bürste, Futter und Pflegeprodukte; Sattel/Zaum/Packtaschen. Kauf mit servergeprüftem Preis und Idempotenz. Pflege gibt kleine zeitlich begrenzte Vorteile; kein Verhungern, Tod oder Pflicht-Pflege durch Abwesenheit. Rennen/Rennpferde bleiben eigene H4R-78/79/105-Abnahmen.

## 6. Verbindlicher Steuerungsentwurf für die Umsetzung

Alle Belegungen werden benannten Aktionen und Kontexten zugeordnet, vollständig neu belegbar. Die folgende Tabelle ist eine **empfohlene neue Standardbelegung**; bestehende Funktionen werden erst nach Integration umgeschaltet.

| Eingabe | Zu Fuß, Waffe eingesteckt | Auf dem Pferd | Waffe bewusst gezogen |
| --- | --- | --- | --- |
| WASD | Bewegung | Reiten/Lenken | Bewegung, Figur richtet Oberkörper zur Zielrichtung aus |
| Linksklick | Bestehender Lauf-/Objektbefehl | Nur geeignete Außenrouten | Ein Schuss zur Fadenkreuzrichtung; kein Laufbefehl |
| F | Erreichbare Kontextaktion | Anhalten/sicher absitzen; beim stehenden eigenen Pferd aufsitzen | Kontextaktion nur nach sicherem Einstecken/Bestätigung |
| Shift | Bestehendes Rennen nur draußen | Schnellerer erlaubter Gang | Bewegung gemäß Außen-/Innenraumregel |
| H | Pferd rufen | Kein zweites Pferd erzeugen | Erst sicheren Kontext prüfen; kein Ruf während Schuss-/Nachladeaktion |
| X | Ausgewählte Waffe ziehen | Erste Version steckt Waffen vor dem Aufsitzen ein | Waffe einstecken |
| R | Keine Waffenaktion | Keine Waffenaktion im ersten Reit-Schnitt | Nachladen |
| B | Kleines Ausrüstungs-/Waffenrad öffnen/schließen | Dasselbe, inklusive Einstecken | Dasselbe; Feuer vollständig gesperrt |
| Q/E, rechter/mittlerer Drag | Bestehende Kameradrehung | Kamera | Kamera; Drag löst keinen Schuss aus |
| Kurzer Rechtsklick | Bestehendes Kontextmenü | Kontextmenü | Nur harmlose/erreichbare Kontextaktionen; kein zweiter Feuerpfad |
| Escape | Oberstes Modal schließen/zur Welt | Dasselbe | Menü/Abbruch; keine Weltaktion durchreichen |

Waffenrad zunächst höchstens sechs gut lesbare Plätze: unbewaffnet, primär, sekundär und belegte Werkzeugplätze. B als Toggle ist zugänglicher als Pflicht-Halten; optionales Halten nur als Einstellung. Ziffern1/2 können direkte Waffenplätze erhalten, nachdem Konflikte zentral geprüft wurden. Kein Zeitstopp für andere Spieler im Mehrspielerbetrieb.

UI, Chat, Anprobe, Sitz-/Minigame-Teilnahme und Ladezustand besitzen Input-Vorrang. Nach jedem Modal-/Kontextwechsel muss eine gehaltene Maustaste erst losgelassen werden, bevor ein Schuss möglich ist. Kaufen/Anprobieren zieht niemals automatisch eine Waffe.

## 7. Schießen, Munition und Treffer

Den Vorschlag des Benutzers übernehmen: kleines kontrastreiches Fadenkreuz am Mauszeiger auf dem Spielfeld, nur bei gezogener Waffe. Cursor über UI feuert nicht. Deckung/ungültige Richtung erkennbar anzeigen; keine Zielmarkierung durch Wände.

Für die 2,5D-Kamera zunächst ein stabiler Zielpunkt auf der aktiven Kampf-/Stockwerksebene in Waffenhöhe. Die Figur dreht zur resultierenden Welt-Richtung. Der eigentliche Trefferstrahl beginnt **an der Waffenmündung**, nicht an der Kamera; Wand/Terrain/Kollision beendet ihn vor einem NPC. Unbeladene oder andere Stockwerke sind keine gültigen Ziele. Kein Durchschießen, nur weil der Mauszeiger einen Gegner überdeckt.

Erster vertikaler Schnitt: ein Revolver, feste Schussfolge pro neuem Klick, Magazin/Reserve, Nachladen, Trefferfeedback und sichere Übung. Hitscan mit sichtbarem kosmetischem Tracer ist für diesen Schnitt einfacher und überprüfbarer als vollständige Ballistik. Server prüft Waffenbesitz, Equip-/UI-/Aktionszustand, Munition, Schussrate, Position, Richtung, Reichweite, Sichtlinie und Treffer. Client meldet Absicht, niemals selbst den Schaden.

**Schadensvertrag für den ersten Schnitt:** Nur Übungsziele und ausdrücklich feindliche, für den Spieler freigegebene Ereignisakteure sind schädigbar. Bürger, Händler, friedliche Tiere, eigene/fremde Pferde und unbeteiligte Spieler bleiben geschützt. Sie blockieren gegebenenfalls den Trefferstrahl, erleiden aber keinen Schaden; eine gültig abgefeuerte Patrone wird trotzdem verbraucht und der Schutz sichtbar erklärt. Händlerrollen verschwinden nicht dauerhaft. Spieler können durch zugelassene Ereignisgegner reversibel KO gehen; sichere Rückkehr und Besitzschutz gelten wie oben. Jagd/Beute und weitergehende Schadensarten werden erst in H4R-40 separat freigegeben.

H4R-42 bleibt führend: erst zu Fuß gegen Ziel/NPC und zwei Clients; anschließend weitere Waffen und begrenztes Dead Eye ohne globales Multiplayer-Zeitstoppen. Reitendes Schießen erst nach passenden Reit-/Zielanimationen und separater Bewegungsabnahme. Welt-PvP standardmäßig aus; ein NPC-Duell ist keine pauschale PvP-Freigabe.

## 8. Gebäude, Artikel und Anprobe

Die vollständige [Gebäude-Aktionsmatrix](Valentine-Gebaeudeaktionen-2026-10-31.md) deckt alle 37 vorhandenen Floor-Gebäude ab. Priorität: sitzen, reden, lesen/untersuchen, echte Händlerangebote; danach Hotel-/Post-/Pflege-/Reparaturhandlungen. Keine Pflicht-Beschäftigungsarbeit vor sozialen Spielen.

Der [Artikel-/Modellkatalog](Valentine-Artikel-und-Modelle-2026-10-31.md) definiert IDs, Bilder, Rig-/Equip-Kompatibilität und den Store-Anprobefluss. Vorschau und Besitz/Kauf sind strikt getrennt; keine frei erfundenen fertigen Modelle oder Preise.

## 9. Reihenfolge und Linear

| Etappe | Ergebnis / Abnahme | Führende Issues |
| --- | --- | --- |
| A | Kleiner visueller Vergleich Spieler–Barkeeper–Bürger–Pferd; Rig/Material/Animation und Kosten geprüft | [H4R-109](https://linear.app/h4real82/issue/H4R-109), bestehende H4R-97/49 |
| B | Grundaktionen und wenige glaubwürdige Bewohner/Tiere; Wege und Türen bleiben nutzbar | [H4R-112](https://linear.app/h4real82/issue/H4R-112), [H4R-110](https://linear.app/h4real82/issue/H4R-110), H4R-64/29/93 |
| C | Eigenes Pferd vollständig rufen/reiten/absitzen/stallen; Artikelkatalog und Anprobe in eigenem geprüften Schnitt | [H4R-113](https://linear.app/h4real82/issue/H4R-113), [H4R-114](https://linear.app/h4real82/issue/H4R-114), H4R-35/41/61/87 |
| D | Eine Weltwaffe, Munitionsablauf und Zwei-Client-Trefferprüfung; keine implizite PvP-Freigabe | bestehendes [H4R-42](https://linear.app/h4real82/issue/H4R-42), H4R-86/33 |
| E | Sichere Kutsche/Zugroute und genau ein seltenes Ereignis als Langzeitpilot | [H4R-115](https://linear.app/h4real82/issue/H4R-115), [H4R-111](https://linear.app/h4real82/issue/H4R-111) |

Keine Datumsversprechen vor Asset-/Navigationsprüfung. Bereits offene Karten-/Kamera-/Innenraumkriterien bleiben bestehen. Neue Umsetzungstickets starten im Backlog; die Fertigstellung dieses Plans beendet keines davon.

## 10. Prüfgates und Grenzen

- **Grafik:** gleiche Kamera und Beleuchtung, normaler Spielzoom plus Nahansicht; sinnvolle Körper-/Outfitvarianten, Hufe/Füße, Zügel und Waffenhaltung; echte drehbare Modelle, keine Bilder als 3D-Ersatz.
- **Navigation:** Stallruf, Stadt-/Innenraumwege, Tür-/Treppenverbindungen, sichere Querung und Absitzpunkte mit tatsächlichen Läufen prüfen.
- **Director:** mehrere virtuelle Stunden mit festem Seed; Minigame/Kauf/Anprobe/Reconnect, leere Welt, Raumwechsel und Serverneustart gezielt dazwischen; gleichzeitiges Helfen/Ablehnen/Fliehen prüfen, ein Ausgang, keine doppelte Belohnung, keine Cooldown-Farm oder Ereigniswelle.
- **Besitz/Handel:** doppelter Request, Ablehnung, Netzabbruch, volles Inventar, nicht passendes Outfit/Sattel und Reload; UI-Vorschau darf nichts abbuchen.
- **Kampf/Input:** UI-Klick, Rechtsdrag, gehaltene Taste beim Menüwechsel, falscher Floor, Wand vor Mündung, leeres Magazin, gleichzeitige Aktionen und zwei Clients.
- **Ressourcen:** begrenzte aktive Actor-/Animatormenge, gecachte gemeinsame Assets mit eigenen Skeletten; geteilte Geometrien/Texturen nicht pro Instanz zerstören. Nach Entfernen keine Timer-/Listener-/GPU-Lecks.
- Jeder tatsächliche Änderungsbatch endet mit `npx pnpm -r build`; grün allein ist keine visuelle oder Mehrspieler-Abnahme. Fehlende Server-/Persistenzfähigkeit wird sichtbar ausgewiesen, nicht durch lokale Browserwerte ersetzt.

## Verwendete GameDev-Grundlagen

Game Studio/Web Game Foundations: Three.js/TypeScript beibehalten, Simulation/Rendering/DOM trennen. Game AI: FSM, Pfad/Steering und gedrosselte Planung. Input Systems: zentrale Aktionen, Kontexte, Rebinding und Flanken. Game UI/UX: Fokus-/Modalstack und responsive Anprobe. Three.js GLTF/Materials: echte Skins/Clips, PBR und gleicher Lichtvergleich. Economy Loop: eindeutige Teilnahme-/Kauf-/Abbruchzustände. WebGL-Performance: messen, Assets teilen und Ressourcen geordnet freigeben. Dies sind Entwurfsgrundlagen, keine Abnahme der geplanten Funktionen.
