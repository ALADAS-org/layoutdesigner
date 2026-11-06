// The part of `semver` (npm's own library, PLUGIN_DEPENDENCIES.md §1) that Layout Designer
// uses — declared here rather than adding @types/semver as a dependency.
declare module 'semver' {
  export function valid(version: string): string | null;
  export function validRange(range: string): string | null;
  export function satisfies(version: string, range: string): boolean;
}
