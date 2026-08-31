#!/usr/bin/env python3
"""Landmask tools: export the equirectangular mask to PNG, filter small arctic
islands (keep big ones like Greenland), and convert an (edited) PNG back to
landmask.js. Usage:
  python3 mask-tools.py export  landmask.js  out.png
  python3 mask-tools.py filter  in.png out.png   (arctic small-island removal)
  python3 mask-tools.py tojs    in.png  landmask.js
"""
import sys, base64, math, re
from collections import deque
from PIL import Image

W, H = 1440, 720

def read_mask_js(path):
    src = open(path).read()
    b64 = re.search(r'data: "([^"]+)"', src).group(1)
    raw = base64.b64decode(b64)
    grid = [[(raw[(y * W + x) >> 3] >> ((y * W + x) & 7)) & 1 for x in range(W)] for y in range(H)]
    return grid

def write_mask_js(grid, path):
    bits = bytearray((W * H + 7) // 8)
    for y in range(H):
        for x in range(W):
            if grid[y][x]:
                i = y * W + x
                bits[i >> 3] |= 1 << (i & 7)
    b64 = base64.b64encode(bytes(bits)).decode()
    open(path, 'w').write(
        '// Equirectangular land mask %dx%d, 1 bit/cell, row 0 = lat +90, col 0 = lon -180\n'
        'const LANDMASK = { W: %d, H: %d, data: "%s" };\n' % (W, H, W, H, b64))

def to_png(grid, path):
    img = Image.new('L', (W, H))
    img.putdata([255 if grid[y][x] else 0 for y in range(H) for x in range(W)])
    img.save(path)

def from_png(path):
    img = Image.open(path).convert('L')
    if img.size != (W, H):
        img = img.resize((W, H), Image.NEAREST)
    px = list(img.getdata())
    return [[1 if px[y * W + x] >= 128 else 0 for x in range(W)] for y in range(H)]

def cell_lat(y): return 90 - (y + 0.5) * 180 / H
CELL_KM2_EQ = (40075.0 / W / 2) * (20015.0 / H)  # cell area at the equator (~55.6 x 55.6 km)

def filter_arctic(grid, min_km2=600000, lat_limit=58):
    seen = [[False] * W for _ in range(H)]
    out = [row[:] for row in grid]
    removed = kept = 0
    for y0 in range(H):
        for x0 in range(W):
            if grid[y0][x0] and not seen[y0][x0]:
                comp, area, latw = [], 0.0, 0.0
                q = deque([(y0, x0)]); seen[y0][x0] = True
                while q:
                    y, x = q.popleft()
                    comp.append((y, x))
                    a = CELL_KM2_EQ * math.cos(math.radians(cell_lat(y)))
                    area += a; latw += a * cell_lat(y)
                    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        ny, nx = y + dy, (x + dx) % W  # wrap longitude
                        if 0 <= ny < H and grid[ny][nx] and not seen[ny][nx]:
                            seen[ny][nx] = True; q.append((ny, nx))
                clat = latw / area
                if clat > lat_limit and area < min_km2:
                    for y, x in comp: out[y][x] = 0
                    removed += 1
                elif clat > lat_limit:
                    kept += 1
    print('arctic components removed:', removed, '| big ones kept:', kept)
    return out

cmd = sys.argv[1]
if cmd == 'export':
    to_png(read_mask_js(sys.argv[2]), sys.argv[3])
elif cmd == 'filter':
    to_png(filter_arctic(from_png(sys.argv[2])), sys.argv[3])
elif cmd == 'tojs':
    write_mask_js(from_png(sys.argv[2]), sys.argv[3])
print('ok')
