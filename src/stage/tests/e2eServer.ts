import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createServer } from 'node:net';

export type StartedServer = {
  url: string;
  close: () => Promise<void>;
};

export async function startViteE2EServer(port = 4174): Promise<StartedServer> {
  await warmViteOptimizeDeps();

  const resolvedPort = await findAvailablePort(port);
  const url = `http://127.0.0.1:${resolvedPort}`;
  const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(resolvedPort), '--strictPort', '--force'], {
    cwd: process.cwd(),
    stdio: 'pipe',
    detached: true,
    env: {
      ...process.env,
      CI: '1',
    },
  });
  // Unref so orphaned stdio pipes don't prevent vitest from exiting
  server.unref();

  try {
    await waitForServer(url, server);
  } catch (error) {
    await stopServer(server);
    throw error;
  }

  return {
    url,
    close: () => stopServer(server),
  };
}

async function warmViteOptimizeDeps() {
  const optimizer = spawn('npx', ['vite', 'optimize', '--force'], {
    cwd: process.cwd(),
    stdio: 'pipe',
    env: {
      ...process.env,
      CI: '1',
    },
  });

  let lastOutput = '';
  const captureOutput = (chunk: Buffer) => {
    lastOutput = `${lastOutput}${chunk.toString()}`.slice(-4000);
  };

  optimizer.stdout.on('data', captureOutput);
  optimizer.stderr.on('data', captureOutput);

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    optimizer.once('error', reject);
    optimizer.once('exit', resolve);
  });

  optimizer.stdout.off('data', captureOutput);
  optimizer.stderr.off('data', captureOutput);

  if (exitCode !== 0) {
    throw new Error(`Vite dependency optimization failed with code ${exitCode}\n${lastOutput}`);
  }
}

async function findAvailablePort(startPort: number) {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port += 1;
  }
  return port;
}

async function isPortAvailable(port: number) {
  return await new Promise<boolean>((resolve) => {
    const server = createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '127.0.0.1');
  });
}

async function waitForServer(url: string, server: ChildProcessWithoutNullStreams) {
  const timeoutAt = Date.now() + 20_000;
  let lastOutput = '';

  const captureOutput = (chunk: Buffer) => {
    lastOutput = `${lastOutput}${chunk.toString()}`.slice(-4000);
  };

  server.stdout.on('data', captureOutput);
  server.stderr.on('data', captureOutput);

  while (Date.now() < timeoutAt) {
    if (server.exitCode != null) {
      throw new Error(`Vite dev server exited early with code ${server.exitCode}\n${lastOutput}`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        server.stdout.off('data', captureOutput);
        server.stderr.off('data', captureOutput);
        return;
      }
    } catch {
      // keep polling until server is ready
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  server.stdout.off('data', captureOutput);
  server.stderr.off('data', captureOutput);
  throw new Error(`Timed out waiting for Vite dev server at ${url}\n${lastOutput}`);
}

async function stopServer(server: ChildProcessWithoutNullStreams) {
  if (server.exitCode != null) {
    return;
  }

  // Kill the entire process group (npm + vite + esbuild children) so no orphans remain
  try {
    process.kill(-(server.pid as number), 'SIGTERM');
  } catch {
    server.kill('SIGTERM');
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      if (server.exitCode == null) {
        try {
          process.kill(-(server.pid as number), 'SIGKILL');
        } catch {
          server.kill('SIGKILL');
        }
      }
      resolve();
    }, 3_000);

    server.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}
