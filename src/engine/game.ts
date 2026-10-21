import { countRevealed, floodReveal, neighborTable, type Minefield } from './board'
import type { Difficulty } from './difficulty'
import { generateField } from './generate'
import { solveFrom } from './solver'

export type Status = 'ready' | 'playing' | 'won' | 'lost'

export interface GameState {
  difficulty: Difficulty
  status: Status
  mines: Uint8Array | null
  numbers: Uint8Array | null
  revealed: Uint8Array
  flagged: Uint8Array
  exploded: number
  elapsedMs: number
  hintIndex: number
}

export function createGame(difficulty: Difficulty): GameState {
  const n = difficulty.cols * difficulty.rows
  return {
    difficulty,
    status: 'ready',
    mines: null,
    numbers: null,
    revealed: new Uint8Array(n),
    flagged: new Uint8Array(n),
    exploded: -1,
    elapsedMs: 0,
    hintIndex: -1,
  }
}

/** Test helper: start a game on a known minefield. */
export function injectField(state: GameState, field: Minefield): GameState {
  return {
    ...state,
    status: 'playing',
    mines: field.mines,
    numbers: field.numbers,
    hintIndex: -1,
  }
}

export function revealCell(
  state: GameState,
  index: number,
  random: () => number = Math.random,
): GameState {
  if (state.status === 'won' || state.status === 'lost') return state
  if (state.flagged[index]) return state
  if (state.revealed[index]) return chord(state, index)

  let next = state
  if (state.mines === null || state.numbers === null || state.status === 'ready') {
    const field = generateField(state.difficulty, index, { random })
    next = {
      ...state,
      status: 'playing',
      mines: field.mines,
      numbers: field.numbers,
      hintIndex: -1,
    }
  } else {
    next = { ...state, hintIndex: -1 }
  }

  if (next.mines![index]) {
    return { ...next, status: 'lost', exploded: index }
  }

  const revealed = next.revealed.slice()
  floodReveal(asField(next), index, revealed)
  return finish(next, revealed)
}

export function toggleFlag(state: GameState, index: number): GameState {
  if (state.status === 'won' || state.status === 'lost') return state
  if (state.revealed[index]) return state
  const flagged = state.flagged.slice()
  flagged[index] = flagged[index] ? 0 : 1
  return { ...state, flagged, hintIndex: -1 }
}

export function applyHint(state: GameState): GameState {
  if (state.status !== 'playing' || state.mines === null || state.numbers === null) return state
  const result = solveFrom(asField(state), state.revealed)
  let hintIndex = -1
  for (const index of result.opened) {
    if (!state.flagged[index]) {
      hintIndex = index
      break
    }
  }
  if (hintIndex < 0) hintIndex = result.opened[0] ?? -1
  if (hintIndex < 0 || hintIndex === state.hintIndex) return state
  return { ...state, hintIndex }
}

export function tick(state: GameState, deltaMs: number): GameState {
  if (state.status !== 'playing' || deltaMs <= 0) return state
  return { ...state, elapsedMs: state.elapsedMs + deltaMs }
}

export function minesRemaining(state: GameState): number {
  let flags = 0
  for (let i = 0; i < state.flagged.length; i++) flags += state.flagged[i]!
  return state.difficulty.mines - flags
}

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function chord(state: GameState, index: number): GameState {
  if (state.numbers === null || state.mines === null) return state
  if (!state.revealed[index]) return state
  const number = state.numbers[index]!
  if (number <= 0) return state

  const neighbors = neighborTable(state.difficulty.cols, state.difficulty.rows)[index]!
  let flags = 0
  for (let i = 0; i < neighbors.length; i++) {
    if (state.flagged[neighbors[i]!]) flags++
  }
  if (flags !== number) return state

  let next: GameState = { ...state, hintIndex: -1 }
  for (let i = 0; i < neighbors.length; i++) {
    const neighbor = neighbors[i]!
    if (next.revealed[neighbor] || next.flagged[neighbor]) continue
    next = revealCell(next, neighbor)
    if (next.status === 'lost') return next
  }
  return next
}

function finish(state: GameState, revealed: Uint8Array): GameState {
  const safe = state.difficulty.cols * state.difficulty.rows - state.difficulty.mines
  const won = countRevealed(revealed) === safe
  return {
    ...state,
    revealed,
    status: won ? 'won' : 'playing',
    exploded: -1,
  }
}

function asField(state: GameState): Minefield {
  return {
    cols: state.difficulty.cols,
    rows: state.difficulty.rows,
    mineCount: state.difficulty.mines,
    mines: state.mines!,
    numbers: state.numbers!,
  }
}
