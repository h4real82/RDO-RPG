import { VenueDialog, text } from './VenueDialog';
import { WalletService, formatCoins } from '../economy/WalletService';

export type DrinkCategory = 'Bier' | 'Wiskey' | 'Likör' | 'Schnaps' | 'Special';

export interface SaloonDrink {
  id: string;
  name: string;
  category: DrinkCategory;
  price: number;
  flavor: string;
  effect: string;
}

export const SALOON_DRINKS: readonly SaloonDrink[] = [
  // Bier (5)
  {
    id: 'luebzer-pils',
    name: 'Lübzer Pils',
    category: 'Bier',
    price: 5,
    flavor: 'Ein kühles, feinherbes Pilsener aus dem Norden. Frisch vom Fass gezapft!',
    effect: 'Erfrischt die Kehle und belebt den Geist.'
  },
  {
    id: 'wikueler-pils',
    name: 'Wiküler Pils',
    category: 'Bier',
    price: 5,
    flavor: 'Ein ehrliches, herbes Arbeiter-Pils. Kräftiger Schluck für staubige Kehlen.',
    effect: 'Löscht den rauen Präriedurst zuverlässig.'
  },
  {
    id: 'heineken-export',
    name: 'Heineken Export',
    category: 'Bier',
    price: 6,
    flavor: 'Ein helles Export-Lager in der markanten grünen Flasche. Leicht malzig und süffig.',
    effect: 'Verleiht einen Hauch kontinentaler Gelassenheit.'
  },
  {
    id: 'paulaner-weissbier',
    name: 'Paulaner Weissbier',
    category: 'Bier',
    price: 6,
    flavor: 'Ein bernsteinfarbenes Münchner Weissbier mit feiner Hefe und schneeweißer Krone.',
    effect: 'Macht wohlig satt und hebt die Laune.'
  },
  {
    id: 'paulaner-hefe-bier',
    name: 'Paulaner Hefe-Bier',
    category: 'Bier',
    price: 6,
    flavor: 'Ein traditionelles naturtrübes Hefebier mit feinen Frucht- und Gewürznoten.',
    effect: 'Spendet frische Energie für lange Saloon-Nächte.'
  },

  // Wiskey (2)
  {
    id: 'jack-daniels',
    name: 'Jack Daniels',
    category: 'Wiskey',
    price: 12,
    flavor: 'Old No. 7 Tennessee Whiskey, tropfenweise durch Ahornholzkohle gefiltert mit rauchig-süßem Eichenfinish.',
    effect: 'Wärmt die Brust mit feuriger Entschlossenheit.'
  },
  {
    id: 'jim-beam',
    name: 'Jim Beam',
    category: 'Wiskey',
    price: 10,
    flavor: 'Klassischer Kentucky Straight Bourbon aus ausgebrannten Weißeichenfässern mit feiner Vanillenote.',
    effect: 'Stärkt die Nerven für das nächste Pokerspiel.'
  },

  // Likör (3)
  {
    id: 'jaegermeister',
    name: 'Jägermeister',
    category: 'Likör',
    price: 10,
    flavor: 'Legendärer Kräuterlikör aus 56 Kräutern, Blüten und Wurzeln. Eiskalt serviert!',
    effect: 'Fährt wie ein Blitz durch die Glieder und schärft alle Sinne.'
  },
  {
    id: 'tunel',
    name: 'Túnel',
    category: 'Likör',
    price: 11,
    flavor: 'Traditioneller mallorquinischer Hierbas-Kräuterlikör mit aromatischem Anis und mediterranen Wildkräutern.',
    effect: 'Hinterlässt einen samtigen, süß-würzigen Nachklang.'
  },
  {
    id: 'eskoreal',
    name: 'Eskoreal',
    category: 'Likör',
    price: 12,
    flavor: 'Der legendäre hochprozentige grün-gelbe Kräuterelixier-Klassiker. Scharf, feurig und intensiv!',
    effect: 'Lässt den Saloon für einen Moment erstrahlen.'
  },

  // Schnaps (5)
  {
    id: 'williams',
    name: 'Williams',
    category: 'Schnaps',
    price: 8,
    flavor: 'Edler Williams-Christ-Birnenbrand mit vollem, sonnengereiftem Fruchtaroma.',
    effect: 'Ein feiner Genuss, mild und fruchtig im Abgang.'
  },
  {
    id: 'kirsch',
    name: 'Kirsch',
    category: 'Schnaps',
    price: 8,
    flavor: 'Kristallklares Kirschwasser aus vollreifen Sauerkirschen. Trocken, rein und feurig.',
    effect: 'Brennt kurz und reinigt den Gaumen.'
  },
  {
    id: 'marille',
    name: 'Marille',
    category: 'Schnaps',
    price: 9,
    flavor: 'Feiner österreichischer Marillenbrand. Samtig-weich mit intensiver Fruchtsüße.',
    effect: 'Balsam für raue Outlaw-Seelen.'
  },
  {
    id: 'uralte-marille',
    name: 'Uralte Marille',
    category: 'Schnaps',
    price: 15,
    flavor: 'Im Eichenfass meisterhaft veredelte Edel-Marille. Bernsteingolden, opulent und unvergleichlich tief!',
    effect: 'Höchster Genuss – du fühlst dich unbesiegbar.'
  },
  {
    id: 'obstler',
    name: 'Obstler',
    category: 'Schnaps',
    price: 7,
    flavor: 'Rustikaler Apfel-Birnen-Brand aus bäuerlicher Brennerei. Ehrlich, kernig und schnörkellos.',
    effect: 'Verleiht eiserne Standfestigkeit.'
  },

  // Special-Drinks (3)
  {
    id: 'meskal-mit-wurm',
    name: 'Meskal mit Wurm (Haluzinierend)',
    category: 'Special',
    price: 18,
    flavor: 'Echtes rauchiges Agavendestillat mit eingelegter Maguey-Raupe im Glas. Ein feuriger Schluck mexikanischer Legende!',
    effect: 'Haluzinierend – die Farben des Saloons beginnen zu flimmern und Geräusche hallen durch den Raum.'
  },
  {
    id: 'absinth-wehrmut',
    name: 'Absinth mit viel Wehrmut',
    category: 'Special',
    price: 20,
    flavor: 'Die sagenumwobene Grüne Fee mit besonders hohem Wermutkraut-Gehalt. Tiefbitter, smaragdgrün und hochgradig berauschend.',
    effect: 'Schärft den Geist mit wilder Inspiration und lässt die Realität leicht verschwimmen.'
  },
  {
    id: 'bleichmittel-baumarkt',
    name: 'Bleichmittel aus dem Baumarkt',
    category: 'Special',
    price: 2,
    flavor: 'Industrielle Chlorbleiche direkt aus der rostigen Blechkanne. Ätzend, chemisch und absolut nicht zum Verzehr geeignet!',
    effect: 'Brennt wie die Hölle, desinfiziert den Magen und hinterlässt pures Entsetzen.'
  }
];

