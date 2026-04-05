# RS3 Companion OS — Gamification Overhaul

You are iterating on /home/mathe/rs3-leaderboard/ — a static HTML/CSS/JS RuneScape 3 companion app deployed on GitHub Pages.

## Your Mission

Transform this dashboard into a **gamified mobile-first OS** that feels like a game companion, not a website. Every change must be tested with `node --check` on all JS files before committing.

## Design Principles (Cognitive Science)

1. **Variable Reward Schedules** — Show XP gains with slot-machine-style counters that animate. Progress bars should fill with satisfying easing curves (cubic-bezier overshoot). Completion triggers confetti/particle bursts.

2. **Loss Aversion** — Show what players are MISSING (skills below threshold in red, locked content greyed out). "You're X levels from unlocking Y" creates urgency.

3. **Social Proof** — Always show both players' progress side by side. Who's ahead? Who gained more today? Competition drives engagement.

4. **Endowed Progress Effect** — Start progress bars at a non-zero point. "You've already completed 12/43 items!" feels better than "31 items remaining."

5. **Zeigarnik Effect** — Incomplete tasks are more memorable. Show partially-filled rings, incomplete checklists, "almost there" badges prominently.

## Visual Direction: RuneScape Game UI

Use REAL RS3 images from the wiki wherever possible:
- Skill icons: `https://runescape.wiki/images/[SkillName]_icon.png` (e.g. Attack_icon.png, Prayer_icon.png)
- Item icons: `https://runescape.wiki/images/[ItemName].png`
- Quest icons: `https://runescape.wiki/images/Quest_icon.png`

### Style Requirements
- **Mobile-first**: Everything must work perfectly at 375px. Test at 375px, 414px, 768px, 1024px
- **Touch targets**: Minimum 44px for all interactive elements
- **Bottom-heavy UI**: Primary actions at bottom (thumb zone), info at top
- **Dark theme**: Keep the obsidian/gold palette but make it feel more like RS3's interface
- **RS3 Font**: Use the existing Cinzel for headers (closest to RS3's font)
- **Card-based**: Every piece of content is a card with depth (shadows, borders, subtle gradients)
- **Haptic feedback feel**: Buttons should have visible press states (scale down, color shift)

## Files to Modify

- `style.css` — Complete responsive overhaul. Mobile-first breakpoints. Larger touch targets. RS3-inspired UI panels.
- `script.js` — Add animated counters, XP gain animations, completion celebrations
- `goals.js` — Add RS3 skill icons to skill rows, animated progress rings, "next unlock" preview
- `index.html` — Update CSP to allow runescape.wiki images. Add viewport meta if missing.
- `lookup.js` — Style results with RS3 skill icons

## Specific Changes to Make

### 1. RS3 Skill Icons Everywhere
In the SKILLS array (script.js line ~27), the skills have abbreviations. Map them to wiki icon URLs:
```js
const SKILL_ICON = (id) => {
  const names = {0:'Attack',1:'Defence',2:'Strength',3:'Constitution',4:'Ranged',5:'Prayer',6:'Magic',7:'Cooking',8:'Woodcutting',9:'Fletching',10:'Fishing',11:'Firemaking',12:'Crafting',13:'Smithing',14:'Mining',15:'Herblore',16:'Agility',17:'Thieving',18:'Slayer',19:'Farming',20:'Runecrafting',21:'Hunter',22:'Construction',23:'Summoning',24:'Dungeoneering',25:'Divination',26:'Invention',27:'Archaeology',28:'Necromancy'};
  return `https://runescape.wiki/images/${names[id]}_icon.png`;
};
```
Use `<img src="${SKILL_ICON(id)}" width="20" height="20" alt="" loading="lazy">` instead of colored `.sk-icon` divs.

### 2. Animated XP Counters
When data refreshes and XP changes, animate the number counting up:
```js
function animateCounter(el, from, to, duration) {
  const start = performance.now();
  const step = (now) => {
    const pct = Math.min((now - start) / duration, 1);
    const val = Math.round(from + (to - from) * pct);
    el.textContent = val.toLocaleString();
    if (pct < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
```

### 3. Goal Progress with RS3 Icons
In goals.js, replace emoji icons with RS3 images:
- Soul Split: `https://runescape.wiki/images/Soul_Split.png`
- Prifddinas: `https://runescape.wiki/images/Prifddinas_lodestone_icon.png`
- Sunshine: `https://runescape.wiki/images/Sunshine.png`
- Invention: `https://runescape.wiki/images/Invention_icon.png`

### 4. Mobile Navigation
The floating dock should be:
- Larger (56px buttons on mobile)
- Always visible at bottom
- Glass morphism background
- Active state with RS3 gold glow

### 5. Home Screen Cards
Each home card should show:
- A meaningful live stat (not just a label)
- A mini progress indicator (thin bar or ring)
- RS3-themed icon instead of emoji

### 6. Player Cards as "Character Sheets"
Show player cards like RPG character sheets:
- Combat level in a shield shape
- XP in an animated counter
- Skill bars as radial/circular charts
- RuneScore as a badge with glow

## Testing Protocol

After EACH change:
1. `node --check *.js` — all must pass
2. Verify CSP allows runescape.wiki images
3. Check that no function references are broken
4. Mentally verify mobile layout at 375px

## Git Protocol

After making changes:
```bash
git add -A && git commit -m "gamify: [description]" && git pull --rebase origin master && git push origin master
```

## Completion

When the site feels like a proper mobile game companion OS with RS3 imagery, animated counters, gamified progress, and responsive touch-friendly UI, output:

<promise>GAMIFICATION COMPLETE</promise>
