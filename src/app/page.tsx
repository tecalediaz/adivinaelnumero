import Link from "next/link";
import { GAME_META, GameType } from "@/lib/types";

const GAMES: GameType[] = ["adivina", "tateti", "viborita"];

export default function HomePage() {
  return (
    <main className="page">
      <h1 className="brand">Sala de juegos</h1>
      <p className="subtitle">
        Elegí un juego, creá una sala y compartí el código con un amigo.
      </p>

      <div className="game-menu game-menu-3">
        {GAMES.map((game) => {
          const meta = GAME_META[game];
          return (
            <Link key={game} href={meta.path} className="game-card">
              <span className="game-card-tag">Online · 2 jugadores</span>
              <h2>{meta.title}</h2>
              <p>{meta.description}</p>
              <span className="game-card-cta">Jugar →</span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
