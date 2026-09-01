import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

function propertyName(property, sourceFile) {
  if (!property.name) return null;
  if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) {
    return property.name.text;
  }
  return property.name.getText(sourceFile).replace(/^['"]|['"]$/g, "");
}

function property(object, name, sourceFile) {
  return object.properties.find(
    (candidate) =>
      ts.isPropertyAssignment(candidate) &&
      propertyName(candidate, sourceFile) === name,
  );
}

function stringValue(candidate) {
  if (!candidate || !ts.isPropertyAssignment(candidate)) return null;
  const value = candidate.initializer;
  return ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)
    ? value.text
    : null;
}

function objectValue(candidate) {
  if (!candidate || !ts.isPropertyAssignment(candidate)) return null;
  return ts.isObjectLiteralExpression(candidate.initializer)
    ? candidate.initializer
    : null;
}

function stringArrayValue(candidate) {
  if (!candidate || !ts.isPropertyAssignment(candidate)) return [];
  if (!ts.isArrayLiteralExpression(candidate.initializer)) return [];
  return candidate.initializer.elements
    .filter((element) => ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element))
    .map((element) => element.text);
}

function numberTupleValue(candidate) {
  if (!candidate || !ts.isPropertyAssignment(candidate)) return null;
  if (!ts.isArrayLiteralExpression(candidate.initializer)) return null;
  const values = candidate.initializer.elements
    .filter(ts.isNumericLiteral)
    .map((element) => Number(element.text));
  return values.length === 2 ? values : null;
}

function seasonalityValue(candidate, sourceFile) {
  if (!candidate || !ts.isPropertyAssignment(candidate)) return null;
  if (!ts.isCallExpression(candidate.initializer)) return null;
  const source = candidate.initializer.arguments[0];
  if (!source || !ts.isObjectLiteralExpression(source)) return null;

  return Object.fromEntries(source.properties.flatMap((entry) => {
    if (!ts.isPropertyAssignment(entry)) return [];
    const month = propertyName(entry, sourceFile);
    const activity = stringValue(entry);
    return month && activity ? [[month, activity]] : [];
  }));
}

export function readSpecies(projectRoot) {
  const sourceFiles = [
    path.join(projectRoot, "data", "species.ts"),
    path.join(projectRoot, "data", "reference-species.ts"),
    path.join(projectRoot, "data", "reference-species-additions.ts"),
  ];
  const species = [];

  for (const sourcePath of sourceFiles) {
    const sourceText = fs.readFileSync(sourcePath, "utf8");
    const sourceFile = ts.createSourceFile(
      sourcePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    function visit(node) {
      if (ts.isObjectLiteralExpression(node)) {
        const speciesId = stringValue(property(node, "speciesId", sourceFile));
        const identity = objectValue(property(node, "identity", sourceFile));

        if (speciesId && identity) {
          const commonName = stringValue(property(identity, "commonName", sourceFile));
          const scientificName = stringValue(property(identity, "scientificName", sourceFile));
          const edibility = stringValue(property(identity, "edibility", sourceFile));
          if (!commonName || !scientificName || !edibility) {
            throw new Error(`Incomplete identity for ${speciesId}`);
          }

          const ecologicalConfig = objectValue(property(node, "ecologicalConfig", sourceFile));
          const referenceEcology = objectValue(property(node, "ecology", sourceFile));
          const habitat = ecologicalConfig
            ? objectValue(property(ecologicalConfig, "habitat", sourceFile))
            : null;

          species.push({
            speciesId,
            commonName,
            scientificName,
            edibility,
            habitatTypes: habitat
              ? stringArrayValue(property(habitat, "forestTypes", sourceFile))
              : referenceEcology
                ? stringArrayValue(property(referenceEcology, "habitats", sourceFile))
                : [],
            altitude: habitat
              ? numberTupleValue(property(habitat, "altitude", sourceFile))
              : null,
            seasonality: ecologicalConfig
              ? seasonalityValue(property(ecologicalConfig, "seasonality", sourceFile), sourceFile)
              : null,
            seasonLabel: referenceEcology
              ? stringValue(property(referenceEcology, "season", sourceFile))
              : null,
          });
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  if (new Set(species.map((item) => item.speciesId)).size !== species.length) {
    throw new Error("Duplicate species IDs found in the public catalogue");
  }
  return species;
}

export function readMediaCredits(projectRoot) {
  const sourcePath = path.join(projectRoot, "data", "species-media.ts");
  const sourceText = fs.readFileSync(sourcePath, "utf8");
  const sourceFile = ts.createSourceFile(
    sourcePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const credits = new Map();

  function visit(node) {
    if (ts.isPropertyAssignment(node) && ts.isArrayLiteralExpression(node.initializer)) {
      const speciesId = propertyName(node, sourceFile);
      const firstAsset = node.initializer.elements.find(ts.isObjectLiteralExpression);
      if (speciesId && firstAsset) {
        const attribution = stringValue(property(firstAsset, "attribution", sourceFile));
        const license = stringValue(property(firstAsset, "license", sourceFile));
        const sourceUrl = stringValue(property(firstAsset, "sourceUrl", sourceFile));
        if (attribution && license && sourceUrl) {
          credits.set(speciesId, { attribution, license, sourceUrl });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return credits;
}
