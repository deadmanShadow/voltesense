/**
 * RuntimeCard — estimated runtime remaining on battery.
 *
 * MUST (frontend.md §9). Hidden when on mains (`seconds === 0` would be
 * confusing — runtime is undefined while online), but we don't *hide* the
 * card; instead we render "On mains" so the grid layout stays stable.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRuntime } from "@/lib/formatters";

export interface RuntimeCardProps {
  seconds: number | null;
  /** True when the UPS is currently reporting mains power. */
  onMains: boolean;
}

export function RuntimeCard({ seconds, onMains }: RuntimeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimated Runtime</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-2xl font-semibold tracking-tight">
          {onMains ? "On mains" : formatRuntime(seconds)}
        </span>
      </CardContent>
    </Card>
  );
}
