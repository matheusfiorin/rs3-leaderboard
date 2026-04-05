#!/usr/bin/env python3
"""Fetch Grand Exchange prices for money making calculations."""
import json
import sys
import time
import urllib.request

ITEMS = {
    # ---- Existing ----
    52: 'Arrow shaft', 314: 'Feather', 53: 'Headless arrow',
    440: 'Iron ore', 2351: 'Iron bar', 2353: 'Steel bar', 453: 'Coal',
    561: 'Nature rune', 1739: 'Cowhide', 1743: 'Hard leather',
    1515: 'Yew logs', 1513: 'Magic logs', 383: 'Raw shark', 385: 'Shark',
    1779: 'Flax', 1777: 'Bowstring', 2357: 'Gold bar', 444: 'Gold ore',

    # ---- Dragonhide tanning ----
    1745: 'Green dragonhide', 1753: 'Green d\'hide body',
    2505: 'Green dragon leather',
    1747: 'Blue dragonhide', 2507: 'Blue dragon leather',

    # ---- Herblore / Potions ----
    249: 'Clean guam', 91: 'Guam potion (unf)',
    253: 'Clean marrentill', 93: 'Marrentill potion (unf)',
    255: 'Clean tarromin', 95: 'Tarromin potion (unf)',
    257: 'Clean harralander', 97: 'Harralander potion (unf)',
    259: 'Clean ranarr', 99: 'Ranarr potion (unf)',
    263: 'Clean kwuarm',
    265: 'Clean cadantine',
    2481: 'Vial of water',
    221: 'Eye of newt',
    227: 'Unicorn horn dust',
    235: 'Vial',

    # ---- Cooking ----
    317: 'Raw shrimps', 315: 'Shrimps',
    329: 'Raw salmon', 329: 'Raw salmon',
    335: 'Raw trout', 333: 'Trout',
    349: 'Raw pike', 351: 'Pike',
    359: 'Raw tuna', 361: 'Tuna',
    371: 'Raw swordfish', 373: 'Swordfish',
    3142: 'Raw karambwan', 3144: 'Cooked karambwan',

    # ---- Crafting ----
    1741: 'Leather', 1167: 'Leather gloves',
    1749: 'Red dragonhide', 2509: 'Red dragon leather',
    1607: 'Sapphire', 1608: 'Emerald', 1609: 'Ruby', 1610: 'Diamond',
    1623: 'Uncut sapphire', 1621: 'Uncut emerald',
    1619: 'Uncut ruby', 1617: 'Uncut diamond',

    # ---- Runecrafting ----
    556: 'Air rune', 555: 'Water rune', 554: 'Fire rune', 557: 'Earth rune',
    563: 'Law rune', 562: 'Chaos rune', 560: 'Death rune', 565: 'Blood rune',
    4695: 'Mud rune', 4696: 'Smoke rune',
    4694: 'Mist rune', 4698: 'Dust rune',

    # ---- Smithing ----
    2349: 'Bronze bar', 2355: 'Mithril bar', 447: 'Mithril ore',
    449: 'Adamantite ore', 2361: 'Adamant bar',

    # ---- Woodcutting / Fletching ----
    1511: 'Normal logs', 1521: 'Oak logs', 1519: 'Willow logs',
    1517: 'Maple logs',
    845: 'Bow string',
    50: 'Oak shortbow (u)', 54: 'Maple shortbow (u)',
    56: 'Willow shortbow (u)',
    66: 'Yew shortbow (u)', 68: 'Magic shortbow (u)',
    64: 'Maple longbow (u)', 62: 'Willow longbow (u)',
    58: 'Oak longbow (u)', 60: 'Yew longbow (u)',

    # ---- Mining ----
    436: 'Copper ore', 438: 'Tin ore', 442: 'Silver ore',

    # ---- Misc high-value ----
    1761: 'Soft clay', 434: 'Clay',
    2970: 'Spirit shard',
}

def parse_price(price_str):
    """Parse RS GE price string like '1.2k', '3.5m', '1,234'."""
    s = str(price_str).replace(',', '').strip()
    multipliers = {'k': 1_000, 'm': 1_000_000, 'b': 1_000_000_000}
    for suffix, mult in multipliers.items():
        if s.lower().endswith(suffix):
            return int(float(s[:-1]) * mult)
    return int(float(s))

def main():
    prices = {}
    total = len(ITEMS)
    for i, (item_id, name) in enumerate(ITEMS.items()):
        try:
            url = f'https://secure.runescape.com/m=itemdb_rs/api/catalogue/detail.json?item={item_id}'
            req = urllib.request.Request(url, headers={'User-Agent': 'RS3-Leaderboard/1.0'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read())
                price = parse_price(data['item']['current']['price'])
                prices[str(item_id)] = {'name': name, 'price': price}
        except Exception as e:
            print(f'Skip {item_id} ({name}): {e}', file=sys.stderr)
        # Rate limit: small delay every 10 items
        if (i + 1) % 10 == 0:
            time.sleep(0.5)

    with open('data/ge_prices.json', 'w') as f:
        json.dump(prices, f)
    print(f'Cached {len(prices)}/{total} item prices')

if __name__ == '__main__':
    main()
