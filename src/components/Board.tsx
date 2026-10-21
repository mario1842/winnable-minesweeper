import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import type { GameState } from '../engine/game'

interface BoardProps {
  state: GameState
  onReveal: (index: number) => void
  onFlag: (index: number) => void
}

function BoardView({ state, onReveal, onFlag }: BoardProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const hold = useRef(0)
  const suppressClick = useRef<number | null>(null)
  const [cell, setCell] = useState(32)
  const [gap, setGap] = useState(3)
  const { cols, rows } = state.difficulty
  const over = state.status === 'won' || state.status === 'lost'

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const widthBudget = el.clientWidth
      const heightBudget = el.clientHeight
      const fieldPad = widthBudget < 720 ? 14 : 28
      const nextGap = widthBudget < 480 ? 1 : widthBudget < 800 ? 2 : 3
      const width = widthBudget - fieldPad
      const height = heightBudget - fieldPad
      const byWidth = (width - nextGap * (cols - 1)) / cols
      const byHeight = (height - nextGap * (rows - 1)) / rows
      const size = Math.floor(Math.min(byWidth, byHeight, 42))
      setGap(nextGap)
      setCell(Number.isFinite(size) ? Math.max(8, size) : 8)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [cols, rows])

  useEffect(() => () => window.clearTimeout(hold.current), [])

  return (
    <div className="board-wrap" ref={wrapRef}>
      <div
        className={state.status === 'lost' ? 'minefield shaking' : 'minefield'}
        aria-label={`${state.difficulty.name} board`}
        style={{
          ['--cols' as string]: String(cols),
          ['--cell' as string]: `${cell}px`,
          ['--gap' as string]: `${gap}px`,
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        {Array.from({ length: cols * rows }, (_, index) => {
          const face = cellFace(state, index)
          return (
            <button
              key={index}
              type="button"
              className={face.className}
              data-index={index}
              aria-label={face.label}
              style={face.pop === undefined ? undefined : { ['--pop' as string]: String(face.pop) }}
              onClick={(event) => {
                const picked = Number(event.currentTarget.dataset.index)
                if (suppressClick.current === picked) {
                  suppressClick.current = null
                  return
                }
                if (over) return
                onReveal(picked)
              }}
              onContextMenu={(event) => {
                event.preventDefault()
                if (over) return
                onFlag(index)
              }}
              onPointerDown={(event) => {
                suppressClick.current = null
                if (event.pointerType === 'mouse' || over) return
                const picked = index
                window.clearTimeout(hold.current)
                hold.current = window.setTimeout(() => {
                  suppressClick.current = picked
                  onFlag(picked)
                }, 450)
              }}
              onPointerUp={() => window.clearTimeout(hold.current)}
              onPointerLeave={() => window.clearTimeout(hold.current)}
              onPointerCancel={() => window.clearTimeout(hold.current)}
            >
              {face.body}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const Board = memo(BoardView, (prev, next) => {
  return (
    prev.onReveal === next.onReveal &&
    prev.onFlag === next.onFlag &&
    prev.state.difficulty === next.state.difficulty &&
    prev.state.status === next.state.status &&
    prev.state.hintIndex === next.state.hintIndex &&
    prev.state.exploded === next.state.exploded &&
    prev.state.revealed === next.state.revealed &&
    prev.state.flagged === next.state.flagged &&
    prev.state.mines === next.state.mines &&
    prev.state.numbers === next.state.numbers
  )
})

function cellFace(
  state: GameState,
  index: number,
): { className: string; label: string; body: ReactNode; pop?: number } {
  const row = Math.floor(index / state.difficulty.cols) + 1
  const col = (index % state.difficulty.cols) + 1
  const where = `Row ${row}, column ${col}`
  const lost = state.status === 'lost'
  const won = state.status === 'won'
  const isMine = state.mines?.[index] === 1

  if (state.revealed[index]) {
    const number = state.numbers?.[index] ?? 0
    return {
      className: number ? `cell revealed n${number}` : 'cell revealed',
      label: number ? `${where}, ${number} adjacent` : `${where}, empty`,
      body: number || null,
    }
  }

  if (lost && state.exploded === index) {
    return {
      className: 'cell exploded',
      label: `${where}, exploded mine`,
      body: <Blast />,
    }
  }
  if (state.flagged[index] && lost && !isMine) {
    return { className: 'cell covered misflag', label: `${where}, wrong flag`, body: <FlagGlyph crossed /> }
  }
  if (state.flagged[index] || (won && isMine)) {
    return { className: 'cell covered flagged', label: `${where}, flagged`, body: <FlagGlyph /> }
  }
  if (lost && isMine) {
    return {
      className: 'cell mine',
      label: `${where}, mine`,
      body: <MineGlyph />,
      pop: blastDistance(state, index),
    }
  }

  const hint = state.hintIndex === index ? ' hint' : ''
  return { className: `cell covered${hint}`, label: `${where}, covered`, body: null }
}

function blastDistance(state: GameState, index: number): number {
  const cols = state.difficulty.cols
  const origin = state.exploded
  const row = Math.floor(index / cols)
  const col = index % cols
  const originRow = Math.floor(origin / cols)
  const originCol = origin % cols
  return Math.max(Math.abs(row - originRow), Math.abs(col - originCol))
}

function Blast() {
  return (
    <span className="blast">
      <MineGlyph />
      {Array.from({ length: 8 }, (_, i) => (
        <i key={i} className="spark" style={{ ['--i' as string]: String(i) }} />
      ))}
    </span>
  )
}

function MineGlyph() {
  return (
    <svg className="glyph" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="3.4" fill="currentColor" />
      <path
        d="M10 1.8v3.1M10 15.1v3.1M1.8 10h3.1M15.1 10h3.1M4.1 4.1l2.2 2.2M13.7 13.7l2.2 2.2M15.9 4.1l-2.2 2.2M6.3 13.7l-2.2 2.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function FlagGlyph({ crossed = false }: { crossed?: boolean }) {
  return (
    <svg className="glyph" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M6 2.5v15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6.8 3.2h8.2L12.2 7l2.8 3.8H6.8" fill="currentColor" />
      {crossed ? (
        <path d="M3 17.2L17 3.2" stroke="#b54a3c" strokeWidth="1.8" strokeLinecap="round" />
      ) : null}
    </svg>
  )
}
