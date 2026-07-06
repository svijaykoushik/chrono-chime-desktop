/** Simple semantic version parser and comparator. */
export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

/** Parse a version string like "v1.2.3" or "1.2.3" into a SemVer object. */
export function parseVersion(v: string): SemVer {
  const clean = v.replace(/^v/, '');
  const parts = clean.split('.').map((p) => Number(p));
  return { major: parts[0] ?? 0, minor: parts[1] ?? 0, patch: parts[2] ?? 0 };
}

/** Return true if `a` is newer than `b`. */
export function isNewer(a: string, b: string): boolean {
  const av = parseVersion(a);
  const bv = parseVersion(b);
  if (av.major !== bv.major) return av.major > bv.major;
  if (av.minor !== bv.minor) return av.minor > bv.minor;
  return av.patch > bv.patch;
}
