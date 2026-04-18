#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const {
  validateTaskSet,
  validateAll,
  pushTaskSet,
  pushAll,
  getAvailableSprints,
  getTaskSetIds,
  getTaskSetSummary,
  getWorkItemPlan,
  loadTaskJson,
  saveTaskJson,
} = require('./sync');

const HEADER = `
+----------------------------------------------+
|        devops-push - work item manager       |
+----------------------------------------------+
`;

async function main() {
  const { select, confirm, input } = await import('@inquirer/prompts');

  console.log(HEADER);

  let running = true;
  while (running) {
    const action = await select({
      message: 'What do you want to do?',
      choices: [
        { name: 'Validate all task breakdowns in a sprint', value: 'validate-all' },
        { name: 'Validate a single task breakdown',         value: 'validate-one' },
        { name: 'Push all task breakdowns to Azure DevOps', value: 'push-all' },
        { name: 'Push a single task breakdown',             value: 'push-one' },
        { name: 'Push step-by-step (one work item at a time)', value: 'push-step' },
        { name: 'Sprint summary',                           value: 'summary' },
        { name: 'Exit',                                     value: 'exit' },
      ],
    });

    switch (action) {
      case 'validate-all':
        await handleValidateAll(select);
        break;
      case 'validate-one':
        await handleValidateOne(select);
        break;
      case 'push-all':
        await handlePushAll(select, confirm, input);
        break;
      case 'push-one':
        await handlePushOne(select, confirm, input);
        break;
      case 'push-step':
        await handlePushStepByStep(select, confirm, input);
        break;
      case 'summary':
        await handleSummary(select);
        break;
      case 'exit':
        running = false;
        break;
    }

    if (running) {
      console.log();
    }
  }

  console.log('Bye!');
}

// -- Sprint / task-set selection ---------------------------------------

async function pickSprint(select) {
  const sprints = getAvailableSprints();
  if (sprints.length === 0) {
    console.log('\n  No sprint found with task breakdown JSON files.');
    console.log('  Expected layout: docs/sprints/Sprint-<N>/tasks/<id>-tasks.json\n');
    return null;
  }
  if (sprints.length === 1) {
    console.log(`\n  Only sprint available: Sprint ${sprints[0]}\n`);
    return sprints[0];
  }
  return select({
    message: 'Select sprint:',
    choices: sprints.map((s) => ({ name: `Sprint ${s}`, value: s })),
  });
}

async function pickTaskSet(select, sprint) {
  const ids = getTaskSetIds(sprint);
  if (ids.length === 0) {
    console.log(`\n  No task breakdown files in Sprint ${sprint}.\n`);
    return null;
  }
  const choices = ids.map((id) => {
    const info = getTaskSetSummary(id, sprint);
    return {
      name: `${id}  --  ${info.title}  (${info.usCount} US, ${info.taskCount} tasks, ${info.totalHours}h)`,
      value: id,
    };
  });
  return select({ message: 'Select task breakdown:', choices });
}

// -- Handlers ----------------------------------------------------------

async function handleValidateAll(select) {
  const sprint = await pickSprint(select);
  if (!sprint) return;

  console.log(`\n  Validating all task breakdowns - Sprint ${sprint}\n`);

  try {
    const { total, passed, failed, results } = validateAll(sprint);

    for (const r of results) {
      if (r.valid) {
        console.log(`    OK   ${r.taskSetId}`);
      } else {
        console.log(`    FAIL ${r.taskSetId}`);
        r.errors.forEach((e) => console.log(`         - ${e}`));
      }
    }

    console.log();
    console.log(`  -----------------------------------------`);
    console.log(`  Total: ${total}  |  Passed: ${passed}  |  Failed: ${failed}`);
    console.log(`  -----------------------------------------`);
  } catch (e) {
    console.error(`\n  ERROR: ${e.message}`);
  }
}

async function handleValidateOne(select) {
  const sprint = await pickSprint(select);
  if (!sprint) return;

  const taskSetId = await pickTaskSet(select, sprint);
  if (!taskSetId) return;

  console.log(`\n  Validating ${taskSetId} (Sprint ${sprint})...\n`);

  const result = validateTaskSet(taskSetId, sprint);
  if (result.valid) {
    console.log(`    OK   Validation passed`);
  } else {
    console.log(`    FAIL Validation errors:`);
    result.errors.forEach((e) => console.log(`         - ${e}`));
  }
}

