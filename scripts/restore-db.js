const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const backupsDir = path.join(rootDir, 'backups');

let file = process.argv[2];

if (!file) {
  const files = fs
    .readdirSync(backupsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  if (files.length === 0) {
    console.error('No backup files found in backups/. Pass a file path as an argument, e.g. npm run db:restore -- backups/agent_dashboard_2026-08-26.sql');
    process.exit(1);
  }
  file = path.join(backupsDir, files[files.length - 1]);
  console.log(`No file specified — using most recent backup: ${file}`);
} else if (!path.isAbsolute(file)) {
  file = path.join(rootDir, file);
}

const inFd = fs.openSync(file, 'r');

console.log(`Restoring database from ${file} ...`);

execSync('docker compose exec -T postgres psql -U postgres -d agent_dashboard', {
  cwd: rootDir,
  stdio: [inFd, 'inherit', 'inherit'],
});

fs.closeSync(inFd);
console.log('Restore complete.');
