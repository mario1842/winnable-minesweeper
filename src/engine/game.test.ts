import { describe, expect, it } from 'vitest'
import { fieldFromMines } from './board'
import { DIFFICULTIES } from './difficulty'
import { mulberry32 } from './generate'
import {
  applyHint,
  createGame,
  formatTime,
  injectField,
  minesRemaining,
  revealCell,
  tick,
  toggleFlag,
} from './game'

const beginner = DIFFICULTIES[0]!

describe('game rules', () => {
  it('does not place mines until the first click, and that click is a zero', () => {
    let state = createGame(beginner)
    expect(state.mines).toBeNull()
    expect(state.status).toBe('ready')
    state = revealCell(state, 40, mulberry32(4))
    expect(state.mines![40]).toBe(0)
    expect(state.numbers![40]).toBe(0)
    expect(state.revealed[40]).toBe(1)
    expect(state.status === 'playing' || state.status === 'won').toBe(true)
    let opened = 0
    for (let i = 0; i < state.revealed.length; i++) opened += state.revealed[i]!
    expect(opened).toBeGreaterThanOrEqual(beginner.minOpening)
  })

  it('loses when a mine is opened', () => {
    let state = injectField(createGame(beginner), fieldFromMines(9, 9, [0]))
    state = revealCell(state, 0)
    expect(state.status).toBe('lost')
    expect(state.exploded).toBe(0)
    expect(state.revealed[0]).toBe(0)
  })

  it('toggles flags and ignores clicks on flagged cells', () => {
    let state = injectField(createGame(beginner), fieldFromMines(9, 9, [0]))
    state = toggleFlag(state, 0)
    expect(minesRemaining(state)).toBe(9)
    state = revealCell(state, 0)
    expect(state.status).toBe('playing')
    expect(state.revealed[0]).toBe(0)
    state = toggleFlag(state, 0)
    expect(state.flagged[0]).toBe(0)
    expect(minesRemaining(state)).toBe(10)
  })

  it('chords a satisfied number and loses on a wrong flag', () => {
    let state = injectField(createGame(beginner), fieldFromMines(9, 9, [0]))
    const revealed = state.revealed.slice()
    revealed[1] = 1
    state = { ...state, revealed }

    state = toggleFlag(state, 2)
    const lost = revealCell(state, 1)
    expect(lost.status).toBe('lost')
    expect(lost.exploded).toBe(0)

    let safe = injectField(createGame(beginner), fieldFromMines(9, 9, [0]))
    const open = safe.revealed.slice()
    open[1] = 1
    safe = { ...safe, revealed: open }
    safe = toggleFlag(safe, 0)
    safe = revealCell(safe, 1)
    expect(safe.status === 'playing' || safe.status === 'won').toBe(true)
    expect(safe.revealed[2]).toBe(1)
    expect(safe.exploded).toBe(-1)
  })

  it('hints a covered safe cell', () => {
    let state = createGame(beginner)
    state = revealCell(state, 0, mulberry32(9))
    if (state.status !== 'playing') return
    const hinted = applyHint(state)
    expect(hinted.hintIndex).toBeGreaterThanOrEqual(0)
    expect(hinted.revealed[hinted.hintIndex]).toBe(0)
    expect(hinted.mines![hinted.hintIndex]).toBe(0)
  })

  it('clears a full board by following hints', () => {
    for (const difficulty of DIFFICULTIES) {
      let state = revealCell(
        createGame(difficulty),
        Math.floor((difficulty.cols * difficulty.rows) / 2),
        mulberry32(11),
      )
      let guard = 0
      while (state.status === 'playing' && guard++ < difficulty.cols * difficulty.rows) {
        const hinted = applyHint(state)
        expect(hinted.hintIndex).toBeGreaterThanOrEqual(0)
        state = revealCell(hinted, hinted.hintIndex)
      }
      expect(state.status).toBe('won')
    }
  })

  it('counts time only while playing', () => {
    const ready = tick(createGame(beginner), 1000)
    expect(ready.elapsedMs).toBe(0)
    expect(formatTime(65_000)).toBe('1:05')
  })
})
