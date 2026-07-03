export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950 sm:px-10 dark:bg-zinc-950 dark:text-zinc-50">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
            Comercia workspace
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Prueba de cambios automaticos
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
            El frontend vive en `apps/web`, la API en `apps/api` y la base local
            se levanta con Docker Compose.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Frontend", "Next 16, App Router, Tailwind"],
            ["Backend", "Nest 11, Prisma, Swagger"],
            ["Database", "PostgreSQL via Docker Compose"],
          ].map(([title, detail]) => (
            <div
              key={title}
              className="border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {detail}
              </p>
            </div>
          ))}
        </div>

        <div className="border border-zinc-200 bg-white p-5 text-sm leading-7 text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <p className="font-medium text-zinc-950 dark:text-zinc-50">
            Primeros comandos
          </p>
          <code className="mt-3 block whitespace-pre-wrap font-mono text-xs">
            npm run db:up{"\n"}npm run prisma:migrate{"\n"}npm run dev
          </code>
        </div>
      </section>
    </main>
  );
}
