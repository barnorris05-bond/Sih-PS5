import { spawn } from 'node:child_process';

const port = 3100;
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

async function isServerUp(): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

let serverProcess: ReturnType<typeof spawn> | null = null;

if (!(await isServerUp())) {
  console.log('Starting production server for API timing check...');
  serverProcess = spawn(pnpm, ['start'], { stdio: 'ignore', shell: process.platform === 'win32' });
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (await isServerUp()) break;
  }
}

if (!(await isServerUp())) {
  console.error('Failed to reach production server at port 3100');
  process.exit(1);
}

const endpoints = [
  '/api/health',
  '/api/cases',
  '/api/cases/APP-001',
  '/api/cases/APP-001/documents',
  '/api/cases/APP-001/mismatches',
  '/api/cases/APP-001/checks',
  '/api/cases/APP-001/connections',
  '/api/cases/APP-001/report',
  '/api/rules',
  '/api/ledger',
  '/api/metrics',
];

const BUDGET_P95_MS = 50;
let failed = false;

console.log(`Checking API timing budget (p95 <= ${BUDGET_P95_MS} ms)...`);

for (const ep of endpoints) {
  const times: number[] = [];
  for (let i = 0; i < 10; i++) {
    const t0 = performance.now();
    const res = await fetch(`http://127.0.0.1:${port}${ep}`);
    await res.text();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const p95 = Math.round(times[Math.floor(times.length * 0.95)] || times[times.length - 1]!);

  if (p95 > BUDGET_P95_MS) {
    console.error(`FAIL: ${ep} p95 = ${p95} ms (exceeds ${BUDGET_P95_MS} ms)`);
    failed = true;
  } else {
    console.log(`PASS: ${ep} p95 = ${p95} ms`);
  }
}

if (serverProcess) {
  serverProcess.kill();
}

if (failed) {
  console.error('API timing budget check failed.');
  process.exit(1);
} else {
  console.log('All API endpoints meet the p95 <= 50 ms budget.');
}