export function findDrink(idOrName: string): SaloonDrink | undefined {
  const query = idOrName.toLowerCase().trim();
  return SALOON_DRINKS.find(
    (d) => d.id === query || d.name.toLowerCase() === query
  );
}

export function filterDrinks(category?: DrinkCategory | 'Alle'): readonly SaloonDrink[] {
  if (!category || category === 'Alle') return SALOON_DRINKS;
  return SALOON_DRINKS.filter((d) => d.category === category);
}

export async function purchaseDrink(drinkId: string): Promise<{
  success: boolean;
  message: string;
  effect?: string;
  newBalance: bigint;
  drink?: SaloonDrink;
}> {
  const drink = findDrink(drinkId);
  if (!drink) {
    return {
      success: false,
      message: 'Dieses Getränk steht nicht auf unserer Barkarte.',
      newBalance: WalletService.getSyncBalance()
    };
  }

  const currentBalance = WalletService.getSyncBalance();
  if (currentBalance < BigInt(drink.price)) {
    return {
      success: false,
      message: `Nicht genügend Coins! Du hast ${formatCoins(currentBalance)} Coins, aber ${drink.name} kostet ${drink.price} Coins.`,
      newBalance: currentBalance,
      drink
    };
  }

  const reserved = await WalletService.reserveBet(drink.price);
  if (!reserved) {
    return {
      success: false,
      message: 'Abbuchung fehlgeschlagen. Kontostand prüfen.',
      newBalance: WalletService.getSyncBalance(),
      drink
    };
  }

  const newBalance = WalletService.getSyncBalance();
  return {
    success: true,
    message: `Der Barkeeper schenkt dir ${drink.name} ein (-${drink.price} Coins). ${drink.flavor} Zum Wohl!`,
    effect: drink.effect,
    newBalance,
    drink
  };
}

