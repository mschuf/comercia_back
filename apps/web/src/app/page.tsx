import { redirect } from "next/navigation";

// App interna para el equipo comercial: la puerta de entrada es el login.
export default function Home() {
  redirect("/login");
}
