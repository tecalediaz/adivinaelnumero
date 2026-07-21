import Link from "next/link";
import { HomeForm } from "@/components/HomeForm";
import { GAME_META } from "@/lib/types";

export default function ViboritaHomePage() {
  const meta = GAME_META.viborita;

  return (
    <main className="page">
      <h1 className="brand">{meta.title}</h1>
      <p className="subtitle">{meta.description}</p>
      <p className="subtitle" style={{ marginTop: "-1.5rem" }}>
        +100 por comida · meta al azar entre 2000 y 5000 · si chocás renacés chico
        pero seguís sumando.
      </p>
      <HomeForm gameType="viborita" />
      <Link href="/" className="back-link">
        ← Volver al menú
      </Link>
    </main>
  );
}
