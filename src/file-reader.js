const fs = require("fs");
const path = require("path");
const isTextFile = require("istextfile");
const {
  parseGitIgnore,
  parseAccepts,
} = require("./git-ignore-parser");

function readFiles(
  dirPath,
  {
    ignorePatterns = [],
    acceptsPatterns = [],
    outputInMarkdown = false,
    specificFiles = null,
  } = {}
) {
  const gitIgnoreRules = parseGitIgnore(ignorePatterns);
  const acceptRules = parseAccepts(acceptsPatterns);
  const formattedContent = [];
  let filesToProcess = [];

  if (specificFiles) {
    filesToProcess = specificFiles.map((file) => ({
      absolutePath: path.resolve(file),
      relativePath: path
        .relative(process.cwd(), file)
        .replace(/\\/g, "/"),
    }));
  } else {
    const filesList = fs.readdirSync(dirPath, {
      withFileTypes: true,
    });

    filesList.sort((a, b) => a.name.localeCompare(b.name));

    filesToProcess = filesList
      .filter((file) => !file.isDirectory())
      .map((file) => ({
        absolutePath: path.join(dirPath, file.name),
        relativePath: path
          .relative(process.cwd(), path.join(dirPath, file.name))
          .replace(/\\/g, "/"),
      }));
  }

  for (const { absolutePath, relativePath } of filesToProcess) {
    const shouldIgnore = gitIgnoreRules.denies(relativePath);

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

    const content = fs.readFileSync(absolutePath, "utf8").trim();
    const lineCount = content.split("\n").length;

    if (outputInMarkdown) {
      formattedContent.push(
        `\`\`\` file="${relativePath}" lines="${lineCount}"\n${content}\n\`\`\``
      );
    } else {
      formattedContent.push(
        `// ----- ${relativePath} (${lineCount} lines) -----\n${content}`
      );
    }
  }

  return formattedContent.join("\n\n\n");
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
