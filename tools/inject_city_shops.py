import json

with open('data/raw/rdomap/shops.json', 'r', encoding='utf-8') as f:
    shops = json.load(f)
with open('apps/client/src/world/data/elevationSamples.json', 'r', encoding='utf-8') as f:
    elevs = json.load(f)
with open('apps/client/src/world/data/worldData.json', 'r', encoding='utf-8') as f:
    wd = json.load(f)

CRS_SCALE = 0.01552
CRS_LAT_OFFSET = -63.6
CRS_LNG_OFFSET = 111.29

def leaflet_to_game(lat, lng):
    gx = (lng - CRS_LNG_OFFSET) / CRS_SCALE
    gy = (lat - CRS_LAT_OFFSET) / CRS_SCALE
    return gx, gy

def get_elevation(gx, gy):
    dists = [((s['x'] - gx)**2 + (s['y'] - gy)**2, s['z']) for s in elevs]
    dists.sort(key=lambda x: x[0])
    k = dists[:5]
    if k[0][0] < 1.0:
        return k[0][1]
    w_sum = sum(1.0 / max(d, 1.0) for d, z in k)
    return sum(z / max(d, 1.0) for d, z in k) / w_sum

existing_ids = {o['id'] for o in wd['objects']}
added = 0
for cat in shops:
    key = cat.get('key', '')
    for loc in cat.get('locations', []):
        lat = float(loc.get('x', 0.0))
        lng = float(loc.get('y', 0.0))
        gx, gy = leaflet_to_game(lat, lng)
        gz = get_elevation(gx, gy)
        obj_text = loc.get('text', key)
        obj_id = f"shop_{obj_text}_{round(gx)}_{round(gy)}"
        if obj_id in existing_ids:
            continue
        
        obj_type = 'building'
        mat = 'weathered_wood'
        bounds = [16.0, 22.0, 8.5]
        name = obj_text.replace('shop_', '').replace('_', ' ').title()
        
        if 'saloon' in key:
            obj_type = 'saloon'
            bounds = [20.0, 28.0, 9.0]
        elif 'post' in key or 'station' in key:
            obj_type = 'station'
            bounds = [18.0, 26.0, 8.0]
        elif 'gunsmith' in key or 'general' in key:
            bounds = [16.0, 22.0, 8.5]
            
        zone = 'general_frontier'
        if 'sdn' in obj_text:
            zone = 'saint_denis'
            mat = 'brick'
            bounds = [22.0, 30.0, 11.0]
        elif 'blk' in obj_text:
            zone = 'blackwater'
            mat = 'brick'
            bounds = [20.0, 26.0, 10.0]
        elif 'rho' in obj_text:
            zone = 'rhodes'
            mat = 'weathered_wood'
        elif 'val' in obj_text:
            zone = 'valentine'
            
        wd['objects'].append({
            'id': obj_id,
            'name': name,
            'type': obj_type,
            'primary_material': mat,
            'position': [round(gx, 2), round(gz, 2), round(gy, 2)],
            'bounds': bounds,
            'orientation_deg': 0.0,
            'orientation_rad': 0.0,
            'zone': zone,
            'sources': ['data/raw/rdomap/shops.json']
        })
        existing_ids.add(obj_id)
        added += 1

wd['total_objects'] = len(wd['objects'])

with open('apps/client/src/world/data/worldData.json', 'w', encoding='utf-8') as f:
    json.dump(wd, f, indent=2)

with open('apps/client/src/world/data/rdo_world_manifest.json', 'r', encoding='utf-8') as f:
    mf = json.load(f)
mf['world_objects'] = wd['objects']
with open('apps/client/src/world/data/rdo_world_manifest.json', 'w', encoding='utf-8') as f:
    json.dump(mf, f, indent=2)

print(f"Added {added} validated shop buildings across Saint Denis, Blackwater, Rhodes etc.")
print(f"Total worldData objects: {len(wd['objects'])}")
