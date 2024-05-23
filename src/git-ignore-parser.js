const fs = require("fs");
const gitignore = require("gitignore-parser");

function parseGitIgnore(morePatterns = []) {
  if (fs.existsSync(".gitignore")) {
    const gitIgnoreContent = fs.readFileSync(".gitignore", "utf8");
    console.log(
      gitignore.parse(gitIgnoreContent + "\n" + morePatterns.join("\n")),
      gitIgnoreContent + "\n" + morePatterns.join("\n")
    );

    return gitignore.compile(gitIgnoreContent + "\n" + morePatterns.join("\n"));
  } else {
    return gitignore.compile(morePatterns.join("\n"));
  }
}

module.exports = { parseGitIgnore };
