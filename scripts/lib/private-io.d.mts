export function parseCliArguments(argv?: string[]): Map<string, string>;
export function externalAbsolutePath(
  value: unknown,
  label: string,
  repositoryRoot?: string,
): string;
export function comparisonOrigin(
  value: string,
  remoteAllowed: boolean,
  label?: string,
): string;
export function runVitestTool(
  testFile: string,
  env: Record<string, string>,
): never;
