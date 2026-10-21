# Winnable Minesweeper

Minesweeper in the browser where **every board is guaranteed solvable**. The first click is never a mine — it opens a wide patch of ground — and the rest of the board can be cleared by logic alone.

**Play online:** [https://mario1842.github.io/winnable-minesweeper/](https://mario1842.github.io/winnable-minesweeper/)

Also play **[Winnable Mahjong](https://mario1842.github.io/winnable-mahjong/)** and **[Winnable Solitaire](https://mario1842.github.io/winnable-solitaire/)**.

## Play locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173/winnable-minesweeper/`).

## Features

- **Three sizes**
  | Size         | Board  | Mines |
  | ------------ | ------ | ----- |
  | Beginner     | 9×9    | 10    |
  | Intermediate | 16×16  | 40    |
  | Expert       | 30×16  | 99    |
- **Safe first click** — mines are placed when you click, on a zero, and the opening is large enough that the next move is forced
- **No guessing** — a logic solver rejects boards that would stall
- Flag (right click, long-press, or Flag mode), chord a number when its flags match, hint (**`H`**)
- Timer and mine counter
- Links to the other Winnable games
- Responsive board (cells shrink so Expert fits the screen)
- Static build — free hosting on GitHub Pages

## Scripts

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev`     | Local development server     |
| `npm test`        | Engine unit tests            |
| `npm run build`   | Production build to `dist`   |
| `npm run preview` | Preview the production build |

## Deploy to GitHub Pages

1. Push this repo to GitHub as `winnable-minesweeper` (or change `base` in `vite.config.ts` to match your repo name).
2. In the repo **Settings → Pages**, set source to **GitHub Actions**.
3. Push to `main` — the workflow in `.github/workflows/deploy.yml` builds and deploys.

Game URL: `https://mario1842.github.io/winnable-minesweeper/`
