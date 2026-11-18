import { cellPadding, cn } from "../components";
import { DURATION } from "../motion";
import type { Density } from "../theme/density";

type SampleRow = { name: string; position: string; number: number };

/** Decorative sample rows (fictional players); the preview is hidden from assistive technology. */
const ROWS: readonly SampleRow[] = [
  { name: "Lindqvist", position: "GK", number: 1 },
  { name: "Åkesson", position: "DF", number: 4 },
  { name: "Bergman", position: "MF", number: 8 },
  { name: "Strand", position: "FW", number: 9 },
];

const TRANSITION = { transitionDuration: `${DURATION.base * 1000}ms` };

type Props = {
  density: Density;
  className?: string;
};

/**
 * A mini table drawn with the real table's row padding (`cellPadding`), so the settings screen
 * shows what a density does. Padding eases over `DURATION.base`; with reduced motion it is instant.
 */
export function DensityPreview({ density, className }: Props) {
  const cell = cn(
    cellPadding(density),
    "px-3 transition-[padding] motion-reduce:transition-none first:font-medium last:text-right",
  );
  return (
    <table
      aria-hidden="true"
      data-testid="density-preview"
      data-density={density}
      className={cn(
        "w-full border-collapse overflow-hidden rounded-lg border border-line bg-surface text-[15px] tabular-nums",
        className,
      )}
    >
      <thead>
        <tr className="border-b border-line">
          {[0, 1, 2].map((i) => (
            <th key={i} className="px-3 py-2 text-left">
              <span className="block h-2 w-8 rounded-pill bg-line" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row) => (
          <tr key={row.number} className="border-b border-line last:border-b-0">
            <td className={cell} style={TRANSITION}>
              {row.name}
            </td>
            <td className={cn(cell, "text-muted")} style={TRANSITION}>
              {row.position}
            </td>
            <td className={cell} style={TRANSITION}>
              {row.number}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
