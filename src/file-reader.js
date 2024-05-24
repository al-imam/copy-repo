const fs = require("fs");
const path = require("path");
const { parseGitIgnore, parseAccepts } = require("./git-ignore-parser");
const isTextFile = require("istextfile");

const staticIgnoreRules = [
  ".git",
  "pnpm-lock.yaml",
  "package-lock.json",
  ".gitignore",
];

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

async function copyToUserClipboard(content) {
  try {
    const clipboardy = await import("clipboardy");
    clipboardy.default.writeSync(content);
  } catch (error) {
    console.error("Failed to copy!");
  }
}

function readFiles(
  dirPath,
  {
    ignorePatterns,
    copyToClipboard,
    outputFileName,
    outputInMarkdown,
    acceptsPatterns,
  }
) {
  const fileInfo = {};

  const gitIgnoreRules = parseGitIgnore([
    ...ignorePatterns,
    ...staticIgnoreRules,
    outputFileName,
  ]);

  const acceptRules = parseAccepts(acceptsPatterns);

  function shouldIgnore(relativeFilePath) {
    if (gitIgnoreRules.denies(relativeFilePath)) {
      return true;
    }

    return false;
  }

  async function _readFiles(currentPath) {
    const files = fs.readdirSync(currentPath);

    for (const file of files) {
      const filePath = path.join(currentPath, file);
      const relativeFilePath = path.relative(process.cwd(), filePath);

      if (shouldIgnore(relativeFilePath) && acceptsPatterns.length === 0) {
        continue;
      }

      if (acceptsPatterns.length > 0 && !acceptRules.denies(relativeFilePath)) {
        continue;
      }

      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        _readFiles(filePath);
      } else {
        if (!isTextFile(filePath)) continue;

        const fileContent = fs.readFileSync(filePath, "utf8");
        const lineCount = fileContent.split("\n").length;
        const fileExt = path.extname(filePath);

        fileInfo[normalizePath(relativeFilePath)] = {
          content: fileContent.trim(),
          lineCount,
          extension: fileExt,
          ...stats,
        };
      }
    }
  }

  _readFiles(dirPath);

  const formattedContent = Object.entries(fileInfo).map(
    ([filePath, { content, lineCount, extension }]) => {
      if (outputInMarkdown) {
        return `\`\`\`${extension.replace(
          ".",
          ""
        )} file="${filePath}" \n${content}\n\`\`\``;
      }
      return `/* File: ${filePath} (${lineCount} lines) */\n\n${content}\n\n/* FILE ENDED HERE */`;
    }
  );

  const rawString = formattedContent.join("\n\n\n");

  if (copyToClipboard) {
    copyToUserClipboard(rawString);
    console.log("Content copied to clipboard.");
  } else {
    fs.writeFileSync(outputFileName, rawString);
    console.log(`Content written to ${outputFileName}`);
  }
}

module.exports = { readFiles };
