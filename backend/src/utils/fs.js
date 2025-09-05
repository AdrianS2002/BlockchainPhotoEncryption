import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { config } from '../config.js';


export async function ensureDirs() {
await fs.mkdir(config.filesDir, { recursive: true });
}

export async function saveFileAtomic(relPath, buffer) {
const abs = join(config.filesDir, relPath);
await fs.mkdir(dirname(abs), { recursive: true });
const tmp = abs + '.tmp-' + Date.now();
await fs.writeFile(tmp, buffer);
await fs.rename(tmp, abs);
return abs;
}
export async function readFile(relPath) {
const abs = join(config.filesDir, relPath);
return fs.readFile(abs);
}