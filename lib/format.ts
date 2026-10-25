export const money = (value: number, currency = "SAR") =>
  new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);

export const shortDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`);
  if (!date || Number.isNaN(parsed.getTime())) return "Date not added";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

export const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