async function handlePushAll(select, confirm, input) {
  if (!checkEnvInteractive()) return;

  const sprint = await pickSprint(select);
  if (!sprint) return;

  console.log(`\n  Pre-validating Sprint ${sprint}...\n`);
  const { failed, results } = validateAll(sprint);
  for (const r of results) {
    console.log(`    ${r.valid ? 'OK  ' : 'FAIL'}  ${r.taskSetId}`);
  }

  if (failed > 0) {
    console.log(`\n  FAIL ${failed} task breakdowns have errors. Fix before pushing.\n`);
    return;
  }

  console.log(`\n  OK All task breakdowns valid.\n`);

  const epicId = await input({
    message: 'Epic ID (parent work item on Azure DevOps):',
    validate: (v) => /^\d+$/.test(v.trim()) || 'Enter a numeric ID',
  });

  const dryRun = await confirm({ message: 'Dry run (simulation, no remote write)?', default: true });

  const ok = await confirm({
    message: `Confirm push of ALL task breakdowns in Sprint ${sprint}${dryRun ? ' (DRY RUN)' : ''}?`,
    default: false,
  });
  if (!ok) {
    console.log('  Cancelled.');
    return;
  }

  console.log();
  try {
    await pushAll({ sprint, epicId: parseInt(epicId, 10), dryRun });
  } catch (e) {
    console.error(`\n  ERROR: ${e.message}`);
  }
}

async function handlePushOne(select, confirm, input) {
  if (!checkEnvInteractive()) return;

  const sprint = await pickSprint(select);
  if (!sprint) return;

  const taskSetId = await pickTaskSet(select, sprint);
  if (!taskSetId) return;

  const validation = validateTaskSet(taskSetId, sprint);
  if (!validation.valid) {
    console.log(`\n    FAIL Validation failed for ${taskSetId}:`);
    validation.errors.forEach((e) => console.log(`         - ${e}`));
    console.log();
    return;
  }
  console.log(`\n    OK Validation passed\n`);

  const epicId = await input({
    message: 'Epic ID (parent work item on Azure DevOps):',
    validate: (v) => /^\d+$/.test(v.trim()) || 'Enter a numeric ID',
  });

  const dryRun = await confirm({ message: 'Dry run (simulation)?', default: true });

  const ok = await confirm({
    message: `Confirm push of ${taskSetId}${dryRun ? ' (DRY RUN)' : ''}?`,
    default: false,
  });
  if (!ok) {
    console.log('  Cancelled.');
    return;
  }

  console.log();
  try {
    const results = await pushTaskSet(taskSetId, { sprint, epicId: parseInt(epicId, 10), dryRun });
    const created = results.filter((r) => r.action === '[CREATE]').length;
    const updated = results.filter((r) => r.action === '[UPDATE]').length;
    console.log(`\n  Summary: ${created} created, ${updated} updated, ${results.length} total`);
  } catch (e) {
    console.error(`\n  ERROR: ${e.message}`);
  }
}

