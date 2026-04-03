import { exec } from "child_process"

/**
 * Execute a shell command and return stdout or throw on error.
 * Includes timeout, stderr capture, and optional working directory.
 * @param command Shell command to run (e.g., "ls -la")
 * @param options Optional execution settings
 */
export function execCommand(
  command: string,
  options: { timeoutMs?: number; cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<{ stdout: string; stderr: string; code: number }> {
  const { timeoutMs = 30_000, cwd, env } = options
  return new Promise((resolve, reject) => {
    const proc = exec(command, { timeout: timeoutMs, cwd, env }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Command failed (code ${error.code}): ${stderr || error.message}`))
      }
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code: 0 })
    })

    // defensive: handle killed process
    proc.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Command exited with code ${code}`))
      }
    })
  })
}

/**
 * Try executing a command safely, returning either result or error message.
 */
export async function tryExecCommand(
  command: string,
  options?: { timeoutMs?: number; cwd?: string; env?: NodeJS.ProcessEnv }
): Promise<{ ok: boolean; stdout?: string; stderr?: string; error?: string }> {
  try {
    const res = await execCommand(command, options)
    return { ok: true, stdout: res.stdout, stderr: res.stderr }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) }
  }
}
