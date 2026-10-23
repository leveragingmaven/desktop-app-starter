import path from 'path';
import { existsSync, promises as fsp } from 'fs';
import os from 'os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const userDataDir = path.join(os.tmpdir(), 'fs-service-tests-userdata');

vi.mock('electron', () => ({
  app: {
    getPath: (key: string) => {
      if (key === 'userData') return userDataDir;
      throw new Error(`Unexpected getPath ${key}`);
    },
  },
}));

vi.mock('../../../logging', () => ({
  logEngine: {
    createLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    }),
  },
}));

import { fsService, FS_LIMITS } from '../fs-service';

const sandbox = path.join(os.tmpdir(), 'fs-service-tests-sandbox');

/**
 * Returns the 8.3 short-name form of an existing Windows directory, or null
 * when short names are disabled on the volume (the test then no-ops).
 */
async function windowsShortName(dir: string): Promise<string | null> {
  const { execSync } = await import('child_process');
  try {
    const out = execSync(`cmd /d /c for %I in ("${dir}") do @echo %~sI`, { encoding: 'utf8' }).trim();
    return out && out !== dir && existsSync(out) ? out : null;
  } catch {
    return null;
  }
}

async function makeFile(p: string, content: string | Buffer): Promise<void> {
  await fsp.mkdir(path.dirname(p), { recursive: true });
  await fsp.writeFile(p, content);
}

