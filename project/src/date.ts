export const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return toKey(new Date());
}

export function parseKey(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function keyOffset(date: string, days: number): string {
  const d = parseKey(date);
  d.setDate(d.getDate() + days);
  return toKey(d);
}

export function weekdayName(date: string): string {
  return WEEKDAYS[parseKey(date).getDay()];
}

export function monthNameOf(date: string): string {
  return MONTHS[parseKey(date).getMonth()];
}

export function formatLong(date: string): string {
  const d = parseKey(date);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}