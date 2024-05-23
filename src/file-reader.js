const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { parseGitIgnore } = require("./git-ignore-parser");

const staticIgnoreRules = [
  ".git",
  "pnpm-lock.yaml",
  "package-lock.json",
  ".gitignore",
];

function copyToClipboard(content) {
  try {
    const isWindows = process.platform === "win32";
    const command = isWindows ? "clip" : "pbcopy";
    execSync(command, { input: content });
  } catch {
    console.log("Failed to copy!");
  }
}

function readFiles(
  dirPath,
  { ignorePatterns, copyToClipboard, outputFileName }
) {
  const fileInfo = {};

  const gitIgnoreRules = parseGitIgnore([
    ...ignorePatterns,
    ...staticIgnoreRules,
    outputFileName,
  ]);

  function shouldIgnore(relativeFilePath) {
    if (gitIgnoreRules.denies(relativeFilePath)) {
      return true;
    }

    return false;
  }

  function _readFiles(currentPath) {
    const files = fs.readdirSync(currentPath);

    for (const file of files) {
      const filePath = path.join(currentPath, file);
      const relativeFilePath = path.relative(process.cwd(), filePath);

      if (shouldIgnore(relativeFilePath)) {
        continue;
      }

      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        _readFiles(filePath);
      } else {
        const fileContent = fs.readFileSync(filePath, "utf8");
        const lineCount = fileContent.split("\n").length;
        fileInfo[relativeFilePath] = { content: fileContent, lineCount };
      }
    }
  }

  _readFiles(dirPath);

  const formattedContent = Object.entries(fileInfo).map(
    ([filePath, { content, lineCount }]) => {
      return `/* File: ${filePath} (${lineCount} lines) */\n\n${content}\n\n/* FILE ENDED HERE */\n\n`;
    }
  );

  const rawString = formattedContent.join("\n");

  if (copyToClipboard) {
    copyToClipboard(rawString);
    console.log("Content copied to clipboard.");
  } else {
    fs.writeFileSync(outputFileName, rawString);
    console.log(`Content written to ${outputFileName}`);
  }
}

module.exports = { readFiles };
