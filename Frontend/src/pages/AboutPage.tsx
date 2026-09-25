/**
 * AboutPage — MUST (frontend.md §12, changesFrontend.md §8).
 *
 * Short and direct. The page is mostly static copy, but we wire it into
 * React so future copy changes still re-render correctly under HMR.
 *
 * Migration notes (changesFrontend.md §8):
 *   - Wrapped the page in a shadcn `Card` with a stack list of `Badge`
 *     components for the technology stack (matches the suggested layout
 *     in §8 of the migration doc).
 *   - Data flow unchanged (no hooks consumed).
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STACK = ["React", "TypeScript", "ASP.NET Core", "SignalR", "PostgreSQL"];

export function AboutPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>VoltSense</CardTitle>
          <CardDescription>Free, read-only, local-first UPS monitoring.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
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
          <div className="flex flex-wrap gap-1.5">
            {STACK.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
          <p>
            VoltSense does not collect analytics, does not phone home, and does
            not require an account. The only network traffic is between the
            browser, this frontend, and the backend on the same host.
          </p>
          <p className="text-xs">Open-source. See the repository for the full license text.</p>
        </CardContent>
      </Card>
    </div>
  );
}
