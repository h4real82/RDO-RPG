import json

with open('data/raw/rdomap/fasttravels.json', 'r', encoding='utf-8') as f:
    fts = json.load(f)
with open('apps/client/src/world/data/elevationSamples.json', 'r', encoding='utf-8') as f:
    elevs = json.load(f)

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

result = []
for ft in fts:
    lat = ft['x']
    lng = ft['y']
    gx, gy = leaflet_to_game(lat, lng)
    elev = get_elevation(gx, gy)
    name = ft['text'].replace('fasttravel.', '').replace('_', ' ').title()
    result.append({
        'id': ft['text'],
        'name': name,
        'game_x': round(gx, 2),
        'game_y': round(gy, 2),
        'elevation': round(elev, 2),
        'three_pos': [round(gx, 2), round(elev, 2), round(gy, 2)]
    })
    print(f"{name}: GameX={gx:.1f}, GameY={gy:.1f}, Elev={elev:.1f}")

with open('apps/client/src/world/data/fastTravelPoints.json', 'w', encoding='utf-8') as out:
    json.dump(result, out, indent=2)
print("Saved fastTravelPoints.json successfully.")
