import Link from "next/link";
import { HomeForm } from "@/components/HomeForm";
import { GAME_META } from "@/lib/types";

export default function AdivinaHomePage() {
  const meta = GAME_META.adivina;

  return (
    <main className="page">
      <h1 className="brand">{meta.title}</h1>
      <p className="subtitle">{meta.description}</p>
      <HomeForm gameType="adivina" />
      <Link href="/" className="back-link">
        ← Volver al menú
      </Link>
    </main>
  );
}
