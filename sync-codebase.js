const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('make-sure-the-content-inside-matches-the-codebase.md', 'utf8');
const lines = content.split('\n');

let currentFile = null;
let currentLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/^=== FILE: \.\/(.+?) ===\r?$/);
  
  if (match) {
    // Save previous file if exists
    if (currentFile && currentLines.length > 0) {
      writeFile(currentFile, currentLines);
    }
    currentFile = match[1];
    currentLines = [];
  } else {
    if (currentFile) {
      currentLines.push(line);
    }
  }
}

// Save last file
if (currentFile && currentLines.length > 0) {
  writeFile(currentFile, currentLines);
}

function writeFile(filePath, lines) {
  // Skip package-lock.json as it's too large and unnecessary to rewrite manually
  if (filePath.includes('package-lock.json')) {
    console.log('Skipping package-lock.json');
    return;
  }
  
  // Also, avoid overwriting the sync script or MD file
  if (filePath.includes('sync-codebase.js') || filePath.includes('make-sure-the-content-inside-matches-the-codebase.md')) {
    return;
  }

  // Trim trailing empty line from the split if it's there
  let fileContent = lines.join('\n');
  if (fileContent.endsWith('\n')) {
    fileContent = fileContent.slice(0, -1);
  }

  const fullPath = path.resolve(__dirname, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, fileContent, 'utf8');
  console.log(`Successfully restored/synchronized: ${filePath}`);
}
