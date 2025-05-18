#!/usr/bin/env node

const { program } = require("commander");
const { readFiles, copyToUserClipboard } = require("./file-reader");
const { generateTsDeps } = require("./ts-deps");
const fs = require("fs");

program
  .name("copy-codes")
  .description(
    "Scans a project directory and outputs code with line counts and file separators. Supports filtering, markdown formatting, and clipboard output"
  )
  .addHelpText(
    "before",
    `Overview:
  Use 'copy-codes' to extract and format code from your project. By default, it scans the current directory and outputs to a file named '__code'
  Use the 'ts-deps' subcommand to include a TypeScript file and its dependencies
  Run any command with --help for detailed options
`
  )
  .option(
    "-c, --clipboard",
    "Copy output to the clipboard instead of saving to a file overrides --output",
    false
  )
  .option(
    "-o, --output <filename>",
    "Save output to this file (default: '__code'). With --markdown, '.md' is appended if not present",
    "__code"
  )
  .option(
    "-i, --ignore <patterns...>",
    "Exclude files/folders using .gitignore style patterns (example: 'node_modules') ignored if --accepts is used",
    []
  )
  .option(
    "-a, --accepts <patterns...>",
    "Include only files/folders matching these .gitignore style patterns (example: '*.ts') overrides --ignore",
    []
  )
  .option(
    "-m, --markdown",
    "Format output as markdown with code blocks (default: plain text)",
    false
  )
  .option(
    "-d, --max-depth <number>",
    "Limit directory scan depth (example: 1 = top level only, 2 = one subfolder deep). default: infinite",
    parseInt,
    Infinity
  )
  .option(
    "-t, --tree",
    "Include a directory tree diagram in the output",
    false
  )
  .addHelpText(
    "after",
    `
Examples:
  Scan current directory, save to 'code.txt', ignore specific folders:
    $ copy-codes -o code.txt -i node_modules dist

  Scan with markdown formatting and include a directory tree:
    $ copy-codes -m -t

  Copy TypeScript file and its dependencies to clipboard:
    $ copy-codes -c ts-deps src/index.ts

Notes:
  - Patterns for --ignore and --accepts use .gitignore style syntax (example: '*.js', 'src/**')
  - If --accepts is set, --ignore is ignored, and only matching files are included
  - markdown output includes code fences with file paths and line counts
  - Use --max-depth to control how deep subdirectories are scanned
`
  )
  .version("0.0.9", "-v, --version", "Output the current version");

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
    "Outputs a TypeScript file and all its recursively imported project files"
  )
  .option(
    "-c, --cwd <dir>",
    "Set project root directory (must contain tsconfig.json). default: process.cwd()",
    process.cwd()
  )
  .addHelpText(
    "after",
    `
Examples:
  Output 'src/index.ts' and its dependencies:
    $ copy-codes ts-deps src/index.ts

  Use custom project root and markdown output:
    $ copy-codes -m ts-deps src/index.ts --cwd ./ex-project

Notes:
  - Requires a valid tsconfig.json in the project root
  - Supports all main command options (example: --ignore, --accepts, --tree)
`
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
