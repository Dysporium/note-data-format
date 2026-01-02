const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const versionType = process.argv[2] || 'patch';
const oldVersion = packageJson.version;
const [major, minor, patch] = oldVersion.split('.').map(Number);

let newVersion;
switch (versionType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
  default:
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version bumped from ${oldVersion} to ${newVersion}`);

