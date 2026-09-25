/**
 * VoltageCard — generic single-value tile used twice on the dashboard
 * (Input Voltage + Output Voltage). MUST (frontend.md §9, changesFrontend.md §6).
 *
 * Migration notes:
 *   - Picks an icon from lucide based on the label: `PlugZap` for input
 *     (mains coming in), `Plug` for output. Pure decoration.
 *   - All existing props (`label`, `voltage`) unchanged.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plug, PlugZap } from "lucide-react";
import { formatVoltage } from "@/lib/formatters";

export interface VoltageCardProps {
  label: string;
  voltage: number | null;
}

export function VoltageCard({ label, voltage }: VoltageCardProps) {
  const Icon = label.toLowerCase().startsWith("input") ? PlugZap : Plug;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <span className="text-2xl font-semibold tracking-tight">{formatVoltage(voltage)}</span>
      </CardContent>
    </Card>
  );
}
