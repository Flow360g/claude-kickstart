"""Generates the ASCII level maps pasted into CONTENT. Run: python3 tools/levels.py"""
class Lv:
    def __init__(s, W, H): s.W, s.H, s.g = W, H, [[' '] * W for _ in range(H)]
    def put(s, x, y, c): s.g[y][x] = c
    def fill(s, x0, x1, y0, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): s.g[y][x] = c
    def ground(s, x0, x1, top, c='#'): s.fill(x0, x1, top, s.H - 1, c)
    def clear(s, x0, x1, y0, y1): s.fill(x0, x1, y0, y1, ' ')
    def out(s, name):
        print(f'// {name}')
        for r in s.g: print("        '" + ''.join(r).rstrip() + "',")

# ---------- World 2: Mist Trail ----------
L = Lv(172, 18)
L.ground(0, 171, 14)
L.put(3, 13, 'P'); L.put(7, 13, 'S'); L.put(13, 13, '1'); L.put(17, 10, '?')
L.ground(23, 31, 13); L.ground(32, 39, 12)                       # wet granite steps
L.put(44, 13, '2'); L.fill(47, 51, 11, 11, '='); L.fill(53, 57, 8, 8, '='); L.put(55, 4, '?')   # Sonnet spur
L.put(63, 13, '3'); L.clear(65, 76, 14, 15); L.put(70, 12, '?')                                   # Haiku dip
L.ground(81, 83, 12); None
L.put(89, 13, '4'); L.ground(92, 94, 11); L.fill(96, 99, 8, 8, '='); L.put(97, 4, '?')            # Fable spur
L.put(112, 10, '?')
L.ground(117, 121, 13); L.ground(122, 126, 12); L.ground(127, 143, 11); L.put(134, 7, '?'); L.put(129, 10, '5')
L.put(152, 13, 'R'); L.put(160, 13, 'C'); L.put(167, 13, 'X')
for x in (1, 10, 20, 36, 60, 86, 105, 115, 146, 157, 170): L.put(x, 13 if L.g[14][x] == '#' else 15, 'T') if L.g[14][x] == '#' else None
for x in (130, 140): L.put(x, 10, 'T')
L.out('World 2')

# ---------- World 3: Nevada Fall and Little Yosemite Valley ----------
L = Lv(182, 18)
L.ground(0, 181, 14)
L.put(3, 13, 'P'); L.put(7, 13, 'S'); L.put(15, 10, '?')
L.ground(19, 23, 12); L.ground(24, 27, 13)
L.put(31, 13, 'K'); L.put(27, 9, '?')
L.ground(39, 41, 12); None
L.put(47, 13, 'K'); L.put(54, 10, '?')
L.clear(56, 73, 14, 17); L.fill(56, 73, 15, 17, '~')   # Merced crossing: too wide to jump, take the avocado ferry
L.put(76, 13, 'Y'); L.put(84, 10, '?')
L.put(92, 13, 'K'); L.fill(97, 101, 11, 11, '='); L.put(103, 10, '?')
L.put(110, 13, 'K'); L.put(122, 10, '?'); L.put(117, 13, '1')
L.ground(128, 131, 13); L.ground(132, 135, 12)
L.put(150, 13, 'R'); L.put(161, 13, 'C'); L.put(174, 13, 'X')
for x in (1, 11, 35, 44, 52, 72, 88, 106, 114, 126, 140, 145, 156, 168, 179): L.put(x, 13, 'T') if L.g[14][x] == '#' and L.g[13][x] == ' ' else None
L.out('World 3')

# ---------- World 4: Sub Dome stairs ----------
L = Lv(166, 26)
L.ground(0, 165, 22)
L.put(3, 21, 'P'); L.put(7, 21, 'S'); L.put(14, 21, '1')
steps = [(20, 45, 19), (46, 71, 16), (72, 97, 13), (98, 165, 10)]
for x0, x1, t in steps: L.ground(x0, x1, t)
L.put(21, 20, '2'); L.put(47, 17, '3'); L.put(73, 14, '4'); L.put(99, 11, '5')   # carved labels on each riser
L.put(32, 15, '?'); L.put(58, 12, '?'); L.put(84, 9, '?'); L.put(110, 6, '?'); L.put(126, 6, '?')
None; None
L.put(137, 9, 'R'); L.put(147, 9, 'C'); L.put(159, 9, 'X')
for x in (1, 11, 17, 40, 66, 93, 132, 154, 163):
    t = next((y for y in range(L.H) if L.g[y][x] == '#'), None)
    if t and L.g[t - 1][x] == ' ': L.put(x, t - 1, 'T')
L.out('World 4')

# ---------- World 5: The Cables ----------
L = Lv(204, 34)
L.ground(0, 203, 30)
L.put(3, 29, 'P'); L.put(7, 29, 'S')
# 5a: a home for every client
L.put(13, 26, '?'); L.put(22, 26, '?'); L.ground(26, 28, 28); None; L.put(33, 26, '?'); L.put(42, 26, '?')
L.fill(36, 39, 26, 26, '='); None; None
L.put(53, 29, 'C'); L.put(57, 29, '1')
# 5b: mi-to-monday
L.ground(62, 75, 28); L.ground(76, 90, 26); L.ground(91, 123, 24)
L.put(66, 24, '?'); L.put(72, 24, '?'); L.put(81, 22, '?'); L.put(87, 22, '?'); L.put(97, 20, '?')
None; L.put(116, 23, 'C'); L.put(120, 23, '2')
# 5c: the cables proper
y = 24; x = 124; tops = []
while y > 8:
    y -= 2; L.ground(x, x + 4, y); tops.append((x, y)); L.put(x, y - 1, 'I'); x += 5
L.ground(x, 203, 8); L.put(x, 7, 'I')
for i, (sx, t) in enumerate(tops):
    if i in (1, 3, 5): L.put(sx + 2, t - 4, '?')
None
L.put(x + 6, 4, '?')
L.put(x + 14, 7, 'R'); L.put(x + 26, 7, 'C'); L.put(x + 38, 7, 'X')
for xx in (1, 11, 19, 31, 45, 50, 60, 68, 79, 95, 110, x + 3, x + 20, x + 33, x + 37):
    t = next((yy for yy in range(L.H) if L.g[yy][xx] == '#'), None)
    if t and L.g[t - 1][xx] == ' ': L.put(xx, t - 1, 'T')
L.out('World 5')

# ---------- World 6: The Summit and the Visor ----------
L = Lv(150, 18)
L.ground(0, 119, 13)
L.put(3, 12, 'P'); L.put(7, 12, 'S')
L.ground(16, 40, 12); L.ground(41, 119, 11)
L.put(22, 8, '?'); L.put(48, 7, '?'); L.put(74, 7, '?')
L.put(95, 10, '1')
L.clear(120, 149, 0, 17)
L.fill(120, 131, 11, 11, '#')          # the Visor: a thin ledge out over the valley
L.put(129, 10, 'Z')
L.out('World 6')