describe('FsService', () => {
  beforeEach(async () => {
    fsService.__resetBlessed();
    await fsp.rm(userDataDir, { recursive: true, force: true });
    await fsp.rm(sandbox, { recursive: true, force: true });
    await fsp.mkdir(userDataDir, { recursive: true });
    await fsp.mkdir(sandbox, { recursive: true });
  });

  afterEach(async () => {
    await fsp.rm(userDataDir, { recursive: true, force: true });
    await fsp.rm(sandbox, { recursive: true, force: true });
  });

  describe('allow-list', () => {
    it('reads inside userData by default', async () => {
      const file = path.join(userDataDir, 'note.txt');
      await makeFile(file, 'hello');
      const res = await fsService.read(file);
      expect(res.success).toBe(true);
      if (res.success) expect(res.content).toBe('hello');
    });

    it('refuses paths outside userData and unblessed', async () => {
      const file = path.join(sandbox, 'outside.txt');
      await makeFile(file, 'should not read');
      const res = await fsService.read(file);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.code).toBe('forbidden');
    });

    it('accepts a blessed path', async () => {
      const file = path.join(sandbox, 'blessed.txt');
      await makeFile(file, 'ok');
      fsService.bless(file);
      const res = await fsService.read(file);
      expect(res.success).toBe(true);
    });

    it('accepts children of a blessed directory', async () => {
      fsService.bless(sandbox);
      const file = path.join(sandbox, 'sub', 'child.txt');
      await makeFile(file, 'child');
      const res = await fsService.read(file);
      expect(res.success).toBe(true);
    });

    it('refuses a sibling of a blessed file', async () => {
      const blessed = path.join(sandbox, 'blessed.txt');
      const sibling = path.join(sandbox, 'sibling.txt');
      await makeFile(blessed, 'ok');
      await makeFile(sibling, 'no');
      fsService.bless(blessed);
      const res = await fsService.read(sibling);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.code).toBe('forbidden');
    });
  });

  describe('size limits', () => {
    it('reads a small file', async () => {
      const file = path.join(userDataDir, 'small.bin');
      await makeFile(file, Buffer.alloc(100 * 1024, 0x41)); // 100 KB of 'A'
      const res = await fsService.read(file);
      expect(res.success).toBe(true);
      if (res.success) expect(res.size).toBe(100 * 1024);
    });

    it('refuses a file larger than the read cap', async () => {
      const file = path.join(userDataDir, 'big.bin');
      // Just over the cap. Sparse-write with truncate so we don't actually
      // allocate 10 MB on disk for this test.
      const handle = await fsp.open(file, 'w');
      await handle.truncate(FS_LIMITS.MAX_READ_BYTES + 1);
      await handle.close();
      const res = await fsService.read(file);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.code).toBe('too-large');
    });

    it('refuses a write whose decoded byte length exceeds the cap', async () => {
      const file = path.join(userDataDir, 'too-big.txt');
      const big = 'a'.repeat(FS_LIMITS.MAX_WRITE_BYTES + 1);
      const res = await fsService.write(file, big);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.code).toBe('too-large');
    });
  });

  describe('write', () => {
    it('writes a new file and returns bytesWritten', async () => {
      const file = path.join(userDataDir, 'sub', 'note.txt');
      const res = await fsService.write(file, 'hi');
      expect(res.success).toBe(true);
      if (res.success) expect(res.bytesWritten).toBe(2);
      const back = await fsp.readFile(file, 'utf8');
      expect(back).toBe('hi');
    });

    it('refuses to overwrite when exclusive', async () => {
      const file = path.join(userDataDir, 'lock.txt');
      await makeFile(file, 'before');
      const res = await fsService.write(file, 'after', 'utf8', true);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.code).toBe('exists');
    });

    it('handles base64 encoding', async () => {
      const file = path.join(userDataDir, 'bin.dat');
      const res = await fsService.write(
        file,
        Buffer.from([1, 2, 3, 4]).toString('base64'),
        'base64',
      );
      expect(res.success).toBe(true);
      const back = await fsp.readFile(file);
      expect(Array.from(back)).toEqual([1, 2, 3, 4]);
    });
  });

  describe('list', () => {
    it('lists immediate children with size + type', async () => {
      const dir = path.join(userDataDir, 'mixed');
      await fsp.mkdir(dir, { recursive: true });
      await makeFile(path.join(dir, 'a.txt'), 'aaa');
      await makeFile(path.join(dir, 'b.bin'), Buffer.alloc(7));
      await fsp.mkdir(path.join(dir, 'sub'), { recursive: true });
      const res = await fsService.list(dir);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.entries).toHaveLength(3);
        const a = res.entries.find((e) => e.name === 'a.txt');
        const b = res.entries.find((e) => e.name === 'b.bin');
        const sub = res.entries.find((e) => e.name === 'sub');
        expect(a?.isFile).toBe(true);
        expect(a?.size).toBe(3);
        expect(b?.size).toBe(7);
        expect(sub?.isDirectory).toBe(true);
      }
    });

    it('refuses to list a file', async () => {
      const file = path.join(userDataDir, 'nope.txt');
      await makeFile(file, 'x');
      const res = await fsService.list(file);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.code).toBe('not-a-directory');
    });
  });

  describe('stat', () => {
    it('reports a missing file as exists=false', async () => {
      const file = path.join(userDataDir, 'ghost.txt');
      const res = await fsService.stat(file);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.exists).toBe(false);
        expect(res.size).toBe(0);
      }
    });

    it('reports an existing file', async () => {
      const file = path.join(userDataDir, 'real.txt');
      await makeFile(file, 'abc');
      const res = await fsService.stat(file);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.exists).toBe(true);
        expect(res.isFile).toBe(true);
        expect(res.size).toBe(3);
      }
    });
  });

  // F4.1 — without symlink resolution, a renderer blessed on a directory
  // could traverse a symlink inside that dir to read files outside the
  // allow-list. The service must canonicalize via fs.realpath before the
  // prefix check.
  describe('canonicalization (short names, missing parents, escapes)', () => {
    it('accepts a blessed root given as a Windows 8.3 short name', async () => {
      if (process.platform !== 'win32') return;
      const dir = path.join(userDataDir, 'long-name-folder');
      await makeFile(path.join(dir, 'doc.txt'), 'short-ok');
      const shortDir = await windowsShortName(dir);
      expect(shortDir, 'expected an 8.3 short name for the temp dir').not.toBeNull();
      if (!shortDir) return;
      fsService.bless(shortDir);
      const res = await fsService.read(path.join(dir, 'doc.txt'));
      expect(res.success).toBe(true);
      if (res.success) expect(res.content).toBe('short-ok');
    });

    it('accepts a path written with a short-name segment inside a blessed root', async () => {
      if (process.platform !== 'win32') return;
      const dir = path.join(sandbox, 'long-name-folder');
      await fsp.mkdir(dir, { recursive: true });
      const shortDir = await windowsShortName(dir);
      expect(shortDir, 'expected an 8.3 short name for the temp dir').not.toBeNull();
      if (!shortDir) return;
      fsService.bless(sandbox);
      const res = await fsService.write(path.join(shortDir, 'via-short.txt'), 'written');
      expect(res.success).toBe(true);
      const check = await fsp.readFile(path.join(dir, 'via-short.txt'), 'utf8');
      expect(check).toBe('written');
    });

    it('writes a new file whose parent directories do not exist yet inside a blessed root', async () => {
      fsService.bless(sandbox);
      const target = path.join(sandbox, 'a', 'b', 'c', 'new.txt');
      const res = await fsService.write(target, 'deep');
      expect(res.success).toBe(true);
      expect(await fsp.readFile(target, 'utf8')).toBe('deep');
    });

    it('refuses a write to a missing-parent path that escapes the blessed root with ..', async () => {
      const blessedDir = path.join(userDataDir, 'inbox');
      await fsp.mkdir(blessedDir, { recursive: true });
      fsService.bless(blessedDir);
      const escaped = path.join(blessedDir, '..', '..', 'missing-x', 'y', 'evil.txt');
      const res = await fsService.write(escaped, 'no');
      expect(res.success).toBe(false);
      if (!res.success) expect(res.code).toBe('forbidden');
    });

    it('refuses a write under a missing directory that is not inside any allowed root', async () => {
      const res = await fsService.write(path.join(sandbox, 'missing', 'deeper', 'x.txt'), 'no');
      expect(res.success).toBe(false);
      if (!res.success) expect(res.code).toBe('forbidden');
    });

    it('refuses reads of a sibling directory that shares a name prefix with a blessed root', async () => {
      const blessedDir = path.join(sandbox, 'data');
      const siblingDir = path.join(sandbox, 'data-evil');
      await makeFile(path.join(siblingDir, 'secret.txt'), 'nope');
      await fsp.mkdir(blessedDir, { recursive: true });
      fsService.bless(blessedDir);
      const res = await fsService.read(path.join(siblingDir, 'secret.txt'));
      expect(res.success).toBe(false);
      if (!res.success) expect(res.code).toBe('forbidden');
    });
  });

  describe('symlink resolution (F4.1)', () => {
    async function trySymlink(target: string, link: string): Promise<boolean> {
      try {
        await fsp.symlink(target, link, 'file');
        return true;
      } catch {
        // Windows without developer mode rejects symlink creation. Tests
        // skip rather than fail — the runtime check is still in place.
        return false;
      }
    }

    it('rejects a symlink inside a blessed dir that points outside', async () => {
      const target = path.join(sandbox, 'secret.txt');
      await makeFile(target, 'secret');
      const blessedDir = path.join(userDataDir, 'inbox');
      await fsp.mkdir(blessedDir, { recursive: true });
      fsService.bless(blessedDir);
      const link = path.join(blessedDir, 'trap');
      const created = await trySymlink(target, link);
      if (!created) return;
      const res = await fsService.read(link);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.code).toBe('forbidden');
    });

    it('still reads through a symlink whose target is inside the allow-list', async () => {
      const target = path.join(userDataDir, 'real.txt');
      await makeFile(target, 'inside');
      const link = path.join(userDataDir, 'link-to-real');
      const created = await trySymlink(target, link);
      if (!created) return;
      const res = await fsService.read(link);
      expect(res.success).toBe(true);
      if (res.success) expect(res.content).toBe('inside');
    });

    it('rejects writes to a path whose parent symlinks outside', async () => {
      const realOutside = path.join(sandbox, 'evilParent');
      await fsp.mkdir(realOutside, { recursive: true });
      const blessedDir = path.join(userDataDir, 'workspace');
      await fsp.mkdir(blessedDir, { recursive: true });
      fsService.bless(blessedDir);
      const linkParent = path.join(blessedDir, 'linkedDir');
      const created = await trySymlink(realOutside, linkParent);
      if (!created) return;
      const target = path.join(linkParent, 'newfile.txt');
      const res = await fsService.write(target, 'no');
      expect(res.success).toBe(false);
      if (!res.success) expect(res.code).toBe('forbidden');
    });
  });
});
