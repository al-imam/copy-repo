const fs = require("fs");
const ignore = require("ignore");

function parseGitIgnore(morePatterns = []) {
  const ig = ignore();

  if (fs.existsSync(".gitignore")) {
    const gitIgnoreContent = fs.readFileSync(".gitignore", "utf8");
    ig.add(gitIgnoreContent);
  }

  if (morePatterns.length > 0) {
    ig.add(morePatterns);
  }

  return {
    denies: (filePath) => ig.ignores(filePath),
    accepts: (filePath) => !ig.ignores(filePath),
  };
}

function parseAccepts(patterns = []) {
  const ig = ignore();

  if (patterns.length > 0) {
    ig.add(patterns);
  }

  return {
    denies: (filePath) => ig.ignores(filePath),
    accepts: (filePath) => !ig.ignores(filePath),
  };
}

module.exports = { parseGitIgnore, parseAccepts };
