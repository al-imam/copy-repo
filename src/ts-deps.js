const { Project } = require("ts-morph");
const path = require("path");
const fs = require("fs");
const { readFiles } = require("./file-reader");
const { parseAccepts } = require("./git-ignore-parser");

function generateTsDeps(entry, cwd, options) {
  const root = path.resolve(cwd);

  const proj = new Project({
    tsConfigFilePath: path.join(root, "tsconfig.json"),
  });

  const source = proj.getSourceFile(
    path.isAbsolute(entry) ? entry : path.join(root, entry)
  );

  if (!source) {
    console.error(`[!] Could not load source file: ${entry}`);
    process.exit(1);
  }

  const visited = new Set();
  const files = [];

  const { ignorePatterns = [], acceptsPatterns = [] } = options;
  const acceptRules = parseAccepts(acceptsPatterns);

  function getDirIgnoreRules(currentDir) {
    const ig = require("ignore")();

    const rootGitignorePath = path.join(root, ".gitignore");
    if (fs.existsSync(rootGitignorePath)) {
      const rootGitIgnoreContent = fs.readFileSync(
        rootGitignorePath,
        "utf8"
      );
      ig.add(rootGitIgnoreContent);
    }

    const localGitignorePath = path.join(currentDir, ".gitignore");

    if (fs.existsSync(localGitignorePath)) {
      const localGitIgnoreContent = fs.readFileSync(
        localGitignorePath,
        "utf8"
      );
      ig.add(localGitIgnoreContent);
    }

    if (ignorePatterns.length > 0) {
      ig.add(ignorePatterns);
    }

    return {
      denies: (filePath) => ig.ignores(filePath),
      accepts: (filePath) => !ig.ignores(filePath),
    };
  }

  function recurse(sf) {
    const filePath = path.normalize(sf.getFilePath());

    if (visited.has(filePath)) return;
    visited.add(filePath);

    const relativePath = path.normalize(
      path.relative(process.cwd(), filePath)
    );

    const fileDir = path.dirname(filePath);
    const dirIgnoreRules = getDirIgnoreRules(fileDir);

    const shouldIgnore = dirIgnoreRules.denies(relativePath);

    if (shouldIgnore && acceptsPatterns.length === 0) {
      return;
    }

    if (
      acceptsPatterns.length > 0 &&
      !acceptRules.accepts(relativePath)
    ) {
      return;
    }

    if (filePath.startsWith(root)) {
      files.push(filePath);
    }

    sf.getImportDeclarations().forEach((decl) => {
      const imp = decl.getModuleSpecifierSourceFile();

      if (imp) {
        const impPath = path.normalize(imp.getFilePath());

        const impRelativePath = path.normalize(
          path.relative(process.cwd(), impPath)
        );

        const impDir = path.normalize(path.dirname(impPath));
        const impIgnoreRules = getDirIgnoreRules(impDir);

        const impShouldIgnore =
          impIgnoreRules.denies(impRelativePath);

        if (impShouldIgnore && acceptsPatterns.length === 0) return;

        if (
          acceptsPatterns.length > 0 &&
          !acceptRules.accepts(impRelativePath)
        ) {
          return;
        }

        if (impPath.startsWith(root)) {
          recurse(imp);
        }
      }
    });
  }

  recurse(source);

  const { content, fileTree } = readFiles(root, {
    ...options,
    specificFiles: files,
    maxDepth: options.maxDepth || Infinity,
    tree: options.tree || false,
  });

  return { content, fileTree };
}

module.exports = { generateTsDeps };