async function handlePushStepByStep(select, confirm, input) {
  if (!checkEnvInteractive()) return;

  const sprint = await pickSprint(select);
  if (!sprint) return;

  const taskSetId = await pickTaskSet(select, sprint);
  if (!taskSetId) return;

  const validation = validateTaskSet(taskSetId, sprint);
  if (!validation.valid) {
    console.log(`\n    FAIL Validation failed for ${taskSetId}:`);
    validation.errors.forEach((e) => console.log(`         - ${e}`));
    return;
  }
  console.log(`\n    OK Validation passed\n`);

  const epicId = await input({
    message: 'Epic ID (parent work item on Azure DevOps):',
    validate: (v) => /^\d+$/.test(v.trim()) || 'Enter a numeric ID',
  });

  const dryRun = await confirm({ message: 'Dry run (simulation)?', default: true });

  const plan = getWorkItemPlan(taskSetId, sprint);
  const totalItems = plan.length;

  console.log(`\n  Push plan: ${totalItems} work items\n`);
  console.log(`  ${'#'.padStart(4)}  ${'Type'.padEnd(12)} ${'Action'.padEnd(8)} ${'ID'.padEnd(8)} Title`);
  console.log(`  ${'-'.repeat(4)}  ${'-'.repeat(12)} ${'-'.repeat(8)} ${'-'.repeat(8)} ${'-'.repeat(40)}`);
  plan.forEach((item, i) => {
    const indent = item.type === 'Task' ? '    ' : item.type === 'User Story' ? '  ' : '';
    console.log(`  ${String(i + 1).padStart(4)}  ${item.type.padEnd(12)} ${item.action.padEnd(8)} ${item.localId.padEnd(8)} ${indent}${item.title}`);
  });
  console.log();

  const startOk = await confirm({
    message: `Start step-by-step push${dryRun ? ' (DRY RUN)' : ''}?`,
    default: true,
  });
  if (!startOk) {
    console.log('  Cancelled.');
    return;
  }

  const { DevOpsApi } = require('./devops-api');
  const { buildFeaturePatch, buildUserStoryPatch, buildTaskPatch, buildPredecessorPatch } = require('./mapper');

  const data = loadTaskJson(taskSetId, sprint);
  if (!data.devops) data.devops = { epicId: null, featureId: null, mapping: {} };
  if (!data.devops.mapping) data.devops.mapping = {};
  data.devops.epicId = parseInt(epicId, 10);

  const env = {
    org: process.env.AZURE_DEVOPS_ORG,
    iterationPath: process.env.AZURE_DEVOPS_ITERATION_PATH,
    areaPath: process.env.AZURE_DEVOPS_AREA_PATH,
  };

  let api = null;
  if (!dryRun) {
    api = new DevOpsApi({
      org: process.env.AZURE_DEVOPS_ORG,
      project: process.env.AZURE_DEVOPS_PROJECT,
      pat: process.env.AZURE_DEVOPS_PAT,
    });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < plan.length; i++) {
    const item = plan[i];
    const stepLabel = `[${i + 1}/${totalItems}]`;

    console.log(`\n  +------------------------------------------------`);
    console.log(`  | ${stepLabel} ${item.action} ${item.type}`);
    console.log(`  | Title:   ${item.title}`);
    console.log(`  | ID:      ${item.localId}${item.devopsId ? ` (DevOps: ${item.devopsId})` : ''}`);
    console.log(`  | Detail:  ${item.detail}`);
    if (item.dependsOn.length > 0) {
      console.log(`  | Depends on: ${item.dependsOn.join(', ')}`);
    }
    console.log(`  +------------------------------------------------`);

    const action = await select({
      message: `${stepLabel} What do you do?`,
      choices: [
        { name: 'Proceed - create/update this work item', value: 'go' },
        { name: 'Skip - move to next', value: 'skip' },
        { name: 'Stop - halt here (previous items stay saved)', value: 'stop' },
      ],
    });

    if (action === 'stop') {
      console.log('\n  Stopped.');
      break;
    }

    if (action === 'skip') {
      skipped++;
      console.log(`    -> skipped`);
      continue;
    }

    try {
      if (item.type === 'Feature') {
        const patch = buildFeaturePatch(data.feature, data.devops.epicId, env);
        if (data.devops.featureId) {
          if (!dryRun) await api.updateWorkItem(data.devops.featureId, patch);
          console.log(`    OK  UPDATE Feature (ID: ${data.devops.featureId})`);
          updated++;
        } else {
          if (!dryRun) {
            const wi = await api.createWorkItem('Feature', patch);
            data.devops.featureId = wi.id;
            saveTaskJson(taskSetId, data, sprint);
            console.log(`    OK  CREATE Feature -> ID: ${wi.id}`);
          } else {
            console.log(`    OK  CREATE Feature (dry-run)`);
          }
          created++;
        }
      } else if (item.type === 'User Story') {
        const us = data.userStories.find((u) => u.id === item.localId);
        const patch = buildUserStoryPatch(us, data.devops.featureId, env);
        const existingId = data.devops.mapping[item.localId];
        if (existingId) {
          if (!dryRun) await api.updateWorkItem(existingId, patch);
          console.log(`    OK  UPDATE User Story (ID: ${existingId})`);
          updated++;
        } else {
          if (!dryRun) {
            const wi = await api.createWorkItem('User Story', patch);
            data.devops.mapping[item.localId] = wi.id;
            saveTaskJson(taskSetId, data, sprint);
            console.log(`    OK  CREATE User Story -> ID: ${wi.id}`);
          } else {
            console.log(`    OK  CREATE User Story (dry-run)`);
          }
          created++;
        }
      } else if (item.type === 'Task') {
        const parentUsId = data.devops.mapping[item.parentLocalId] || null;
        const us = data.userStories.find((u) => u.id === item.parentLocalId);
        const task = us.tasks.find((t) => t.id === item.localId);
        const patch = buildTaskPatch(task, parentUsId, env);
        const existingId = data.devops.mapping[item.localId];
        if (existingId) {
          if (!dryRun) await api.updateWorkItem(existingId, patch);
          console.log(`    OK  UPDATE Task (ID: ${existingId})`);
          updated++;
        } else {
          if (!dryRun) {
            const wi = await api.createWorkItem('Task', patch);
            data.devops.mapping[item.localId] = wi.id;
            saveTaskJson(taskSetId, data, sprint);
            console.log(`    OK  CREATE Task -> ID: ${wi.id}`);
          } else {
            console.log(`    OK  CREATE Task (dry-run)`);
          }
          created++;
        }
      }
    } catch (e) {
      console.error(`    FAIL ERROR: ${e.message}`);
      const continueAfterError = await confirm({ message: 'Continue despite error?', default: false });
      if (!continueAfterError) {
        console.log('\n  Stopped due to error.');
        break;
      }
    }
  }

  // Predecessor links
  const depItems = [];
  for (const us of data.userStories) {
    if (Array.isArray(us.dependsOn) && us.dependsOn.length > 0) {
      depItems.push({ id: us.id, dependsOn: us.dependsOn });
    }
    for (const task of us.tasks) {
      if (Array.isArray(task.dependsOn) && task.dependsOn.length > 0) {
        depItems.push({ id: task.id, dependsOn: task.dependsOn });
      }
    }
  }
  const linkable = depItems.filter((d) => {
    const itemId = data.devops.mapping[d.id];
    const predIds = d.dependsOn.map((dep) => data.devops.mapping[dep]).filter(Boolean);
    return itemId && predIds.length > 0;
  });

  if (linkable.length > 0) {
    console.log(`\n  ${linkable.length} predecessor relationships to create.`);
    const doLinks = await confirm({ message: 'Create predecessor links?', default: true });
    if (doLinks) {
      for (const item of linkable) {
        const itemDevOpsId = data.devops.mapping[item.id];
        const predIds = item.dependsOn.map((dep) => data.devops.mapping[dep]).filter(Boolean);
        console.log(`    [LINK] ${item.id} (${itemDevOpsId}) <- predecessors: ${predIds.join(', ')}`);
        if (!dryRun) {
          try {
            const predPatch = buildPredecessorPatch(predIds, env.org);
            await api.updateWorkItem(itemDevOpsId, predPatch);
          } catch (e) {
            console.error(`    FAIL link error ${item.id}: ${e.message}`);
          }
        }
      }
    }
  }

  console.log(`\n  -----------------------------------------`);
  console.log(`  Created: ${created}  |  Updated: ${updated}  |  Skipped: ${skipped}`);
  console.log(`  -----------------------------------------`);
}

