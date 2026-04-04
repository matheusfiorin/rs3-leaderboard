#!/usr/bin/env python3
"""Fetch Grand Exchange prices for money making calculations."""
import json
import sys
import urllib.request

ITEMS = {
    52: 'Arrow shaft', 314: 'Feather', 53: 'Headless arrow',
    440: 'Iron ore', 2351: 'Iron bar', 2353: 'Steel bar', 453: 'Coal',
    561: 'Nature rune', 1739: 'Cowhide', 1743: 'Hard leather',
    1515: 'Yew logs', 1513: 'Magic logs', 383: 'Raw shark', 385: 'Shark',
    1779: 'Flax', 1777: 'Bowstring', 2357: 'Gold bar', 444: 'Gold ore',
}

def parse_price(price_str: str) -> int:
    """Parse RS GE price string like '1.2k', '3.5m', '1,234'."""
    s = str(price_str).replace(',', '').strip()
    multipliers = {'k': 1_000, 'm': 1_000_000, 'b': 1_000_000_000}
    for suffix, mult in multipliers.items():
        if s.lower().endswith(suffix):
            return int(float(s[:-1]) * mult)
    return int(float(s))

def main() -> None:
    prices = {}
    for item_id, name in ITEMS.items():
        try:
            url = f'https://secure.runescape.com/m=itemdb_rs/api/catalogue/detail.json?item={item_id}'
            req = urllib.request.Request(url, headers={'User-Agent': 'RS3-Leaderboard/1.0'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read())
                price = parse_price(data['item']['current']['price'])
                prices[str(item_id)] = {'name': name, 'price': price}
        except Exception as e:
            print(f'Skip {item_id} ({name}): {e}', file=sys.stderr)

    with open('data/ge_prices.json', 'w') as f:
        json.dump(prices, f)
    print(f'Cached {len(prices)} item prices')

if __name__ == '__main__':
    main()
