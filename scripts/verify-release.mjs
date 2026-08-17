import { randomUUID } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const releaseDir = join(repoRoot, '.release')
const bundleDir = join(repoRoot, 'packages', 'bundle')
const bundleManifest = JSON.parse(readFileSync(join(bundleDir, 'package.json'), 'utf8'))
const dshVersion = process.env.DSH_RELEASE_TEST_VERSION ?? '0.1.0-rc.7'
const maximumArchiveBytes = 16 * 1024 * 1024
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

function fail(message) {
  throw new Error(`release verification failed: ${message}`)
}

function run(command, args, options = {}) {
  const isWindowsWrapper = process.platform === 'win32' && command.toLowerCase().endsWith('.cmd')
  const executable = isWindowsWrapper ? (process.env.ComSpec ?? 'cmd.exe') : command
  const executableArgs = isWindowsWrapper ? ['/d', '/s', '/c', command, ...args] : args
  const result = spawnSync(executable, executableArgs, {
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    encoding: 'utf8',
    stdio: options.capture === false ? 'inherit' : 'pipe',
    windowsHide: true,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
    fail(`${command} ${args.join(' ')} exited ${result.status}${output === '' ? '' : `\n${output}`}`)
  }
  return result.stdout ?? ''
}

function resetReleaseDirectory() {
  if (dirname(releaseDir) !== repoRoot) fail(`unsafe release directory ${releaseDir}`)
  rmSync(releaseDir, { recursive: true, force: true })
  mkdirSync(releaseDir, { recursive: true })
}

function packBundle() {
  run(pnpmCommand, ['build'], { capture: false })
  resetReleaseDirectory()
  const output = run(npmCommand, ['pack', bundleDir, '--pack-destination', releaseDir, '--json'])
  const records = JSON.parse(output)
  if (!Array.isArray(records) || records.length !== 1) fail('npm pack did not return exactly one archive')
  const record = records[0]
  const archivePath = join(releaseDir, record.filename)
  if (!existsSync(archivePath)) fail(`archive is missing: ${archivePath}`)
  return { archivePath, record }
}

function verifyArchive(record) {
  if (record.size > maximumArchiveBytes) fail(`archive is ${record.size} bytes; limit is ${maximumArchiveBytes}`)
  const bundled = [...record.bundled].sort()
  if (bundled.length !== 0) fail(`archive unexpectedly bundles packages: ${JSON.stringify(bundled)}`)

  const paths = record.files.map(file => file.path)
  for (const required of ['dist/index.js', 'dist/tool-policy.js', 'dist/client.js']) {
    if (!paths.includes(required)) fail(`archive is missing ${required}`)
  }
  const forbidden = paths.filter(path => (
    path.includes('/src/')
    || path.includes('/tests/')
    || path.endsWith('.map')
    || path.endsWith('.tsbuildinfo')
  ))
  if (forbidden.length > 0) fail(`development files entered the archive: ${forbidden.join(', ')}`)

  const unexpectedNodeModules = paths.filter(path => path.startsWith('node_modules/'))
  if (unexpectedNodeModules.length > 0) {
    fail(`unexpected bundled dependencies: ${unexpectedNodeModules.join(', ')}`)
  }
}

async function freePort() {
  return await new Promise((resolvePort, reject) => {
    const server = createServer()
    server.unref()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (typeof address === 'string' || address === null) {
        server.close()
        reject(new Error('could not allocate a TCP port'))
        return
      }
      const { port } = address
      server.close(error => error ? reject(error) : resolvePort(port))
    })
  })
}

async function waitForHttp(url, child, output) {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      fail(`registry DSH exited before HTTP startup\n${output()}`)
    }
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // The loopback listener is expected to refuse connections during startup.
    }
    await new Promise(resolveDelay => setTimeout(resolveDelay, 250))
  }
  fail(`registry DSH did not become healthy at ${url}\n${output()}`)
}

