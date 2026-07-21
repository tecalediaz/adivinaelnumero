import Link from "next/link";
import { HomeForm } from "@/components/HomeForm";
import { GAME_META } from "@/lib/types";

export default function PptHomePage() {
  const meta = GAME_META.ppt;

  return (
    <main className="page">
      <h1 className="brand">{meta.title}</h1>
      <p className="subtitle">{meta.description}</p>
      <HomeForm gameType="ppt" />
      <Link href="/" className="back-link">
        ← Volver al menú
      </Link>
    </main>
  );
}
