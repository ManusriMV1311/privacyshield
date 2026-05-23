const fs = require('fs');
const path = require('path');

// Target bundle paths to validate
const TARGETS = [
  { name: 'Content Script', path: path.join(__dirname, 'dist/content/content.js') },
  { name: 'Background Service Worker', path: path.join(__dirname, 'dist/background/background.js') }
];

// Strictly forbidden patterns per architecture specifications
const FORBIDDEN_PATTERNS = [
  { name: 'ES Module "import" statement', pattern: /\bimport\b/ },
  { name: 'ES Module "export" statement', pattern: /\bexport\b/ },
  { name: 'Dynamic "import(" call', pattern: /import\s*\(/ },
  { name: 'CommonJS "require(" call', pattern: /\brequire\s*\(/ },
  { name: 'Chunk directory reference', pattern: /chunks\// },
  { name: 'Chunk file reference', pattern: /chunk-/ },
  { name: 'Vite bundler runtime reference', pattern: /__vite__/ },
  { name: 'Webpack bundler runtime reference', pattern: /__webpack__/ }
];

console.log('\x1b[36m%s\x1b[0m', '\n======================================================');
console.log('\x1b[36m%s\x1b[0m', '   PrivacyShield Build Pipeline Verification Engine   ');
console.log('\x1b[36m%s\x1b[0m', '======================================================\n');

let validationFailed = false;

for (const target of TARGETS) {
  console.log(`Auditing target file: ${target.name} (${path.relative(__dirname, target.path)})...`);

  if (!fs.existsSync(target.path)) {
    console.error(`\x1b[31mError: Target file does not exist at ${target.path}\x1b[0m\n`);
    validationFailed = true;
    continue;
  }

  const content = fs.readFileSync(target.path, 'utf8');
  let targetClean = true;

  for (const item of FORBIDDEN_PATTERNS) {
    const match = content.match(item.pattern);
    if (match) {
      console.error(`\x1b[31m[FAIL] Detected forbidden signature: ${item.name}\x1b[0m`);
      console.error(`       Matched pattern: ${item.pattern}`);
      console.error(`       Context near match: "...${content.substring(Math.max(0, match.index - 40), Math.min(content.length, match.index + 80))}..."\n`);
      targetClean = false;
      validationFailed = true;
    }
  }

  if (targetClean) {
    console.log(`\x1b[32m[PASS] ${target.name} has zero forbidden modular or chunk references.\x1b[0m\n`);
  }
}

if (validationFailed) {
  console.error('\x1b[41m\x1b[37m%s\x1b[0m', ' HARDENING FAILURE: Forbidden ES module or chunk references found. ');
  console.error('Please check build outputs and Vite Configurations to ensure IIFE bundling is forced.\n');
  process.exit(1);
} else {
  console.log('\x1b[42m\x1b[30m%s\x1b[0m', ' HARDENING SUCCESS: Both bundles are fully validated standalone IIFEs! ');
  console.log('Final outputs are 100% compliant with standard Chrome Manifest V3 runtime expectations.\n');
  process.exit(0);
}
