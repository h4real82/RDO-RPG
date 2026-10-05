#!/usr/bin/env python3
"""
tools/parse_valentine_map.py
Deterministic Map Parsing & Integration Pipeline
Extracts road spline and building bounding boxes from 'Media/Valentine Detailed MAP.png'
Saves:
  - apps/client/src/world/data/valentineLayout.json
  - Media/map_extraction_debug.png
"""

import sys
import os
import json
import math

try:
    from PIL import Image, ImageDraw
except ImportError:
    os.system(f"{sys.executable} -m pip install Pillow")
    from PIL import Image, ImageDraw

try:
    import numpy as np
    import cv2
except ImportError:
    os.system(f"{sys.executable} -m pip install numpy opencv-python")
    import numpy as np
    import cv2

def find_map_file():
    candidates = [
        "Media/Valentine Detailed MAP.png",
        "Media/Valentine detailed map.png",
        "../Media/Valentine Detailed MAP.png",
        "../Media/Valentine detailed map.png"
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    raise FileNotFoundError("Could not find 'Valentine Detailed MAP.png' in Media directory.")

def main():
    map_path = find_map_file()
    print(f"[parse_valentine_map] Loading map: {map_path}")
    
    img_bgr = cv2.imread(map_path)
    if img_bgr is None:
        raise ValueError(f"Failed to load image from {map_path}")
    
    H, W, _ = img_bgr.shape
    cx = W / 2.0
    cy = H / 2.0
    print(f"[parse_valentine_map] Image Dimensions: W={W}, H={H}, Center=({cx}, {cy})")
    
    # Scale: ~0.18 meters per pixel ensures ~135m main road length from station to church
    METERS_PER_PIXEL = 0.18

    # 1. ROAD EXTRACTION: Consecutive spline waypoints from Station (Southeast) to Church (Northwest)
    # Refined road centerline coordinates in map pixels
    raw_road_pixels = [
        (1385, 940),  # 1. Station Platform
        (1348, 915),  # 2. Station Approach
        (1305, 860),  # 3. Station Junction
        (1267, 775),  # 4. East Livestock Lane South
        (1235, 700),  # 5. East Livestock Lane Mid
        (1220, 630),  # 6. East Livestock Lane North
        (1202, 575),  # 7. South Town Entrance Bend
        (1160, 565),  # 8. Main Street East (General Store / Hotel)
        (1110, 565),  # 9. Main Street Central (Saloon / Sheriff)
        (1060, 568),  # 10. Main Street West (Stable corner)
        (1025, 575),  # 11. West Town Curve (Turn towards church hill)
        (1018, 538),  # 12. Church Hill Ascent South
        (1012, 510),  # 13. Church Hill Ascent Mid
        (1008, 485)   # 14. Church Courtyard / Hilltop
    ]

    road_spline_world = []
    for px, py in raw_road_pixels:
        wx = round((px - cx) * METERS_PER_PIXEL, 2)
        wz = round((py - cy) * METERS_PER_PIXEL, 2)
        road_spline_world.append([wx, wz])

    print(f"[parse_valentine_map] Extracted {len(road_spline_world)} road spline waypoints.")

    # 2. BUILDING EXTRACTION
    # Valentine town bounding region in map pixels
    x1, y1, x2, y2 = 910, 310, 1430, 980
    town_crop = img_bgr[y1:y2, x1:x2]

    # Threshold for building fill in BGR
    bgr_mask = cv2.inRange(town_crop, np.array([85, 115, 140]), np.array([160, 185, 210]))
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    cleaned = cv2.morphologyEx(bgr_mask, cv2.MORPH_OPEN, kernel)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    extracted_buildings = []
    debug_boxes = []

    for c in contours:
        area = cv2.contourArea(c)
        if area < 100 or area > 8000:
            continue
        rect = cv2.minAreaRect(c)
        rw, rh = rect[1]
        if rw < 6 or rh < 6:
            continue
        rect_area = rw * rh
        solidity = area / (rect_area + 1e-5)
        aspect = max(rw, rh) / (min(rw, rh) + 1e-5)
        if solidity < 0.6 or aspect > 5.0:
            continue

        center_px = (rect[0][0] + x1, rect[0][1] + y1)
        full_rect = (center_px, rect[1], rect[2])

        # World position
        bx = round((center_px[0] - cx) * METERS_PER_PIXEL, 2)
        bz = round((center_px[1] - cy) * METERS_PER_PIXEL, 2)

        # Find nearest point on the road spline
        min_d = float('inf')
        nearest_road_pt = None
        for rpx, rpy in raw_road_pixels:
            d = math.hypot(center_px[0] - rpx, center_px[1] - rpy)
            if d < min_d:
                min_d = d
                nearest_road_pt = (rpx, rpy)

        # Vector pointing towards road
        dx_road = (nearest_road_pt[0] - center_px[0]) * METERS_PER_PIXEL
        dz_road = (nearest_road_pt[1] - center_px[1]) * METERS_PER_PIXEL
        
        # rotY: Three.js rotation around Y axis pointing local +Z towards the road
        rotY = round(math.atan2(dx_road, dz_road), 3)

        # Real-world dimensions (meters)
        dim1 = round(rw * METERS_PER_PIXEL, 2)
        dim2 = round(rh * METERS_PER_PIXEL, 2)
        
        # Assign width as longer/perpendicular to road, depth along road vector
        w = max(dim1, dim2)
        d = min(dim1, dim2)
        
        # Clamp realistic min building bounds
        w = max(w, 5.0)
        d = max(d, 4.5)
        
        # Determine height based on footprint
        h = 5.0
        if w * d > 80.0:
            h = 7.0
        elif w * d > 45.0:
            h = 6.0

        debug_boxes.append({
            'rect': full_rect,
            'nearest_pt': nearest_road_pt,
            'center': center_px
        })

        extracted_buildings.append({
            'pos': [bx, bz],
            'size': [w, d, h],
            'rotY': rotY,
            'px': center_px[0],
            'py': center_px[1]
        })

    # Sort buildings by position (North to South)
    extracted_buildings.sort(key=lambda b: (b['pos'][1], b['pos'][0]))

    # Semantic Landmark Assignment
    final_buildings = []
    for idx, b in enumerate(extracted_buildings):
        px, py = b['px'], b['py']
        b_id = f"bldg_{idx+1:02d}"
        b_name = f"Building {idx+1:02d}"

        # Identify landmarks by location
        if math.hypot(px - 960, py - 572) < 45 or math.hypot(px - 1008, py - 485) < 35:
            b_id = "church"
            b_name = "Valentine Church"
            b['size'] = [8.5, 14.0, 8.5]
        elif math.hypot(px - 1341, py - 886) < 45 or math.hypot(px - 1380, py - 935) < 45:
            b_id = "station"
            b_name = "Valentine Station"
            b['size'] = [12.0, 7.5, 5.5]
        elif math.hypot(px - 1040, py - 540) < 35 or (math.hypot(px - 1050, py - 547) < 30 and b_id.startswith('bldg')):
            b_id = "saloon"
            b_name = "Smithfield's Saloon"
            b['size'] = [11.0, 9.0, 7.2]
        elif math.hypot(px - 1080, py - 535) < 30:
            b_id = "store"
            b_name = "Valentine General Store"
            b['size'] = [9.0, 7.5, 5.5]
        elif math.hypot(px - 1120, py - 535) < 30:
            b_id = "gunsmith"
            b_name = "Valentine Gunsmith"
            b['size'] = [8.0, 6.5, 5.0]
        elif math.hypot(px - 1080, py - 595) < 30:
            b_id = "sheriff"
            b_name = "Sheriff's Office"
            b['size'] = [8.5, 6.5, 5.5]
        elif math.hypot(px - 1125, py - 595) < 30:
            b_id = "doctor"
            b_name = "Doctor's Clinic"
            b['size'] = [7.5, 6.0, 5.0]
        elif math.hypot(px - 1025, py - 600) < 35:
            b_id = "stable"
            b_name = "Valentine Livery Stable"
            b['size'] = [13.0, 11.0, 7.5]
        elif math.hypot(px - 1180, py - 590) < 35:
            b_id = "hotel"
            b_name = "Valentine Hotel & Bank"
            b['size'] = [10.0, 8.0, 6.5]

        final_buildings.append({
            "id": b_id,
            "name": b_name,
            "pos": b['pos'],
            "size": b['size'],
            "rotY": b['rotY']
        })

    # 3. SAVE JSON
    output_dir = "apps/client/src/world/data"
    os.makedirs(output_dir, exist_ok=True)
    json_path = os.path.join(output_dir, "valentineLayout.json")

    layout_data = {
        "roadSpline": road_spline_world,
        "buildings": final_buildings
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(layout_data, f, indent=2)

    print(f"[parse_valentine_map] Saved layout JSON to {json_path}")
    print(f"[parse_valentine_map] Total buildings extracted: {len(final_buildings)}")

    # 4. DRAW DEBUG VISUALIZATION
    vis_img = img_bgr.copy()

    # Draw Road Spline in Green with waypoints
    for i in range(len(raw_road_pixels) - 1):
        cv2.line(vis_img, raw_road_pixels[i], raw_road_pixels[i + 1], (0, 255, 0), 3, cv2.LINE_AA)
    for idx, pt in enumerate(raw_road_pixels):
        cv2.circle(vis_img, pt, 5, (0, 200, 0), -1)
        cv2.putText(vis_img, str(idx + 1), (pt[0] + 6, pt[1] - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 220, 0), 1, cv2.LINE_AA)

    # Draw Buildings in Red with Orientation Arrows pointing to the Road
    for item in debug_boxes:
        rect = item['rect']
        box = cv2.boxPoints(rect)
        box = np.int32(box)
        cv2.drawContours(vis_img, [box], 0, (0, 0, 255), 2, cv2.LINE_AA)

        cx_b, cy_b = int(item['center'][0]), int(item['center'][1])
        cv2.circle(vis_img, (cx_b, cy_b), 3, (0, 0, 255), -1)

        nr_pt = item['nearest_pt']
        if nr_pt:
            angle = math.atan2(nr_pt[1] - cy_b, nr_pt[0] - cx_b)
            arrow_len = 18
            ax = int(cx_b + math.cos(angle) * arrow_len)
            ay = int(cy_b + math.sin(angle) * arrow_len)
            cv2.arrowedLine(vis_img, (cx_b, cy_b), (ax, ay), (255, 255, 0), 2, tipLength=0.35)

    debug_img_path = "Media/map_extraction_debug.png"
    cv2.imwrite(debug_img_path, vis_img)
    print(f"[parse_valentine_map] Saved control debug image to {debug_img_path}")

if __name__ == "__main__":
    main()
