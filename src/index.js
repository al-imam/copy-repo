#!/usr/bin/env node

const { program } = require("commander");
const { readFiles, copyToUserClipboard } = require("./file-reader");
const { generateTsDeps } = require("./ts-deps");
const fs = require("fs");

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
  .option(
    "-d, --max-depth <number>",
    "Maximum directory depth to scan",
    parseInt,
    Infinity
  )
  .option(
    "-t, --tree",
    "Include file tree at the top of the output",
    false
  )
  .description(
    "A CLI tool to copy project code with line counts and file separators."
  )
  .version("0.0.3");

function outputContent({ content, fileTree }, options) {
  let outputFile = options.output;

  if (options.markdown && !outputFile.endsWith(".md")) {
    outputFile += ".md";
  }

  const finalContent = fileTree
    ? `${fileTree}\n\n${content}`
    : content;

  if (options.clipboard) {
    copyToUserClipboard(finalContent);
    console.log("Content copied to clipboard.");
  } else {
    fs.writeFileSync(outputFile, finalContent);
    console.log(`Content written to ${outputFile}`);
  }
}

program.action(() => {
  const options = program.opts();

  const result = readFiles(process.cwd(), {
    ignorePatterns: options.ignore,
    acceptsPatterns: options.accepts,
    outputInMarkdown: options.markdown,
    maxDepth: options.maxDepth,
    tree: options.tree,
  });

  outputContent(result, options);
});

program
  .command("ts-deps <file>")
  .description(
    "Generate output of a TS file + recursive project imports"
  )
  .option(
    "-c, --cwd <dir>",
    "project root (with tsconfig.json)",
    process.cwd()
  )
  .action((file, cmdOptions) => {
    const options = program.opts();

    const result = generateTsDeps(file, cmdOptions.cwd, {
      ignorePatterns: options.ignore,
      acceptsPatterns: options.accepts,
      outputInMarkdown: options.markdown,
      maxDepth: options.maxDepth,
      tree: options.tree,
    });

    outputContent(result, options);
  });

program.parse();
