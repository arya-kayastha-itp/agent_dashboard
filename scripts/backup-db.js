const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const backupsDir = path.join(rootDir, 'backups');
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = path.join(backupsDir, `agent_dashboard_${timestamp}.sql`);
const outFd = fs.openSync(outFile, 'w');

console.log(`Backing up database to ${outFile} ...`);

execSync('docker compose exec -T postgres pg_dump -U postgres -d agent_dashboard --clean --if-exists', {
  cwd: rootDir,
  stdio: ['ignore', outFd, 'inherit'],
});

fs.closeSync(outFd);
console.log('Backup complete.');
