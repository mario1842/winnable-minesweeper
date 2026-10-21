import { formatTime, minesRemaining, type GameState } from '../engine/game'
import { SisterGames } from './SisterGames'

interface HudProps {
  state: GameState
  flagMode: boolean
  onToggleFlagMode: () => void
  onHint: () => void
  onNewGame: () => void
  onChangeSize: () => void
}

export function Hud({
  state,
  flagMode,
  onToggleFlagMode,
  onHint,
  onNewGame,
  onChangeSize,
}: HudProps) {
  return (
    <header className="hud">
      <div className="hud-stats">
        <div className="stat">
          <label>Size</label>
          <strong>{state.difficulty.name}</strong>
        </div>
        <div className="stat">
          <label>Mines</label>
          <strong>{minesRemaining(state)}</strong>
        </div>
        <div className="stat">
          <label>Time</label>
          <strong>{formatTime(state.elapsedMs)}</strong>
        </div>
      </div>

      <SisterGames variant="hud" />

      <div className="hud-actions">
        <button
          type="button"
          className={flagMode ? 'btn flag-toggle on' : 'btn flag-toggle'}
          aria-pressed={flagMode}
          title="Flag mode — tap covered cells to flag"
          onClick={onToggleFlagMode}
        >
          Flag
        </button>
        <button
          type="button"
          className="btn"
          onClick={onHint}
          disabled={state.status !== 'playing'}
          title="Shortcut: H"
        >
          Hint <kbd className="key">H</kbd>
        </button>
        <button type="button" className="btn" onClick={onNewGame}>
          New board
        </button>
        <button type="button" className="btn btn-ghost" onClick={onChangeSize}>
          Sizes
        </button>
      </div>
    </header>
  )
}
