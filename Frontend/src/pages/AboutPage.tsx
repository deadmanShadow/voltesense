/**
 * AboutPage — MUST (frontend.md §12).
 *
 * Short and direct. The page is mostly static copy, but we wire it into
 * React so future copy changes still re-render correctly under HMR.
 */
import { Link } from "react-router-dom";

export function AboutPage() {
  return (
    <article className="max-w-2xl space-y-4 text-sm text-muted-foreground">
      <header>
        <h1 className="text-xl font-semibold text-foreground">VoltSense</h1>
        <p className="text-sm text-muted-foreground">
          Free, read-only, local-first UPS monitoring.
        </p>
      </header>

      <section className="space-y-3 leading-relaxed">
        <p>
          VoltSense runs on your machine, talks to your UPS over USB or the
          network, and surfaces the readings in a clean browser dashboard.
          Nothing leaves your LAN — there is no cloud account, no telemetry
          upload, no paid API key.
        </p>
        <p>
          The frontend is built with React, TypeScript, and Tailwind. The
          backend is .NET. Realtime updates flow over SignalR; history is
          fetched on demand.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">Privacy</h2>
        <p>
          VoltSense does not collect analytics, does not phone home, and does
          not require an account. The only network traffic is between the
          browser, this frontend, and the backend on the same host.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">License</h2>
        <p>Open-source. See the repository for the full license text.</p>
      </section>

      <footer className="pt-2">
        <Link
          to="/"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          ← Back to the dashboard
        </Link>
      </footer>
    </article>
  );
}
