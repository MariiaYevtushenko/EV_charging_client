/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RESERVATION_FEE_UAH?: string;
  readonly VITE_ASSUMED_CHARGE_KW?: string;
  readonly VITE_EUR_TO_UAH?: string;
  readonly VITE_ADMIN_NETWORK_BOOKINGS_BULK_PAGE_SIZE?: string;
  readonly VITE_ADMIN_NETWORK_SESSIONS_BULK_PAGE_SIZE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
