import fs from 'node:fs';

const apiKey = process.env.LINEAR_API_KEY || (fs.existsSync('.linear_key') ? fs.readFileSync('.linear_key', 'utf8').trim() : null);
if (!apiKey) {
  console.error('LINEAR_API_KEY is required');
  process.exit(1);
}

const IN_REVIEW_ID = '9e06e6b6-3303-43e3-aed8-e966464ee2de';

async function queryLinear(query, variables = {}) {
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey
    },
    body: JSON.stringify({ query, variables })
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  const json = await response.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

async function updateIssue(identifier, stateId, comment) {
  console.log(`Updating ${identifier}...`);
  // 1. Get issue ID
  const searchRes = await queryLinear(`
    query($id: String!) {
      issue(id: $id) {
        id
        identifier
        title
      }
    }
  `, { id: identifier });

  const issue = searchRes.issue;
  if (!issue) {
    console.warn(`Issue ${identifier} not found.`);
    return;
  }

  // 2. Update state
  await queryLinear(`
    mutation($id: String!, $stateId: String!) {
      issueUpdate(id: $id, input: { stateId: $stateId }) {
        success
      }
    }
  `, { id: issue.id, stateId });

  // 3. Add comment
  await queryLinear(`
    mutation($issueId: String!, $body: String!) {
      commentCreate(input: { issueId: $issueId, body: $body }) {
        success
      }
    }
  `, { issueId: issue.id, body: comment });

  console.log(`✓ ${identifier} updated to In Review with comment.`);
}

async function main() {
  await updateIssue(
    'H4R-129',
    IN_REVIEW_ID,
    `### ✅ Implementierungs-Fortschritt H4R-129 (NPC-Rollenregister)
- [x] **Rollenregister für Town-NPCs integriert:**
  - **Sheriff Curtis Malloy** (\`val-03-jail-ext\`): Vollständiges Büro mit Steckbriefwand (Jack Dalton, Barnaby Finch) und Aufklärung zum Waffenverbot in Valentine.
  - **Reverend Swanson** (\`church\`): Geistlicher Segen mit Vitalitätserneuerung (\`ScreenEffects.applyInvincibleEffect\`) und Friedhofshistorie.
  - **Dr. Barnes** (\`doctor\`): Wundversorgung (-5 Coins) mit 100% Vitalitätsregeneration und Verkauf patentierter Wundertinkturen.
  - **Büchsenmacher Arthur** (\`gunsmith\`): Munitionsnachfüllung (.45 Colt, -4 Coins), Waffen-Katalog (Cattleman, Schofield, Winchester 1873) und Schießstand-Zugang.
- [x] **Vitest-Tests:** \`TownNpcs.test.ts\` (4 Tests erfolgreich).
- [x] **Build:** Clean monorepo build (Exit 0).`
  );

  await updateIssue(
    'H4R-128',
    IN_REVIEW_ID,
    `### ✅ Implementierungs-Fortschritt H4R-128 (Friedhof & Secret Spots)
- [x] **Friedhofs-Kuration & Grabsteininschriften:**
  - 5 historische Grabsteine an der Valentine Kirche mit authentischen Inschriften und Hintergrund (Jedediah „Lucky“ Finch, Clara Mae Higgins, Unbekannter Reisender, Silas Thorne, Constance Adams).
- [x] **Interaktive Secret Spots mit Belohnungssystem:**
  - Geheimversteck hinter Smithfields Saloon (+15 Coins).
  - Wasserturm-Aussichtspunkt (+5 Coins).
  - Verlassenes Schwarzbrenner-Fass am Waldrand (+10 Coins).
- [x] **Vitest-Tests:** \`CemeteryModal.test.ts\` (2 Tests erfolgreich).
- [x] **Build:** Clean monorepo build (Exit 0).`
  );

  await updateIssue(
    'H4R-130',
    IN_REVIEW_ID,
    `### ✅ Implementierungs-Fortschritt H4R-130 (Schießmechanik & Schießstand)
- [x] **Western-Schießmechanik & Schießstand:**
  - Zielübungsanlage hinter dem Büchsenmacher (\`ShootingRangeModal.ts\`).
  - 6-Schuss-Cattleman-Revolver (Colt Single Action Army 1873) mit realistischer Zylinder-Munitionsverwaltung (6/6).
  - 5 Ziele (Whiskeyflaschen, Holz-Zielscheibe, Schnapsglas, Klappscheibe) mit Trefferfeedback, Trefferratenberechnung und Punkten.
  - Zylindernachladen mit Taste \`R\` oder Button.
  - 10-Coins-Gewinnprämie bei vollständigem Abräumen aller Ziele.
- [x] **Vitest-Tests:** \`ShootingRangeModal.test.ts\` (2 Tests erfolgreich).
- [x] **Build:** Clean monorepo build (Exit 0).`
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
