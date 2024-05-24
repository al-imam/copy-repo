#!/usr/bin/env node

const { program } = require("commander");
const { readFiles } = require("./file-reader");

program
  .option("-c, --clipboard", "Copy content to clipboard", false)
  .option("-o, --output <filename>", "Output file name", "__code")
  .option(
    "-i, --ignore <patterns...>",
    "Regex patterns to ignore files/directories follow .gitignore syntax",
    []
  )
  .option(
    "-a, --accepts <patterns...>",
    "Patterns to accept files/directories. If specified, ignore patterns are disregarded.",
    []
  )
  .option("-m, --markdown", "Output in Markdown format", false)
  .description(
    "A CLI tool to copy project code with line counts and file separators."
  )
  .version("0.0.0");

program.parse();

const options = program.opts();

function fileName(name) {
  if (!options.markdown) {
    return name;
  }

  if (!name.endsWith(".md")) {
    return `${name}.md`;
  }

  return name;
}

readFiles(process.cwd(), {
  ignorePatterns: options.ignore,
  acceptsPatterns: options.accepts,
  copyToClipboard: options.clipboard,
  outputFileName: fileName(options.output),
  outputInMarkdown: options.markdown,
});
