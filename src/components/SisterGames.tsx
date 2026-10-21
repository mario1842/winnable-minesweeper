import { MahjongIcon } from './MahjongIcon'
import { SolitaireIcon } from './SolitaireIcon'

const GAMES = [
  {
    id: 'mahjong',
    href: 'https://mario1842.github.io/winnable-mahjong/',
    title: 'Winnable Mahjong',
    label: 'Mahjong',
    icon: <MahjongIcon className="mahjong-icon" />,
  },
  {
    id: 'solitaire',
    href: 'https://mario1842.github.io/winnable-solitaire/',
    title: 'Winnable Solitaire',
    label: 'Solitaire',
    icon: <SolitaireIcon className="solitaire-icon" />,
  },
] as const

interface SisterGamesProps {
  /** Larger labeled chips (menu) vs compact icon row (HUD). */
  variant?: 'menu' | 'hud'
}

export function SisterGames({ variant = 'menu' }: SisterGamesProps) {
  return (
    <nav className={`sister-games sister-games-${variant}`} aria-label="Other Winnable games">
      {GAMES.map((game) => (
        <a
          key={game.id}
          className={variant === 'hud' ? 'btn btn-ghost sister-btn icon-btn' : 'sister-link'}
          href={game.href}
          title={game.title}
          aria-label={`Play ${game.title}`}
        >
          {game.icon}
          {variant === 'menu' ? (
            <span>
              Also play <strong>Winnable {game.label}</strong>
            </span>
          ) : null}
        </a>
      ))}
    </nav>
  )
}