export class SaloonBar {
  private activeCategory: DrinkCategory | 'Alle' = 'Alle';

  constructor(private changed: () => void = () => {}) {}

  open(parent: HTMLElement): VenueDialog {
    const dialog = new VenueDialog(parent, 'Smithfield’s Bar');
    dialog.panel.dataset.venue = 'drinks';

    const render = () => {
      dialog.content.replaceChildren();

      const currentBalance = WalletService.getSyncBalance();

      const headerBox = document.createElement('div');
      headerBox.className = 'rdo-venue__bar-header';
      dialog.content.append(headerBox);

      const balPill = text('div', `💰 Dein Guthaben: ${formatCoins(currentBalance)} Coins`, headerBox);
      balPill.className = 'rdo-venue__balance-pill';

      text(
        'p',
        'Willkommen am Tresen von Smithfield’s Saloon! Hier gibt es echte Western-Klassiker und die Spezialitäten des Hauses.',
        headerBox
      );

      const catRow = document.createElement('div');
      catRow.className = 'rdo-venue__categories';
      headerBox.append(catRow);

      const categories: (DrinkCategory | 'Alle')[] = ['Alle', 'Bier', 'Wiskey', 'Likör', 'Schnaps', 'Special'];
      for (const cat of categories) {
        const count = cat === 'Alle' ? SALOON_DRINKS.length : SALOON_DRINKS.filter((d) => d.category === cat).length;
        const btn = dialog.button(`${cat} (${count})`, () => {
          this.activeCategory = cat;
          render();
        }, catRow);
        if (this.activeCategory === cat) {
          btn.classList.add('rdo-venue__category--active');
        }
      }

      const list = document.createElement('div');
      list.className = 'rdo-venue__drinks-list';
      dialog.content.append(list);

      const displayed = filterDrinks(this.activeCategory);
      for (const drink of displayed) {
        const card = document.createElement('div');
        card.className = 'rdo-venue__drink-card';
        list.append(card);

        const cardHeader = document.createElement('div');
        cardHeader.className = 'rdo-venue__drink-header';
        card.append(cardHeader);

        const title = text('strong', drink.name, cardHeader);
        title.className = 'rdo-venue__drink-title';

        const tag = text('span', drink.category, cardHeader);
        tag.className = 'rdo-venue__drink-tag';

        const price = text('span', `💰 ${drink.price} Coins`, cardHeader);
        price.className = 'rdo-venue__drink-price';

        const desc = text('p', drink.flavor, card);
        desc.className = 'rdo-venue__drink-desc';

        const effect = text('small', `⚡ Wirkung: ${drink.effect}`, card);
        effect.className = 'rdo-venue__drink-effect';

        const canAfford = currentBalance >= BigInt(drink.price);
        const orderBtn = dialog.button(
          canAfford ? `Bestellen (${drink.price} Coins)` : `Zu wenig Coins (${drink.price})`,
          async () => {
            const res = await purchaseDrink(drink.id);
            if (res.success) {
              this.changed();
              dialog.status.textContent = `${res.message} [Wirkung: ${res.effect}]`;
              render();
            } else {
              dialog.status.textContent = res.message;
            }
          },
          card
        );
        orderBtn.disabled = !canAfford;
        orderBtn.className = 'rdo-venue__order-btn';
      }
    };

    render();
    return dialog;
  }

  dispose() {}
}
