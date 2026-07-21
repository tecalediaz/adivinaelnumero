import { HomeForm } from "@/components/HomeForm";

export default function HomePage() {
  return (
    <main className="page">
      <h1 className="brand">Adivina el número</h1>
      <p className="subtitle">
        Creá una sala, compartí el código con un amigo y turnense para adivinar
        el número secreto entre 0 y 10000.
      </p>
      <HomeForm />
    </main>
  );
}
