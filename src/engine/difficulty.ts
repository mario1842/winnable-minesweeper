export interface Difficulty {
  id: 'beginner' | 'intermediate' | 'expert'
  name: string
  description: string
  cols: number
  rows: number
  mines: number
  /** Cells the first click must open. */
  minOpening: number
}

export const DIFFICULTIES: readonly Difficulty[] = [
  {
    id: 'beginner',
    name: 'Beginner',
    description: 'A short field for learning the deductions.',
    cols: 9,
    rows: 9,
    mines: 10,
    minOpening: 15,
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    description: 'Room to chain logic across a classic square.',
    cols: 16,
    rows: 16,
    mines: 40,
    minOpening: 30,
  },
  {
    id: 'expert',
    name: 'Expert',
    description: 'The wide classic — still cleared by logic alone.',
    cols: 30,
    rows: 16,
    mines: 99,
    minOpening: 40,
  },
]

export function cellCount(difficulty: Difficulty): number {
  return difficulty.cols * difficulty.rows
}
