const fs = require("fs");

function processFile(filePath) {
  const relativeFilePath = path.relative(process.cwd(), filePath);
  console.log(`Reading file: ${relativeFilePath}`);

  const fileContent = fs.readFileSync(filePath, "utf8");
  const lineCount = fileContent.split("\n").length;

  fileInfo[relativeFilePath] = { content: fileContent, lineCount };
}

module.exports = { processFile };
