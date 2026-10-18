-- ============================================================
-- RDO-RPG: Gameplay-Seed – NPCs, Dialog-Graphen, Quests
-- Quelle: BLUEPRINT §7.1 (sheriff.json), §7.2 (coyote_cull), NPCs MOC
-- ============================================================

-- Sheriff Malloy (Lawmen, stationiert am Sheriff's Office)
insert into npcs (name,faction,role,poi_id,hp,is_merchant) values
 ('Curtis Malloy','lawmen','Sheriff','sheriff_office',150,false)
on conflict do nothing;

-- Deterministischer Dialog-Graph für Sheriff Malloy (BLUEPRINT §7.1 sheriff.json)
with sheriff as (select id from npcs where name = 'Curtis Malloy' limit 1)
insert into dialogs (name,start_node,nodes) values
 ('sheriff_malloy','welcome',
  '{
    "welcome": {
      "text": "Seid gegrüßt. Haltet euch an das Gesetz in Valentine, sonst landet ihr hinter Gittern.",
      "choices": [
        {"text": "Gibt es Arbeit für einen Revolverhelden?", "next": "bounty_info"},
        {"text": "Ich will mein Kopfgeld bezahlen.", "next": "pay_bounty", "if": {"hasBounty": true}},
        {"text": "Schönen Tag noch, Sheriff.", "next": null}
      ]
    },
    "bounty_info": {
      "text": "Draußen an der Wand hängt der Steckbrief für die O''Driscoll-Räuber. Bringt sie zur Strecke.",
      "effects": [{"unlockQuest": "coyote_cull"}],
      "next": null
    },
    "pay_bounty": {
      "text": "Das Kopfgeld kannste auch hier amtlich begleichen. Alles andere weise ich zurück.",
      "effects": [{"action": "pay_bounty"}],
      "next": null
    }
  }'::jsonb)
on conflict do nothing;

-- Dialog mit NPC verknüpfen
update npcs n
set dialog_id = d.id
from dialogs d
where d.name = 'sheriff_malloy' and n.name = 'Curtis Malloy' and n.dialog_id is null;

-- Quest: Kojotenplage (BLUEPRINT §7.2 coyote_cull)
with sheriff as (select id from npcs where name = 'Curtis Malloy' limit 1)
insert into quests (id,title,description,act,giver_npc_id,steps,reward_cash,reward_gold,reward_honor,reward_exp,min_level) values
 ('coyote_cull','Kojotenplage im Umland','Erlege 5 Kojoten im Osten von Valentine und bringe Sheriff Malloy die Felle.',
  'Akt 1',(select id from sheriff),
  '{
    "hunt": {"desc": "Erlege 5 Kojoten im Osten von Valentine.", "target": 5},
    "return": {"desc": "Bringe die Felle zu Sheriff Malloy."}
  }'::jsonb,
  30,0,10,150,1)
on conflict (id) do update set
  title = excluded.title, reward_cash = excluded.reward_cash,
  reward_honor = excluded.reward_honor, reward_exp = excluded.reward_exp;

-- Quest: O'Driscoll-Kopfgeld (Bounty) zur Verprobung des Kopfgeld-Systems
insert into quests (id,title,description,act,steps,reward_cash,reward_gold,reward_honor,reward_exp,min_level,is_repeatable) values
 ('odriscoll_bounty','Steckbrief: O''Driscoll Boys','Fange den gesuchten O''Driscoll-Revolverhelden. Lebend abgeliefert gibt es das volle Kopfgeld.',
  'Kopfgeldjagden',
  '{"track": {"desc": "Finde das O''Driscoll-Lager östlich von Valentine.", "target": 1},
   "capture": {"desc": "Fessle den Gesuchten mit dem Lasso.", "target": 1},
   "deliver": {"desc": "Liefere ihn beim Sheriff ab.", "target": 1}}'::jsonb,
  75,2,20,220,3,true)
on conflict (id) do nothing;
