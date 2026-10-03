/** "14:32" for today, "12.09, 14:32" otherwise — data from weeks ago must not read as current. */
export function formatClockTime(timestamp: number, today: Date = new Date()): string {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === today.toDateString()) return time;
  return `${date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })}, ${time}`;
}
