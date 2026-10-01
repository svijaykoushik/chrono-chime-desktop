import { describe, expect, test } from 'vitest';
import { parseVersion, isNewer } from '../../../src/main/update/version-utils';

describe('parseVersion', () => {
  test('removes leading v and splits correctly', () => {
    expect(parseVersion('v1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseVersion('2.0.0')).toEqual({ major: 2, minor: 0, patch: 0 });
  });

  test('handles missing parts gracefully', () => {
    expect(parseVersion('v1')).toEqual({ major: 1, minor: 0, patch: 0 });
    expect(parseVersion('')).toEqual({ major: 0, minor: 0, patch: 0 });
  });
});

describe('isNewer', () => {
  test('detects newer major version', () => {
    expect(isNewer('v2.0.0', 'v1.9.9')).toBe(true);
    expect(isNewer('v1.0.0', 'v2.0.0')).toBe(false);
  });

  test('detects newer minor version', () => {
    expect(isNewer('v1.3.0', 'v1.2.9')).toBe(true);
    expect(isNewer('v1.2.0', 'v1.3.0')).toBe(false);
  });

  test('detects newer prerelease version', () => {
    expect(isNewer('v1.0.0-rc.2', 'v1.0.0-rc.1')).toBe(true);
    expect(isNewer('v1.0.0-rc.1', 'v1.0.0-rc.2')).toBe(false);
    // stable release is newer than any prerelease of same version
    expect(isNewer('v1.0.0', 'v1.0.0-rc.2')).toBe(true);
    expect(isNewer('v1.0.0-rc.2', 'v1.0.0')).toBe(false);
  });
});
