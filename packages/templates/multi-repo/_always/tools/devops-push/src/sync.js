'use strict';

const fs = require('fs');
const path = require('path');
const { DevOpsApi } = require('./devops-api');
const {
  buildFeaturePatch,
  buildUserStoryPatch,
  buildTaskPatch,
  buildPredecessorPatch,
} = require('./mapper');
const {
  getSprintWorkspace,
  getTasksDir,
  getExportDir,
  getDevelopersFile,
} = require('./paths');

/**
 * Discover available sprints that have a `tasks/` directory with JSON files.
 * Returns an ascending list of sprint numbers.
 */
function getAvailableSprints() {
  const workspace = getSprintWorkspace();
  if (!fs.existsSync(workspace)) return [];
  return fs
    .readdirSync(workspace)
    .filter((d) => /^Sprint-\d+$/.test(d))
    .map((d) => parseInt(d.replace('Sprint-', ''), 10))
    .filter((n) => {
      const dir = getTasksDir(n);
      return fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.endsWith('-tasks.json'));
    })
    .sort((a, b) => a - b);
}

/**
 * Load and parse a task breakdown JSON file.
 */
function loadTaskJson(taskSetId, sprint) {
  const filePath = path.join(getTasksDir(sprint), `${taskSetId}-tasks.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Save task breakdown JSON back to disk (crash-safe: write to temp then rename).
 */
function saveTaskJson(taskSetId, data, sprint) {
  const filePath = path.join(getTasksDir(sprint), `${taskSetId}-tasks.json`);
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

/**
 * Load developers config (used for assignment validation).
 */
function loadDevelopers() {
  const file = getDevelopersFile();
  if (!fs.existsSync(file)) {
    throw new Error(`Developers config not found: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

/**
 * Validate a single task breakdown JSON.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateTaskSet(taskSetId, sprint) {
  const errors = [];

  let data;
  try {
    data = loadTaskJson(taskSetId, sprint);
  } catch (e) {
    return { valid: false, errors: [e.message] };
  }

  // taskSetId consistency
  if (data.taskSetId !== taskSetId) {
    errors.push(`taskSetId mismatch: file says "${data.taskSetId}", expected "${taskSetId}"`);
  }

  // Load developers for email validation (soft failure)
  let devEmails = new Set();
  try {
    const devConfig = loadDevelopers();
    devEmails = new Set((devConfig.developers || []).map((d) => d.email));
  } catch (e) {
    errors.push(`Cannot load developers: ${e.message}`);
  }

  // Feature
  if (!data.feature || !data.feature.title) {
    errors.push('Missing feature or feature.title');
  }

  // User Stories
  if (!Array.isArray(data.userStories) || data.userStories.length === 0) {
    errors.push('No userStories found');
  }

  const allLocalIds = new Set();

  for (const us of data.userStories || []) {
    if (!us.id || !us.title) {
      errors.push(`User Story missing id or title`);
      continue;
    }
    allLocalIds.add(us.id);

    if (!Array.isArray(us.tasks) || us.tasks.length === 0) {
      errors.push(`User Story ${us.id} has no tasks`);
    }

    for (const task of us.tasks || []) {
      if (!task.id || !task.title) {
        errors.push(`Task missing id or title in ${us.id}`);
        continue;
      }
      allLocalIds.add(task.id);

      if (!task.originalEstimate || task.originalEstimate <= 0) {
        errors.push(`Task ${task.id} has invalid originalEstimate: ${task.originalEstimate}`);
      }

      if (task.assignedTo && devEmails.size > 0 && !devEmails.has(task.assignedTo)) {
        errors.push(`Task ${task.id} assignedTo "${task.assignedTo}" not found in developers.json`);
      }
    }
  }

  // dependsOn references must point to valid local IDs
  for (const us of data.userStories || []) {
    if (Array.isArray(us.dependsOn)) {
      for (const dep of us.dependsOn) {
        if (!allLocalIds.has(dep)) {
          errors.push(`US ${us.id} dependsOn "${dep}" not found in local IDs`);
        }
      }
    }
    for (const task of us.tasks || []) {
      if (Array.isArray(task.dependsOn)) {
        for (const dep of task.dependsOn) {
          if (!allLocalIds.has(dep)) {
            errors.push(`Task ${task.id} dependsOn "${dep}" not found in local IDs`);
          }
        }
      }
    }
  }

  // devops.mapping keys must match known local IDs
  if (data.devops && data.devops.mapping) {
    for (const key of Object.keys(data.devops.mapping)) {
      if (!allLocalIds.has(key)) {
        errors.push(`devops.mapping key "${key}" not found in userStories/tasks`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate all task breakdowns in a sprint.
 */
function validateAll(sprint) {
  const dir = getTasksDir(sprint);
  if (!fs.existsSync(dir)) {
    throw new Error(`Sprint tasks directory not found: ${dir}`);
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('-tasks.json'));
  if (files.length === 0) {
    throw new Error(`No task breakdown JSON files found in Sprint-${sprint}`);
  }

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const taskSetId = file.replace('-tasks.json', '');
    const result = validateTaskSet(taskSetId, sprint);
    results.push({ taskSetId, ...result });
    if (result.valid) passed++;
    else failed++;
  }

  return { total: files.length, passed, failed, results };
}

/**
 * Append a human-readable line to the push audit report for a sprint.
 * Report lives at <sprint>/export/devops-push-<YYYY-MM-DD>.md.
 */
function appendReport(sprint, line, { dryRun } = {}) {
  const dir = getExportDir(sprint);
  fs.mkdirSync(dir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const suffix = dryRun ? '-dryrun' : '';
  const file = path.join(dir, `devops-push-${today}${suffix}.md`);
  if (!fs.existsSync(file)) {
    const header = `# devops-push report — Sprint ${sprint}${dryRun ? ' (DRY RUN)' : ''}\n\n` +
      `Generated: ${new Date().toISOString()}\n\n`;
    fs.writeFileSync(file, header, 'utf-8');
  }
  fs.appendFileSync(file, line + '\n', 'utf-8');
}

/**
 * Push a single task breakdown to Azure DevOps.
 */
async function pushTaskSet(taskSetId, opts = {}) {
  const { sprint, epicId, dryRun = false } = opts;
  if (sprint == null) throw new Error('pushTaskSet: sprint is required');
  const data = loadTaskJson(taskSetId, sprint);

  if (!data.devops) {
    data.devops = { epicId: null, featureId: null, mapping: {} };
  }
  if (!data.devops.mapping) {
    data.devops.mapping = {};
  }

  if (epicId) {
    data.devops.epicId = epicId;
  }

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

  const results = [];
  const report = (line) => appendReport(sprint, line, { dryRun });
  report(`\n## ${taskSetId}`);

  // 1. Feature
  const featurePatch = buildFeaturePatch(data.feature, data.devops.epicId, env);
  if (data.devops.featureId) {
    const action = '[UPDATE]';
    console.log(`${action} Feature: ${data.feature.title} (ID: ${data.devops.featureId})`);
    report(`- ${action} Feature: ${data.feature.title} (ID: ${data.devops.featureId})`);
    if (!dryRun) {
      await api.updateWorkItem(data.devops.featureId, featurePatch);
    }
    results.push({ type: 'Feature', action, title: data.feature.title, id: data.devops.featureId });
  } else {
    const action = '[CREATE]';
    console.log(`${action} Feature: ${data.feature.title}`);
    if (!dryRun) {
      const wi = await api.createWorkItem('Feature', featurePatch);
      data.devops.featureId = wi.id;
      saveTaskJson(taskSetId, data, sprint);
      console.log(`  -> Created Feature ID: ${wi.id}`);
    }
    report(`- ${action} Feature: ${data.feature.title}${data.devops.featureId ? ` -> ID ${data.devops.featureId}` : ' (dry-run)'}`);
    results.push({ type: 'Feature', action, title: data.feature.title, id: data.devops.featureId });
  }

  // 2. User Stories + Tasks
  for (const us of data.userStories) {
    const usDevOpsId = data.devops.mapping[us.id] || null;
    const usPatch = buildUserStoryPatch(us, data.devops.featureId, env);

    if (usDevOpsId) {
      console.log(`  [UPDATE] User Story: ${us.title} (ID: ${usDevOpsId})`);
      report(`  - [UPDATE] User Story: ${us.title} (ID: ${usDevOpsId})`);
      if (!dryRun) {
        await api.updateWorkItem(usDevOpsId, usPatch);
      }
      results.push({ type: 'User Story', action: '[UPDATE]', title: us.title, id: usDevOpsId });
    } else {
      console.log(`  [CREATE] User Story: ${us.title}`);
      if (!dryRun) {
        const wi = await api.createWorkItem('User Story', usPatch);
        data.devops.mapping[us.id] = wi.id;
        saveTaskJson(taskSetId, data, sprint);
        console.log(`    -> Created User Story ID: ${wi.id}`);
      }
      report(`  - [CREATE] User Story: ${us.title}${data.devops.mapping[us.id] ? ` -> ID ${data.devops.mapping[us.id]}` : ' (dry-run)'}`);
      results.push({ type: 'User Story', action: '[CREATE]', title: us.title, id: data.devops.mapping[us.id] });
    }

    const parentUsId = data.devops.mapping[us.id] || null;
    for (const task of us.tasks) {
      const taskDevOpsId = data.devops.mapping[task.id] || null;
      const taskPatch = buildTaskPatch(task, parentUsId, env);

      if (taskDevOpsId) {
        console.log(`    [UPDATE] Task: ${task.title} (ID: ${taskDevOpsId})`);
        report(`    - [UPDATE] Task: ${task.title} (ID: ${taskDevOpsId})`);
        if (!dryRun) {
          await api.updateWorkItem(taskDevOpsId, taskPatch);
        }
        results.push({ type: 'Task', action: '[UPDATE]', title: task.title, id: taskDevOpsId });
      } else {
        console.log(`    [CREATE] Task: ${task.title}`);
        if (!dryRun) {
          const wi = await api.createWorkItem('Task', taskPatch);
          data.devops.mapping[task.id] = wi.id;
          saveTaskJson(taskSetId, data, sprint);
          console.log(`      -> Created Task ID: ${wi.id}`);
        }
        report(`    - [CREATE] Task: ${task.title}${data.devops.mapping[task.id] ? ` -> ID ${data.devops.mapping[task.id]}` : ' (dry-run)'}`);
        results.push({ type: 'Task', action: '[CREATE]', title: task.title, id: data.devops.mapping[task.id] });
      }
    }
  }

  // 3. Predecessor links — second pass
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

  if (depItems.length > 0) {
    console.log(`\n  Linking ${depItems.length} predecessor relationships...`);
    for (const item of depItems) {
      const itemDevOpsId = data.devops.mapping[item.id];
      if (!itemDevOpsId) continue;

      const predIds = item.dependsOn
        .map((dep) => data.devops.mapping[dep])
        .filter(Boolean);

      if (predIds.length === 0) continue;

      console.log(`    [LINK] ${item.id} (${itemDevOpsId}) <- predecessors: ${predIds.join(', ')}`);
      report(`  - [LINK] ${item.id} (${itemDevOpsId}) <- ${predIds.join(', ')}`);
      if (!dryRun) {
        const predPatch = buildPredecessorPatch(predIds, env.org);
        await api.updateWorkItem(itemDevOpsId, predPatch);
      }
    }
  }

  return results;
}

/**
 * Push all task breakdowns in a sprint.
 */
async function pushAll(opts = {}) {
  const { sprint, epicId, dryRun = false } = opts;
  if (sprint == null) throw new Error('pushAll: sprint is required');
  const dir = getTasksDir(sprint);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('-tasks.json'));

  if (files.length === 0) {
    console.log('No task breakdown JSON files found in', dir);
    return;
  }

  console.log(`Found ${files.length} task breakdown JSON files\n`);

  for (const file of files) {
    const taskSetId = file.replace('-tasks.json', '');
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${taskSetId}`);
    console.log('='.repeat(60));
    await pushTaskSet(taskSetId, { sprint, epicId, dryRun });
  }
}

/**
 * List task set IDs in a sprint.
 */
function getTaskSetIds(sprint) {
  const dir = getTasksDir(sprint);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('-tasks.json'))
    .map((f) => f.replace('-tasks.json', ''))
    .sort();
}

/**
 * Summary info for a single task breakdown (for menus / summary tables).
 */
function getTaskSetSummary(taskSetId, sprint) {
  try {
    const data = loadTaskJson(taskSetId, sprint);
    const usCount = data.userStories?.length || 0;
    let taskCount = 0;
    let totalHours = 0;
    for (const us of data.userStories || []) {
      taskCount += us.tasks?.length || 0;
      for (const t of us.tasks || []) {
        totalHours += t.originalEstimate || 0;
      }
    }
    return { title: data.feature?.title || '(no title)', usCount, taskCount, totalHours };
  } catch {
    return { title: '(error loading)', usCount: 0, taskCount: 0, totalHours: 0 };
  }
}

/**
 * Flat plan of work item operations for a task set (used by step-by-step mode).
 */
function getWorkItemPlan(taskSetId, sprint) {
  const data = loadTaskJson(taskSetId, sprint);
  const mapping = data.devops?.mapping || {};
  const plan = [];

  plan.push({
    type: 'Feature',
    action: data.devops?.featureId ? 'UPDATE' : 'CREATE',
    localId: 'feature',
    title: data.feature.title,
    detail: `${data.feature.storyPoints} SP | Tags: ${data.feature.tags}`,
    parentLocalId: null,
    dependsOn: [],
    devopsId: data.devops?.featureId || null,
  });

  for (const us of data.userStories) {
    plan.push({
      type: 'User Story',
      action: mapping[us.id] ? 'UPDATE' : 'CREATE',
      localId: us.id,
      title: us.title,
      detail: `${us.storyPoints} SP | ${us.tasks.length} task`,
      parentLocalId: 'feature',
      dependsOn: us.dependsOn || [],
      devopsId: mapping[us.id] || null,
    });

    for (const task of us.tasks) {
      plan.push({
        type: 'Task',
        action: mapping[task.id] ? 'UPDATE' : 'CREATE',
        localId: task.id,
        title: task.title,
        detail: `${task.originalEstimate}h | ${task.category} | ${task.assignedTo || 'unassigned'}`,
        parentLocalId: us.id,
        dependsOn: task.dependsOn || [],
        devopsId: mapping[task.id] || null,
      });
    }
  }

  return plan;
}

module.exports = {
  validateTaskSet,
  validateAll,
  pushTaskSet,
  pushAll,
  loadTaskJson,
  saveTaskJson,
  loadDevelopers,
  getAvailableSprints,
  getTaskSetIds,
  getTaskSetSummary,
  getWorkItemPlan,
};
