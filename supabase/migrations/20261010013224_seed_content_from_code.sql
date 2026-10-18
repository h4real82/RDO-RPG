-- ============================================================
-- RDO-RPG: Seed-Daten aus dem bestehenden Code
-- Quelle: packages/content/data/{items,pois}.json,
--         shared/constants.ts (VALENTINE_OBSTACLES),
--         Obsidian GameSystems (Hunting, Honor & Bounty)
-- Idempotent via ON CONFLICT DO NOTHING/UPDATE
-- ============================================================

-- ---- ITEMS (aus items.json) ----
insert into items (id,name,description,type,icon,stackable,max_stack,effect_heal_hp,effect_heal_mp,effect_attack_bonus,effect_defense_bonus,base_price) values
 ('potion_red','Red Potion','Restores 50 HP','consumable','potion_red',true,99,50,0,0,0,15),
 ('potion_blue','Blue Potion','Restores 30 MP','consumable','potion_blue',true,99,0,30,0,0,12),
 ('wooden_sword','Wooden Sword','A basic training sword','equipment','sword_wood',false,1,0,0,5,0,25),
 ('leather_shield','Leather Shield','Simple shield made of cured hide','equipment','shield_leather',false,1,0,0,0,3,20),
 ('health_tonic','Wound Tonic','Doctor-Grades Wundtonik zur Regeneration','consumable','tonic',true,10,35,0,0,0,30),
 ('repeater_ammo','Repeater Ammo Box','Munitionskiste für Repetiergewehre','material','ammo_box',true,60,0,0,0,0,18),
 ('throwing_knife','Throwing Knife','Hehlerware für niedrige Ehre','weapon','knife',false,5,0,0,12,0,45)
on conflict (id) do update set
  name = excluded.name, description = excluded.description, type = excluded.type,
  base_price = excluded.base_price, effect_heal_hp = excluded.effect_heal_hp,
  effect_heal_mp = excluded.effect_heal_mp, effect_attack_bonus = excluded.effect_attack_bonus,
  effect_defense_bonus = excluded.effect_defense_bonus;

-- ---- POIS (aus pois.json, Ground-Truth Koordinaten) ----
insert into pois (id,name,category,pos_x,pos_y,radius,prompt_text,icon,description) values
 ('saloon_smithfields','Smithfield''s Saloon','saloon',-308.0,808.0,14.0,'Saloon betreten & Drinks bestellen','🍺','Der geschäftigste Saloon in den Heartlands.'),
 ('general_store','Valentine General Store','store',-328.0,846.0,13.0,'Gemischtwaren & Vorräte kaufen','🛒','Gemischtwarenladen mit Dosenbohnen, Schlangenöl und Jagdbedarf.'),
 ('doctor_office','Valentine Doctor & Apotheke','doctor',-288.0,826.0,13.0,'Arzt & Apotheke betreten','🩺','Praxis von Dr. Barnes. Wundtonika und Schlangenöl.'),
 ('gunsmith_valentine','Valentine Gunsmith','gunsmith',-268.0,786.0,13.0,'Büchsenmacher betreten & Waffen kaufen','🔫','Waffenladen und Büchsenmacherwerkstatt.'),
 ('hotel_saints','Valentine Saints Hotel & Bank','hotel',-298.0,846.0,14.0,'Hotel betreten & Zimmer mieten','🏨','Das zweistöckige Saints Hotel mit Veranda.'),
 ('sheriff_office','Sheriff''s Office & Steckbrief-Tafel','sheriff',-278.0,808.0,13.0,'Steckbrief-Tafel ansehen','⭐','Amtsstube von Sheriff Malloy mit Backsteingefängnis.'),
 ('livery_stable','Valentine Livery & Auction Barn','stable',-360.0,720.0,18.0,'Pferdestall & Auktionshalle betreten','🐴','Große Viehauktionshalle mit Pferdeboxen.'),
 ('train_station','Valentine Train Station & Depot','station',-180.8,626.5,18.0,'Fahrkarten & Telegrafenamt','🚂','Bahnhof der Cornwall K. & P. Railroad mit Wasserturm.'),
 ('gallows_valentine','Valentine Galgen','sheriff',-315.6,731.0,11.0,'Galgen untersuchen','⚖️','Der historische Richtplatz von Valentine.'),
 ('valentine_church','Valentine Church & Friedhof','church',-340.0,920.0,18.0,'Kirche betreten & Andacht halten','⛪','Die weiße Holzkirche auf dem Hügel von Valentine.'),
 ('travel_west','Kutsche: West Elizabeth & Strawberry','travel',-350.0,880.0,15.0,'Reise nach Strawberry & West Elizabeth','🐎','Kutschenstation Richtung Dakota River.'),
 ('travel_east','Kutsche: Emerald Ranch & Lemoyne','travel',-170.0,610.0,15.0,'Reise zur Emerald Ranch & Rhodes','🗺️','Poststraße durch die Heartlands.')
