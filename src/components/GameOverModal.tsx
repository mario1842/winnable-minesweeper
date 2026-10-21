import { createPortal } from 'react-dom'
import { formatTime, type GameState } from '../engine/game'

interface GameOverModalProps {
  state: GameState
  onNewGame: () => void
  onChangeSize: () => void
}

export function GameOverModal({ state, onNewGame, onChangeSize }: GameOverModalProps) {
  const won = state.status === 'won'
  const lost = state.status === 'lost'
  if (!won && !lost) return null

  return createPortal(
    <div
      className={lost ? 'overlay overlay-late' : 'overlay'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-title"
    >
      <div className="modal">
        <h2 id="end-title" className={won ? undefined : 'danger'}>
          {won ? 'You won!' : 'You hit a mine'}
        </h2>
        <p>
          {won
            ? 'Cleared a guaranteed-winnable board. Ready for another?'
            : 'That click was a mine. Deal a fresh board and try a different path.'}
        </p>
        <div className="modal-stats">
          <div className="stat">
            <label>Time</label>
            <strong>{formatTime(state.elapsedMs)}</strong>
          </div>
          <div className="stat">
            <label>Size</label>
            <strong>{state.difficulty.name}</strong>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onNewGame}>
            New board
          </button>
          <button type="button" className="btn" onClick={onChangeSize}>
            Sizes
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
