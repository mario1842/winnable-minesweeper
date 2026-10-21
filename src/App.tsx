import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { playFlag, playLose, playReveal, playUiClick, playWin } from './audio/sounds'
import { Board } from './components/Board'
import { GameOverModal } from './components/GameOverModal'
import { Hud } from './components/Hud'
import { Menu } from './components/Menu'
import type { Difficulty } from './engine/difficulty'
import {
  applyHint,
  createGame,
  revealCell,
  tick,
  toggleFlag,
  type GameState,
} from './engine/game'

type Screen = 'menu' | 'play'

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [state, setState] = useState<GameState | null>(null)
  const [flagMode, setFlagMode] = useState(false)
  const prevStatus = useRef<GameState['status'] | null>(null)
  const flagModeRef = useRef(false)

  useEffect(() => {
    flagModeRef.current = flagMode
  }, [flagMode])

  const start = useCallback((difficulty: Difficulty) => {
    playUiClick()
    setFlagMode(false)
    setState(createGame(difficulty))
    setScreen('play')
  }, [])

  const onNewGame = useCallback(() => {
    playUiClick()
    setState((current) => (current ? createGame(current.difficulty) : current))
  }, [])

  const toMenu = useCallback(() => {
    playUiClick()
    setFlagMode(false)
    setScreen('menu')
    setState(null)
  }, [])

  const onToggleFlagMode = useCallback(() => {
    playUiClick()
    setFlagMode((value) => !value)
  }, [])

  const onHint = useCallback(() => {
    playUiClick()
    setState((current) => (current ? applyHint(current) : current))
  }, [])

  const onFlag = useCallback((index: number) => {
    setState((current) => {
      if (!current) return current
      const next = toggleFlag(current, index)
      if (next !== current) playFlag()
      return next
    })
  }, [])

  const onReveal = useCallback((index: number) => {
    setState((current) => {
      if (!current) return current
      if (
        flagModeRef.current &&
        !current.revealed[index] &&
        current.status !== 'won' &&
        current.status !== 'lost'
      ) {
        const flagged = toggleFlag(current, index)
        if (flagged !== current) playFlag()
        return flagged
      }

      const before = current.revealed
      const next = revealCell(current, index)
      if (next === current || next.status === 'lost') return next
      let opened = 0
      for (let i = 0; i < next.revealed.length; i++) {
        if (next.revealed[i] && !before[i]) opened++
      }
      if (opened > 0) playReveal(opened >= 12)
      return next
    })
  }, [])

  useEffect(() => {
    if (screen !== 'play') return
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === 'h' || event.key === 'H') {
        event.preventDefault()
        onHint()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [screen, onHint])

  useEffect(() => {
    if (screen !== 'play') return
    let frame = 0
    let last = performance.now()
    const loop = (now: number) => {
      const delta = Math.min(1000, now - last)
      last = now
      setState((prev) => (prev ? tick(prev, delta) : prev))
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [screen])

  useEffect(() => {
    if (!state) {
      prevStatus.current = null
      return
    }
    if (prevStatus.current === 'playing' && state.status === 'won') playWin()
    if (prevStatus.current === 'playing' && state.status === 'lost') playLose()
    prevStatus.current = state.status
  }, [state])

  if (screen === 'menu' || !state) {
    return (
      <div className="app">
        <Menu onPick={start} />
      </div>
    )
  }

  return (
    <div className="app">
      <div className="play">
        <Hud
          state={state}
          flagMode={flagMode}
          onToggleFlagMode={onToggleFlagMode}
          onHint={onHint}
          onNewGame={onNewGame}
          onChangeSize={toMenu}
        />
        <p className="assist">
          Left click opens. Right click, or Flag, marks a mine. Click a number once its flags match.
        </p>
        <Board state={state} onReveal={onReveal} onFlag={onFlag} />
        <GameOverModal state={state} onNewGame={onNewGame} onChangeSize={toMenu} />
      </div>
    </div>
  )
}
