#!/usr/bin/env node

/**
 * Week 12 demo: run the unit suite, break the ownership rule on purpose, show
 * the failing expectation, restore the rule and prove the suite is green again.
 *
 * The rule is always restored in a `finally` block. Do not cancel the process
 * with Ctrl+C while the mutation is active.
 *
 * Usage: npm run demo:etapa4
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ruleFile = join(
  root,
  'src',
  'courses',
  'application',
  'use-cases',
  'update-course.use-case.ts',
);
const useCaseSpec =
  'src/courses/application/use-cases/update-course.use-case.spec.ts';

const originalRule = 'if (!isAdmin && !(isTeacher && isOwner)) {';
const mutatedRule =
  'if (!isAdmin && !isTeacher) { // MUTACION TEMPORAL: se elimina la comprobacion de propiedad';

const vitest = join(root, 'node_modules', 'vitest', 'vitest.mjs');

function run(args, { expectFailure = false } = {}) {
  const result = spawnSync(process.execPath, [vitest, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.replace(
    // eslint-disable-next-line no-control-regex
    /\u001b\[[0-9;]*m/g,
    '',
  );
  process.stdout.write(output);

  const failed = result.status !== 0;
  if (expectFailure && !failed) {
    throw new Error('La mutacion no hizo fallar la prueba: revisa el spec.');
  }
  if (!expectFailure && failed) {
    throw new Error('La suite fallo en un paso que debia estar en verde.');
  }

  return { failed, output };
}

const originalSource = readFileSync(ruleFile, 'utf8');

if (!originalSource.includes(originalRule)) {
  throw new Error(
    `No se encontro la regla esperada en ${ruleFile}. Restaura el archivo y reintenta.`,
  );
}

console.log('\n=== 1. Suite completa en verde ===\n');
run(['run', '--reporter=dot']);

let mutationApplied = false;

try {
  console.log('\n=== 2. Se debilita la regla de propiedad (mutacion) ===\n');
  console.log(`- ${originalRule}\n+ ${mutatedRule}\n`);
  writeFileSync(
    ruleFile,
    originalSource.replace(originalRule, mutatedRule),
    'utf8',
  );
  mutationApplied = true;

  console.log('=== 3. La prueba debe fallar ===\n');
  run(['run', useCaseSpec], { expectFailure: true });
} finally {
  writeFileSync(ruleFile, originalSource, 'utf8');
  if (mutationApplied) {
    console.log('\n=== 4. Regla restaurada ===\n');
  }
}

console.log('=== 5. Suite completa restaurada en verde ===\n');
run(['run', '--reporter=dot']);

console.log('\nDemo completada: la regla quedo igual que antes.\n');
