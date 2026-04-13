import { getJson } from "./http";

export type NbuEurUahDto = {
  rateUahPerEur: number;
  exchangeDate: string;
};

export function fetchNbuEurUah(): Promise<NbuEurUahDto> {
  return getJson<NbuEurUahDto>("/api/admin/fx/eur-uah");
}
