const { Project } = require("ts-morph");
const path = require("path");
const { readFiles } = require("./file-reader");

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

  function recurse(sf) {
    const filePath = path.normalize(sf.getFilePath());

    if (visited.has(filePath)) return;
    visited.add(filePath);

    if (filePath.startsWith(root)) {
      files.push(filePath);
    }

    sf.getImportDeclarations().forEach((decl) => {
      const imp = decl.getModuleSpecifierSourceFile();
      if (imp && path.normalize(imp.getFilePath()).startsWith(root)) {
        recurse(imp);
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
