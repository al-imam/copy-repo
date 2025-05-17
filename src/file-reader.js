const fs = require("fs");
const path = require("path");
const isTextFile = require("istextfile");
const { parseAccepts } = require("./git-ignore-parser");
const { staticIgnoreRules } = require("./ignores");

function generateFileTree(files, rootDir) {
  const tree = {};

  files.forEach(({ relativePath }) => {
    const parts = relativePath.split(path.sep);
    let current = tree;
    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = index === parts.length - 1 ? null : {};
      }
      if (index < parts.length - 1) {
        current = current[part];
      }
    });
  });

  function formatTree(obj, prefix = "", level = 0) {
    const lines = [];
    const entries = Object.entries(obj).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    entries.forEach(([name, children], index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? "└── " : "├── ";
      lines.push(`${prefix}${connector}${name}`);
      if (children) {
        const newPrefix = prefix + (isLast ? "    " : "│   ");
        lines.push(...formatTree(children, newPrefix, level + 1));
      }
    });

    return lines;
  }

  const treeLines = formatTree(tree);

  return treeLines.length > 0
    ? ["Directory tree:", ...treeLines].join("\n")
    : "";
}

function readFiles(
  dirPath,
  {
    ignorePatterns = [],
    acceptsPatterns = [],
    outputInMarkdown = false,
    specificFiles = null,
    maxDepth = Infinity,
    tree = false,
  } = {}
) {
  const formattedContent = [];
  let filesToProcess = [];

  const acceptRules = parseAccepts(acceptsPatterns);

  function getDirIgnoreRules(currentDir) {
    const ig = require("ignore")();

    ig.add(staticIgnoreRules);

    const rootGitignorePath = path.join(dirPath, ".gitignore");

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

  function scanDirectory(
    currentDir,
    currentDepth,
    parentIgnoreRules
  ) {
    if (currentDepth > maxDepth) return;

    const dirIgnoreRules =
      parentIgnoreRules || getDirIgnoreRules(currentDir);

    const filesList = fs.readdirSync(currentDir, {
      withFileTypes: true,
    });

    filesList.sort((a, b) => a.name.localeCompare(b.name));

    for (const file of filesList) {
      const absolutePath = path.join(currentDir, file.name);
      const relativePath = path.normalize(
        path.relative(process.cwd(), absolutePath)
      );

      if (file.isDirectory()) {
        scanDirectory(absolutePath, currentDepth + 1, dirIgnoreRules);
      } else {
        const shouldIgnore = dirIgnoreRules.denies(relativePath);

        if (shouldIgnore && acceptsPatterns.length === 0) {
          continue;
        }

        if (
          acceptsPatterns.length > 0 &&
          !acceptRules.accepts(relativePath)
        ) {
          continue;
        }

        if (!isTextFile(absolutePath)) {
          continue;
        }

        filesToProcess.push({ absolutePath, relativePath });
      }
    }
  }

  if (specificFiles) {
    filesToProcess = specificFiles
      .map((file) => {
        const absolutePath = path.resolve(file);
        const relativePath = path.normalize(
          path.relative(process.cwd(), absolutePath)
        );

        return { absolutePath, relativePath };
      })
      .filter(({ absolutePath, relativePath }) => {
        const fileDir = path.dirname(absolutePath);
        const dirIgnoreRules = getDirIgnoreRules(fileDir);
        const shouldInclude =
          (!dirIgnoreRules.denies(relativePath) ||
            acceptsPatterns.length > 0) &&
          (acceptsPatterns.length === 0 ||
            acceptRules.accepts(relativePath)) &&
          isTextFile(absolutePath);
        return shouldInclude;
      });
  } else {
    scanDirectory(dirPath, 1, null);
  }

  for (const { absolutePath, relativePath } of filesToProcess) {
    const content = fs.readFileSync(absolutePath, "utf8").trim();
    const lineCount = content.split("\n").length;

    if (outputInMarkdown) {
      formattedContent.push(
        `\`\`\` file="${relativePath.replaceAll(
          path.sep,
          "/"
        )}" lines="${lineCount}"\n${content}\n\`\`\``
      );
    } else {
      formattedContent.push(
        `// ----- ${relativePath.replaceAll(
          path.sep,
          "/"
        )} (${lineCount} lines) -----\n${content}`
      );
    }
  }

  const content = formattedContent.join("\n\n\n");
  const fileTree = tree
    ? generateFileTree(filesToProcess, dirPath)
    : "";

  return { content, fileTree };
}

async function copyToUserClipboard(content) {
  try {
    const clipboardy = await import("clipboardy");
    clipboardy.default.writeSync(content);
  } catch (error) {
    console.error("Failed to copy!");
  }
}

module.exports = { readFiles, copyToUserClipboard };
