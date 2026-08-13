/** Remove server-only model identifiers before serializing public responses. */
export function withoutInternalModelVersion<T extends object>(value: T): Omit<T, "modelVersion"> {
  const publicValue: T & { modelVersion?: unknown } = { ...value };
  delete publicValue.modelVersion;
  return publicValue;
}
