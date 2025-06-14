
type DemoTableProps = {
  columns: string[];
  data: string[][];
};

export function DemoTable({ columns, data }: DemoTableProps) {
  return (
    <div className="overflow-x-auto rounded border bg-white shadow">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-4 py-2 font-semibold">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 1 ? "bg-muted/50" : ""}
            >
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
