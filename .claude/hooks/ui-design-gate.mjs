#!/usr/bin/env node
/**
 * UI design gate — PreToolUse hook.
 *
 * Enforces `.claude/rules/ui-changes.md`: edits to component / page / layout / style files
 * are denied until the `impeccable` skill has been loaded in the current session. Once it
 * is loaded, the gate is silent for the rest of the session.
 *
 * Contract: never break a turn. Malformed input, an unreadable transcript, or any internal
 * error allows the tool through (exit 0, no output). The gate fails open, always.
 *
 * Escape hatches:
 *   - UI_DESIGN_GATE_DISABLED=1   turn the gate off for the shell / session
 *   - after MAX_DENIALS blocks on the same file in one session, the gate gives up and
 *     allows the edit, so a detection miss can never become a loop
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// What counts as a UI file. Tune these two lists to change the gate's scope.
// ---------------------------------------------------------------------------

/** Stylesheets are design work wherever they live. */
const STYLE_EXTS = new Set(['.css', '.scss', '.sass', '.less', '.pcss', '.styl']);

/** Markup files are design work only inside a UI directory (see UI_DIRS). */
const MARKUP_EXTS = new Set(['.tsx', '.jsx', '.vue', '.svelte', '.astro', '.html']);

/** A markup file gates only if one of these is a path segment. */
const UI_DIRS = new Set([
  'components',
  'pages',
  'layouts',
  'layout',
  'forms',
  'views',
  'screens',
  'styles',
  'theme',
]);

/** Never gate anything under these. */
const SKIP_DIRS = /(^|\/)(node_modules|dist|build|out|coverage|public|\.git|\.next|\.vercel|\.impeccable)(\/|$)/;

/** Never gate these files — tests and type declarations are not design work. */
const SKIP_FILES = /(\.test\.|\.spec\.|\.stories\.spec\.|\.d\.ts$)/;

const GATED_TOOLS = new Set(['Edit', 'Write', 'MultiEdit']);

/** Deny this many times per file per session, then give up and allow. */
const MAX_DENIALS = 2;

// ---------------------------------------------------------------------------
// Session markers
//
// Assembled from fragments on purpose: the literal marker strings must never appear
// in this file's own source, or reading/writing this hook would itself look like
// evidence that the skill was loaded. Same reason `.claude/rules/ui-changes.md` and
// the denial message below avoid them.
// ---------------------------------------------------------------------------

const SKILL_DIR = `skills/${'impeccable'}/`;
const SKILL_MARKERS = [
  // the skill's own frontmatter and setup script, present whenever SKILL.md is in context
  `name: ${'impeccable'}`,
  `${SKILL_DIR}scripts/context.mjs`,
  `${SKILL_DIR}SKILL.md`,
  `${SKILL_DIR}reference/`,
  // a Skill tool invocation
  `"skill":"${'impeccable'}"`,
  `"skill": "${'impeccable'}"`,
];

/** Only scan the tail of very large transcripts. */
const MAX_TRANSCRIPT_BYTES = 32 * 1024 * 1024;

// ---------------------------------------------------------------------------

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8');
}

/** Allow the tool through and say nothing. */
function allow(additionalContext) {
  if (additionalContext) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext },
      }),
    );
  }
  process.exit(0);
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

function truthy(value) {
  return value !== undefined && value !== '' && value !== '0' && value !== 'false';
}

function targetPath(event, cwd) {
  const input = event?.tool_input;
  const raw = typeof input?.file_path === 'string' ? input.file_path : '';
  if (!raw.trim()) return '';
  return path.isAbsolute(raw) ? raw : path.resolve(cwd, raw);
}

function toRelative(filePath, cwd) {
  const rel = path.relative(cwd, filePath);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return '';
  return rel.split(path.sep).join('/');
}

