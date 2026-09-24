/**
 * VoltageCard — generic single-value tile used twice on the dashboard
 * (Input Voltage + Output Voltage). MUST (frontend.md §9).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatVoltage } from "@/lib/formatters";

export interface VoltageCardProps {
  label: string;
  voltage: number | null;
}

export function VoltageCard({ label, voltage }: VoltageCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-2xl font-semibold tracking-tight">{formatVoltage(voltage)}</span>
      </CardContent>
    </Card>
  );
}
