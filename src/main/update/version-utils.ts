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
// @ts-ignore // semver has its own types, but we ignore missing typings for simplicity
import * as semver from 'semver';


/** Return true if `a` is newer than `b`. */
export function isNewer(a: string, b: string): boolean {
  const cleanA = a.replace(/^v/, '');
  const cleanB = b.replace(/^v/, '');
  // semver.gt correctly handles prerelease identifiers (e.g., rc.2 > rc.1)
  // and treats a stable release as newer than any prerelease of the same version.
  return semver.gt(cleanA, cleanB);
}
