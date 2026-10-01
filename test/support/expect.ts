import assert from 'node:assert/strict';

/**
 * Minimal Jest-style `expect` over node:assert so the Jianghu causality suites
 * run under the repo's existing `node:test` runner without a new dependency.
 * Only the matchers those suites use are implemented.
 */
function matchers(actual: any, negate: boolean) {
  const includes = (expected: unknown) =>
    typeof actual === 'string'
      ? actual.includes(String(expected))
      : Array.isArray(actual) && actual.includes(expected);
  return {
    toBe: (expected: unknown) => assert.strictEqual(actual, expected),
    toBeDefined: () => assert.notStrictEqual(actual, undefined),
    toHaveLength: (length: number) => assert.strictEqual(actual?.length, length),
    toBeGreaterThan: (n: number) => assert.ok(actual > n, `expected ${actual} > ${n}`),
    toBeLessThan: (n: number) => assert.ok(actual < n, `expected ${actual} < ${n}`),
    toBeLessThanOrEqual: (n: number) => assert.ok(actual <= n, `expected ${actual} <= ${n}`),
    toContain: (expected: unknown) =>
      negate
        ? assert.ok(!includes(expected), `expected ${JSON.stringify(actual)} not to contain ${String(expected)}`)
        : assert.ok(includes(expected), `expected ${JSON.stringify(actual)} to contain ${String(expected)}`),
  };
}

export function expect(actual: unknown) {
  return { ...matchers(actual, false), not: matchers(actual, true) };
}
