/** Статуси з PostgreSQL enum station_status (DB_script.MD) */

export function stationApiStatusLabel(status: string): string {
  switch (status) {
    case "WORK":
      return "Працює";
    case "NO_CONNECTION":
      return "Немає зв'язку";
    case "FIX":
      return "На ремонті";
    case "ARCHIVED":
      return "Архів";
    default:
      return status;
  }
}

export function stationApiStatusTone(
  status: string
): "success" | "warn" | "muted" {
  switch (status) {
    case "WORK":
      return "success";
    case "FIX":
      return "warn";
    case "NO_CONNECTION":
      return "muted";
    case "ARCHIVED":
      return "muted";
    default:
      return "muted";
  }
}
