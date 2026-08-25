import type { ReactNode } from "react";
import styles from "./DataTable.module.css";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  /** Some no empilhamento mobile (dado secundario). */
  hideOnMobile?: boolean;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string;
  emptyMessage?: string;
};

/**
 * Tabela que vira lista empilhada no mobile — cada celula mostra o titulo
 * da coluna a esquerda (via `data-label`) quando a tabela colapsa.
 */
export default function DataTable<T>({
  columns,
  rows,
  getKey,
  emptyMessage = "Nada por aqui ainda.",
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={col.align === "right" ? styles.right : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getKey(row)}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  data-label={col.header}
                  className={[
                    col.align === "right" ? styles.right : "",
                    col.hideOnMobile ? styles.hideMobile : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