/** True when this path is a component / page / layout / style file. */
function isUiFile(rel) {
  if (SKIP_DIRS.test(rel) || SKIP_FILES.test(rel)) return false;

  const ext = path.extname(rel).toLowerCase();
  if (STYLE_EXTS.has(ext)) return true;
  if (!MARKUP_EXTS.has(ext)) return false;

  return rel
    .split('/')
    .slice(0, -1)
    .some((segment) => UI_DIRS.has(segment.toLowerCase()));
}

function readTranscriptTail(transcriptPath) {
  const stat = fs.statSync(transcriptPath);
  if (!stat.isFile()) return null;
  if (stat.size <= MAX_TRANSCRIPT_BYTES) return fs.readFileSync(transcriptPath, 'utf-8');

  const fd = fs.openSync(transcriptPath, 'r');
  try {
    const buf = Buffer.alloc(MAX_TRANSCRIPT_BYTES);
    fs.readSync(fd, buf, 0, MAX_TRANSCRIPT_BYTES, stat.size - MAX_TRANSCRIPT_BYTES);
    return buf.toString('utf-8');
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Has the design skill been loaded in this session?
 * Returns null when the transcript cannot be read, so the caller can fail open.
 */
function skillLoaded(transcriptPath) {
  if (!transcriptPath) return null;
  let text;
  try {
    text = readTranscriptTail(transcriptPath);
  } catch {
    return null;
  }
  if (text === null) return null;
  return SKILL_MARKERS.some((marker) => text.includes(marker));
}

function stateFilePath(sessionId) {
  const safe = String(sessionId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  return path.join(os.tmpdir(), `ui-design-gate-${safe}.json`);
}

/** Count denials per file so a detection miss degrades to a warning instead of a loop. */
function bumpDenials(sessionId, rel) {
  const file = stateFilePath(sessionId);
  let state = {};
  try {
    state = JSON.parse(fs.readFileSync(file, 'utf-8')) || {};
  } catch {
    state = {};
  }
  const next = (Number(state[rel]) || 0) + 1;
  state[rel] = next;
  try {
    fs.writeFileSync(file, JSON.stringify(state));
  } catch {
    /* best effort — the gate still works, it just stops counting */
  }
  return next;
}

function denialMessage(rel) {
  return [
    `Blocked by .claude/rules/ui-changes.md — "${rel}" is a UI file (component / page /`,
    'layout / style), and design work in this project runs through the project design skill.',
    '',
    'Do this instead:',
    '  1. Invoke the Skill tool for the `impeccable` design skill',
    '  2. Run its Setup steps, then pick the sub-command that fits the intent',
    '     (craft, shape, critique, audit, polish, layout, clarify, ...).',
    '  3. Make this edit inside that flow.',
    '',
    'Retry the edit once the skill is loaded — the gate goes silent for the rest of the',
    'session. It is not a permission prompt, so re-running the same tool call will not',
    'help until the skill is loaded.',
  ].join('\n');
}

async function main() {
  if (truthy(process.env.UI_DESIGN_GATE_DISABLED)) allow();

  let event = null;
  try {
    const raw = await readStdin();
    if (raw) event = JSON.parse(raw);
  } catch {
    allow();
  }
  if (!event || typeof event !== 'object') allow();

  if (!GATED_TOOLS.has(event.tool_name)) allow();

  const cwd = typeof event.cwd === 'string' && event.cwd ? event.cwd : process.cwd();
  const filePath = targetPath(event, cwd);
  if (!filePath) allow();

  const rel = toRelative(filePath, cwd);
  if (!rel) allow(); // outside the project
  if (!isUiFile(rel)) allow();

  const loaded = skillLoaded(event.transcript_path);
  if (loaded === null || loaded === true) allow(); // fail open when unknown

  const denials = bumpDenials(event.session_id, rel);
  if (denials > MAX_DENIALS) {
    allow(
      `The UI design gate blocked "${rel}" ${MAX_DENIALS} times and is now allowing it to ` +
        'avoid a loop. The project design skill still has not been detected as loaded — ' +
        'load it before continuing, or tell the user the gate looks broken.',
    );
  }

  deny(denialMessage(rel));
}

main().catch(() => {
  process.exit(0);
});
