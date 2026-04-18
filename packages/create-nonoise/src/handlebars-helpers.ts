export function toPascalCase(input: string): string {
  return input
    .split('-')
    .filter((s) => s.length > 0)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

export function toSnakeCase(input: string): string {
  return input
    .split('-')
    .filter((s) => s.length > 0)
    .join('_');
}
