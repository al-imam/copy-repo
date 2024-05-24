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
  .description(
    "A CLI tool to copy project code with line counts and file separators."
  )
  .version("0.0.0");

program.parse();

const options = program.opts();

readFiles(process.cwd(), {
  ignorePatterns: options.ignore,
  copyToClipboard: options.clipboard,
  outputFileName: options.output,
});
