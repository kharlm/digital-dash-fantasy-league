import { Card, CardContent } from "@/components/ui/card";

export function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card className="ring-navy-600">
      <CardContent className="space-y-1">
        <p className="text-xs font-medium tracking-[0.15em] text-fg-subtle uppercase">{label}</p>
        <p className="font-display text-3xl font-semibold text-gold-400">{value}</p>
        {detail ? <p className="text-sm text-fg-muted">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