on conflict (id) do update set
  name = excluded.name, pos_x = excluded.pos_x, pos_y = excluded.pos_y,
  radius = excluded.radius, prompt_text = excluded.prompt_text, description = excluded.description;

-- ---- WORLD OBSTACLES (aus VALENTINE_OBSTACLES in constants.ts) ----
insert into world_obstacles (id,name,min_x,min_y,width,depth,height) values
 ('church_main','Valentine Church Nave',580,100,140,100,8.5),
 ('church_transept','Valentine Church Transept',550,130,200,50,7.5),
 ('church_tower','Valentine Church Bell Tower',625,180,50,50,16.0),
 ('cemetery_fence_n','Cemetery North Fence',740,90,150,8,1.4),
 ('cemetery_fence_e','Cemetery East Fence',885,90,8,130,1.4),
 ('cemetery_fence_s','Cemetery South Fence',740,215,150,8,1.4),
 ('saloon','Smithfield''s Saloon',240,310,180,120,8.5),
 ('general_store','Valentine General Store',440,320,130,110,7.5),
 ('doctor_drugs','Doctor & Apothecary (DRUGS)',590,320,120,110,7.5),
 ('sheriff_office','Sheriff''s Office & Jail',730,320,140,110,6.8),
 ('bank','Valentine Bank',890,320,120,110,7.0),
 ('gunsmith','Valentine Gunsmith & Blacksmith',1030,330,120,100,6.5),
 ('baustelle','House Under Construction',430,530,120,80,5.5),
 ('south_commercial','South Commercial Building',620,540,130,100,6.5),
 ('south_hotel','South Hotel / Boarding House',770,540,130,100,7.0),
 ('livery_stable','Valentine Livery & Auction Barn',420,680,220,150,9.5),
 ('livery_water_tank','Livery Wooden Water Tank',395,730,30,30,4.5),
 ('corral_paddock_1','Livestock Paddock 1',660,680,130,120,1.6),
 ('corral_paddock_2','Livestock Paddock 2',795,680,130,120,1.6),
 ('train_station','Valentine Train Station House',1160,740,160,90,7.0),
 ('station_water_tower','Railroad Locomotive Water Tower',1340,750,60,60,11.0),
 ('hitching_post_saloon','Saloon Hitching Post',310,435,50,6,1.2),
 ('hitching_post_store','Store Hitching Post',490,435,50,6,1.2),
 ('hitching_post_doctor','Doctor Hitching Post',640,435,50,6,1.2),
 ('hitching_post_sheriff','Sheriff Hitching Post',790,435,50,6,1.2)
on conflict (id) do update set
  name = excluded.name, min_x = excluded.min_x, min_y = excluded.min_y,
  width = excluded.width, depth = excluded.depth, height = excluded.height;

-- ---- HUNTING SPECIES (aus Hunting & Ecosystem Dok) ----
insert into hunting_species (id,name,size_class,required_weapon,base_price,flee_radius,region) values
 ('rabbit','P rabbit','varmint','varmint_rifle',3,40,'new_hanover'),
 ('squirrel','Gray Squirrel','varmint','varmint_rifle',2,40,'new_hanover'),
 ('coyote','Coyote','medium','repeater',8,40,'new_hanover'),
 ('fox','Red Fox','medium','bow',9,40,'new_hanover'),
 ('deer','Whitetail Deer','large','rifle',15,40,'new_hanover'),
 ('bison','Bison','large','bolt_action',22,40,'new_hanover'),
 ('bear','Black Bear','large','rifle',28,40,'new_hanover')
on conflict (id) do update set
  name = excluded.name, base_price = excluded.base_price,
  required_weapon = excluded.required_weapon;