async function handleSummary(select) {
  const sprint = await pickSprint(select);
  if (!sprint) return;

  const ids = getTaskSetIds(sprint);
  if (ids.length === 0) {
    console.log(`\n  No task breakdowns in Sprint ${sprint}.\n`);
    return;
  }

  console.log(`\n  Sprint ${sprint} summary  (${ids.length} task breakdowns)\n`);
  console.log(`  ${'Task set'.padEnd(14)} ${'Feature'.padEnd(45)} ${'US'.padStart(3)} ${'Task'.padStart(5)} ${'Hours'.padStart(6)}`);
  console.log(`  ${'-'.repeat(14)} ${'-'.repeat(45)} ${'-'.repeat(3)} ${'-'.repeat(5)} ${'-'.repeat(6)}`);

  let totalUs = 0;
  let totalTasks = 0;
  let totalHours = 0;

  for (const id of ids) {
    const info = getTaskSetSummary(id, sprint);
    const title = info.title.length > 43 ? info.title.substring(0, 42) + '...' : info.title;
    console.log(`  ${id.padEnd(14)} ${title.padEnd(45)} ${String(info.usCount).padStart(3)} ${String(info.taskCount).padStart(5)} ${String(info.totalHours).padStart(6)}`);
    totalUs += info.usCount;
    totalTasks += info.taskCount;
    totalHours += info.totalHours;
  }

  console.log(`  ${'-'.repeat(14)} ${'-'.repeat(45)} ${'-'.repeat(3)} ${'-'.repeat(5)} ${'-'.repeat(6)}`);
  console.log(`  ${'TOTAL'.padEnd(14)} ${''.padEnd(45)} ${String(totalUs).padStart(3)} ${String(totalTasks).padStart(5)} ${String(totalHours).padStart(6)}`);
  console.log();
}

// -- Helpers -----------------------------------------------------------

function checkEnvInteractive() {
  const required = ['AZURE_DEVOPS_ORG', 'AZURE_DEVOPS_PROJECT', 'AZURE_DEVOPS_PAT'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.log(`\n  FAIL Missing environment variables: ${missing.join(', ')}`);
    console.log('  Copy .env.example to .env and fill in the values.\n');
    return false;
  }
  return true;
}

main().catch((err) => {
  if (err.name === 'ExitPromptError') {
    console.log('\nBye!');
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
});
