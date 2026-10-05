# Summit Half Dome

A browser platformer that replaces the slides for the 45-minute Claude kickstart with Client Solutions. Everyone plays the Half Dome hike on their own laptop while Harry talks over it, and stops at each Basecamp for a live demo in Claude.

## Run it

Open `index.html` in Chrome or Safari. No build step, no backend.

Deploy: `vercel deploy` from this folder, or drag the folder into Vercel.

## Edit the words

All text lives in the `CONTENT` object at the top of the first `<script>` in `index.html`: cards, backpack prompts, quizzes, basecamp lines and the ASCII level maps. The level legend is in the comment above it.

## Controls

| Key | Action |
|---|---|
| Arrows or A / D | Move |
| Space, Up or W | Jump |
| E or Enter | Read a trail marker (or hit it from below) |
| Esc | Close |
| M | World map |
| B | Backpack |
| L | List view (every card, prompt and question as plain text) |

Links: `#world-1` to `#world-6` jump straight to a world. `?presenter` shows talk-track lines on cards that have one.

## Build status

- World 1 (Happy Isles): playable end to end.
- Worlds 2 to 6: content is in `CONTENT` and in the list view; levels come next.
