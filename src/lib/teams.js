export const TEAM_LETTERS = ['A', 'B', 'C', 'D', 'E'];

function normalizeName(name) {
  return String(name)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/Ａ/g, 'A')
    .replace(/Ｂ/g, 'B')
    .replace(/Ｃ/g, 'C')
    .replace(/Ｄ/g, 'D')
    .replace(/Ｅ/g, 'E');
}

export function teamFromName(name) {
  if (!name) {
    return null;
  }
  const compact = normalizeName(name);
  if (TEAM_LETTERS.includes(compact)) {
    return compact;
  }
  if (/^[A-E]班$/.test(compact)) {
    return compact[0];
  }
  const withClass = compact.match(/([A-E])班/);
  if (withClass) {
    return withClass[1];
  }
  const labeled = compact.match(/(?:CLASS|TEAM|HOUSE)([A-E])$/);
  if (labeled) {
    return labeled[1];
  }
  return null;
}

export function teamImageForName(name) {
  const team = teamFromName(name);
  if (!team) {
    return null;
  }
  return `${process.env.PUBLIC_URL}/teams/${team}.jpg`;
}
