import { DIFFICULTIES, type Difficulty } from '../engine/difficulty'
import { MineIcon } from './MineIcon'
import { SisterGames } from './SisterGames'

interface MenuProps {
  onPick: (difficulty: Difficulty) => void
}

export function Menu({ onPick }: MenuProps) {
  return (
    <div className="menu">
      <div className="brand">
        <MineIcon className="brand-mark" />
        <h1>
          Winnable
          <span>Minesweeper</span>
        </h1>
        <p>
          Every board is generated to be solvable — the first click is never a mine, and it
          opens enough ground that the next move is pure logic.
        </p>
        <div className="guarantee" aria-hidden="true">
          Guaranteed winnable deals
        </div>
      </div>

      <div className="mode-grid">
        {DIFFICULTIES.map((difficulty) => (
          <button
            key={difficulty.id}
            type="button"
            className="mode-card"
            onClick={() => onPick(difficulty)}
          >
            <h2>{difficulty.name}</h2>
            <p>{difficulty.description}</p>
            <span className="meta">
              {difficulty.cols}×{difficulty.rows} · {difficulty.mines} mines
            </span>
          </button>
        ))}
      </div>

      <SisterGames variant="menu" />
    </div>
  )
}