async function rpc(baseUrl, method, payload) {
  const rpcId = `release-${randomUUID()}`
  const response = await fetch(`${baseUrl}/api/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method, payload }),
  })
  if (!response.ok) fail(`${method} returned HTTP ${response.status}`)
  const message = await response.json()
  if (message.type !== 'server-response' || message.rpcId !== rpcId) {
    fail(`${method} returned an invalid RPC envelope`)
  }
  if (message.result?.ok !== true) {
    fail(`${method} failed: ${JSON.stringify(message.result?.error)}`)
  }
  return message.result.value
}

async function waitForRpc(baseUrl, method, payload, predicate) {
  const deadline = Date.now() + 10_000
  let value
  let lastError
  while (Date.now() < deadline) {
    try {
      value = await rpc(baseUrl, method, payload)
      if (predicate(value)) return value
    } catch (error) {
      lastError = error
    }
    await new Promise(resolveDelay => setTimeout(resolveDelay, 200))
  }
  if (value === undefined && lastError !== undefined) throw lastError
  return value
}

async function stopChild(child) {
  if (child.exitCode !== null) return
  child.kill('SIGTERM')
  await Promise.race([
    new Promise(resolveExit => child.once('exit', resolveExit)),
    new Promise(resolveDelay => setTimeout(resolveDelay, 10_000)),
  ])
  if (child.exitCode === null) child.kill('SIGKILL')
}

async function verifyRegistryDsh(archivePath) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'dsh-qa-release-'))
  const installDir = join(temporaryRoot, 'installation')
  const homeDir = join(temporaryRoot, 'home')
  const documentsDir = join(temporaryRoot, 'documents')
  mkdirSync(installDir, { recursive: true })
  mkdirSync(documentsDir, { recursive: true })
  writeFileSync(join(installDir, 'package.json'), '{"name":"dsh-qa-release-smoke","private":true}\n')
  writeFileSync(join(documentsDir, 'smoke.md'), '# Release smoke\n\nThe registry-installed DSH can read this directory.\n')

  let server
  let serverOutput = () => ''
  try {
    run(pnpmCommand, [
      'add',
      '--save-exact',
      '--allow-build=@deepseek-ai/dsh-subprocess-local',
      '--allow-build=@google/genai',
      '--allow-build=koffi',
      '--allow-build=node-pty',
      '--allow-build=protobufjs',
      `@deepseek-ai/dsh@${dshVersion}`,
    ], { cwd: installDir, capture: false })
    const dshBin = join(installDir, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
    if (!existsSync(dshBin)) fail(`registry DSH executable is missing: ${dshBin}`)

    const environment = {
      ...process.env,
      DSH_HOME: homeDir,
      DSH_QA_WORKSPACE: documentsDir,
      NO_COLOR: '1',
    }
    run(process.execPath, [dshBin, 'plugin', '--profile', 'web', 'add', archivePath], {
      cwd: installDir,
      env: environment,
      capture: false,
    })

    const dump = run(process.execPath, [dshBin, '--profile', 'web', '--dump-config'], {
      cwd: installDir,
      env: environment,
    })
    for (const required of [
      'id: qa-workspace',
      'id: qa-agent-presets',
      'default: nova-qa',
      'id: ui-deliverables',
      'defaultPreset: read-only',
    ]) {
      if (!dump.includes(required)) fail(`effective config is missing ${JSON.stringify(required)}`)
    }

    const port = await freePort()
    let stdout = ''
    let stderr = ''
    server = spawn(process.execPath, [dshBin, '--profile', 'web', '--port', String(port)], {
      cwd: installDir,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    server.stdout.setEncoding('utf8')
    server.stderr.setEncoding('utf8')
    server.stdout.on('data', chunk => { stdout = `${stdout}${chunk}`.slice(-20_000) })
    server.stderr.on('data', chunk => { stderr = `${stderr}${chunk}`.slice(-20_000) })
    const output = () => `${stdout}\n${stderr}`.trim()
    serverOutput = output
    const baseUrl = `http://127.0.0.1:${port}`
    await waitForHttp(baseUrl, server, output)

    const workspaces = await waitForRpc(
      baseUrl,
      'workspace.list',
      {},
      value => value.items?.length === 1,
    )
    if (workspaces.items?.length !== 1 || workspaces.items[0].title !== 'NOVA知识库') {
      fail(`workspace.list did not return the fixed NOVA Workspace: ${JSON.stringify(workspaces)}`)
    }
    const presets = await waitForRpc(
      baseUrl,
      'agentPreset.list',
      {},
      value => value.presets?.some(item => item.id === 'nova-qa'),
    )
    const nova = presets.presets?.find(item => item.id === 'nova-qa')
    if (nova === undefined || nova.isDefault !== true || nova.trust !== 'system') {
      fail(`agentPreset.list did not return the default system NOVA Preset: ${JSON.stringify(presets)}`)
    }

    const sessionId = `release-smoke-${randomUUID()}`
    const created = await rpc(baseUrl, 'session.create', {
      sessionId,
      workspaceId: workspaces.items[0].workspaceId,
    })
    if (created.sessionId !== sessionId || created.agentPreset !== 'nova-qa') {
      fail(`session.create did not mount nova-qa: ${JSON.stringify(created)}`)
    }
    const history = await rpc(baseUrl, 'session.history', { sessionId, maxMessages: 10 })
    if (!Array.isArray(history.events)) fail('session.history did not return an event array')

    process.stdout.write(`\nVerified ${bundleManifest.name}@${bundleManifest.version} (${recordedSize(archivePath)}) against registry @deepseek-ai/dsh@${dshVersion}.\n`)
    process.stdout.write(`RPC smoke: Workspace NOVA知识库, Preset nova-qa, Session ${sessionId}.\n`)
  } catch (error) {
    const output = serverOutput()
    if (output === '') throw error
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nRegistry DSH output:\n${output}`, { cause: error })
  } finally {
    if (server !== undefined) await stopChild(server)
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

function recordedSize(archivePath) {
  const bytes = readFileSync(archivePath).byteLength
  return `${bytes} bytes`
}

const { archivePath, record } = packBundle()
verifyArchive(record)
await verifyRegistryDsh(archivePath)
