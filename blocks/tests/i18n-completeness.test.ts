import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceRoot = path.join(packageRoot, "src");
const i18nRoot = path.join(sourceRoot, "i18n");

function readVocabulary(filename: string): Record<string, string> {
  const source = ts.createSourceFile(
    filename,
    fs.readFileSync(filename, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const vocabulary: Record<string, string> = {};

  const declaration = source.statements.find(
    (statement): statement is ts.VariableStatement =>
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.some(
        (item) =>
          ts.isIdentifier(item.name) && item.name.text.endsWith("Dict"),
      ),
  );
  const initializer = declaration?.declarationList.declarations.find(
    (item) => ts.isIdentifier(item.name) && item.name.text.endsWith("Dict"),
  )?.initializer;

  assert.ok(
    initializer && ts.isObjectLiteralExpression(initializer),
    `${path.basename(filename)} does not export a dictionary object`,
  );

  for (const property of initializer.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      (ts.isIdentifier(property.name) ||
        ts.isStringLiteralLike(property.name)) &&
      ts.isStringLiteralLike(property.initializer)
    ) {
      vocabulary[property.name.text] = property.initializer.text;
    }
  }

  return vocabulary;
}

const vocabularies = Object.fromEntries(
  fs
    .readdirSync(i18nRoot)
    .filter((filename) => /^[a-z]{2}\.ts$/.test(filename))
    .map((filename) => [
      path.basename(filename, ".ts"),
      readVocabulary(path.join(i18nRoot, filename)),
    ]),
);
const enDict = vocabularies.en;

assert.ok(enDict, "English vocabulary is missing");

function collectSourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "i18n" ? [] : collectSourceFiles(filename);
    }
    return /\.tsx?$/.test(entry.name) ? [filename] : [];
  });
}

function collectStringLiterals(node: ts.Node, keys: Set<string>): void {
  if (ts.isStringLiteralLike(node) && node.text.length > 0) {
    keys.add(node.text);
    return;
  }
  ts.forEachChild(node, (child) => collectStringLiterals(child, keys));
}

function collectStaticI18nKeys(): Set<string> {
  const keys = new Set<string>();

  for (const filename of collectSourceFiles(sourceRoot)) {
    const source = ts.createSourceFile(
      filename,
      fs.readFileSync(filename, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );

    const visit = (node: ts.Node): void => {
      const firstArgument = ts.isCallExpression(node) ? node.arguments[0] : null;
      const isDirectI18nCall =
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.expression.getText(source) === "I18n" &&
        node.expression.name.text === "get";
      const isValidationHelperCall =
        filename.endsWith(`${path.sep}runtime${path.sep}validation.ts`) &&
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "t";
      const isErrorTranslationCall =
        filename.endsWith(`${path.sep}runtime${path.sep}errorHandling.ts`) &&
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "translate";

      if (
        (isDirectI18nCall ||
          isValidationHelperCall ||
          isErrorTranslationCall) &&
        firstArgument &&
        ts.isStringLiteralLike(firstArgument)
      ) {
        keys.add(firstArgument.text);
      }

      if (
        filename.endsWith(`${path.sep}runtime${path.sep}errorHandling.ts`) &&
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === "messages" &&
        node.initializer &&
        ts.isObjectLiteralExpression(node.initializer)
      ) {
        for (const property of node.initializer.properties) {
          if (ts.isPropertyAssignment(property)) {
            collectStringLiterals(property.initializer, keys);
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  return keys;
}

test("every Flow locale matches the English vocabulary", () => {
  const expectedKeys = Object.keys(enDict).sort();

  for (const [locale, vocabulary] of Object.entries(vocabularies)) {
    assert.deepEqual(
      Object.keys(vocabulary).sort(),
      expectedKeys,
      `${locale} vocabulary differs from English`,
    );
    for (const [key, value] of Object.entries(vocabulary)) {
      assert.equal(
        typeof value === "string" && value.trim().length > 0,
        true,
        `${locale} has an empty translation for ${key}`,
      );
    }
  }
});

test("every static Flow runtime I18n key exists in the English vocabulary", () => {
  const missing = [...collectStaticI18nKeys()]
    .filter((key) => !(key in enDict))
    .sort();

  assert.deepEqual(missing, []);
});
