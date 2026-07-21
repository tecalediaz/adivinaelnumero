import { GuessEntry } from "@/lib/types";

function hintClass(hint: GuessEntry["hint"]): string {
  switch (hint) {
    case "higher":
      return "hint-higher";
    case "lower":
      return "hint-lower";
    case "correct":
      return "hint-correct";
  }
}

function hintText(hint: GuessEntry["hint"]): string {
  switch (hint) {
    case "higher":
      return "Más alto";
    case "lower":
      return "Más bajo";
    case "correct":
      return "¡Correcto!";
  }
}

interface GuessHistoryProps {
  guesses: GuessEntry[];
}

export function GuessHistory({ guesses }: GuessHistoryProps) {
  if (guesses.length === 0) {
    return (
      <div className="history">
        <h3>Historial</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Todavía no hay intentos.
        </p>
      </div>
    );
  }

  return (
    <div className="history">
      <h3>Historial de intentos</h3>
      <ul className="history-list">
        {[...guesses].reverse().map((guess, index) => (
          <li key={`${guess.playerId}-${guess.value}-${index}`} className="history-item">
            <span className="nickname">{guess.nickname}</span>
            <span className="value">{guess.value}</span>
            <span className={hintClass(guess.hint)}>{hintText(guess.hint)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
