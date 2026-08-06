import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./ui/table";
import { METRICS, formatMetricValue } from "../constants/metrics";

/**
 * DataTable
 * Compact, scannable synchronized sample data grid. Row selection is
 * mirrored bidirectionally with the SpatialMap: clicking a row here
 * highlights the corresponding marker, and clicking a marker on the
 * map highlights the corresponding row here.
 */
export default function DataTable({ records, selectedLabId, onRowSelect }) {
  return (
    <div className="flex h-full flex-col rounded-sm border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
          Sample Data
        </h2>
        <span className="text-[11px] text-muted-foreground">{records.length} records</span>
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lab ID</TableHead>
              <TableHead>Field</TableHead>
              {METRICS.map((m) => (
                <TableHead key={m.key}>{m.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((row) => (
              <TableRow
                key={row.lab_id}
                data-state={String(row.lab_id) === String(selectedLabId) ? "selected" : undefined}
                onClick={() => onRowSelect(row)}
                className="cursor-pointer"
              >
                <TableCell className="font-semibold text-primary">{row.lab_id}</TableCell>
                <TableCell>{row.field_ref}</TableCell>
                {METRICS.map((m) => (
                  <TableCell key={m.key}>{formatMetricValue(row[m.key], m.precision)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
