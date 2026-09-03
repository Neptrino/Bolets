export function commonNameDisplayLabel(value: string, locale = "ca-ES") {
  const [initial = "", ...rest] = [...value];
  return `${initial.toLocaleUpperCase(locale)}${rest.join("")}`;
}
