'use strict';

/**
 * Central module for filesystem conventions inside a NONoise project.
 *
 * Layout (relative to repo root):
 *
 *   docs/sprints/Sprint-<N>/                         <- sprint folder
 *   docs/sprints/Sprint-<N>/tasks/<id>-tasks.json    <- task breakdown JSON files
 *   docs/sprints/Sprint-<N>/export/                  <- audit / dry-run reports
 *   tools/devops-push/.temp/                         <- transient cache / logs (git-ignored)
 *
 * All of these can be overridden via environment variables:
 *   SPRINT_WORKSPACE   — replaces docs/sprints
 *   EXPORT_DIR         — replaces <sprint>/export
 *   TEMP_DIR           — replaces <tool>/.temp/devops-push
 */

const fs = require('fs');
const path = require('path');

const TOOL_ROOT = path.resolve(__dirname, '..');

/**
 * Resolve the repo root. Heuristic: walk up from TOOL_ROOT until we find
 * a directory that contains either `nonoise.config.json` or a `.git` folder.
 * Fallback: 3 levels up (i.e. <repo>/tools/devops-push/src -> <repo>).
 */
function getRepoRoot() {
  let dir = TOOL_ROOT;
  for (let i = 0; i < 8; i++) {
    if (
      fs.existsSync(path.join(dir, 'nonoise.config.json')) ||
      fs.existsSync(path.join(dir, '.git'))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: assume tools/devops-push is directly under repo root.
  return path.resolve(TOOL_ROOT, '..', '..');
}

/**
 * Sprint workspace root. Defaults to <repo>/docs/sprints.
 */
function getSprintWorkspace() {
  if (process.env.SPRINT_WORKSPACE) {
    return path.resolve(process.env.SPRINT_WORKSPACE);
  }
  return path.join(getRepoRoot(), 'docs', 'sprints');
}

/**
 * Directory holding task breakdown JSON files for a given sprint.
 * Convention: <sprint>/tasks/<taskSetId>-tasks.json
 */
function getTasksDir(sprint) {
  return path.join(getSprintWorkspace(), `Sprint-${sprint}`, 'tasks');
}

/**
 * Export / audit directory for a given sprint.
 * Convention: <sprint>/export — used for dry-run reports and push audit trails.
 */
function getExportDir(sprint) {
  if (process.env.EXPORT_DIR) {
    return path.resolve(process.env.EXPORT_DIR);
  }
  return path.join(getSprintWorkspace(), `Sprint-${sprint}`, 'export');
}

/**
 * Transient cache / log directory. Git-ignored by this tool's .gitignore.
 */
function getTempDir() {
  if (process.env.TEMP_DIR) {
    return path.resolve(process.env.TEMP_DIR);
  }
  return path.join(TOOL_ROOT, '.temp');
}

/**
 * Developers config file. Lives under tools/devops-push/config/.
 */
function getDevelopersFile() {
  return path.join(TOOL_ROOT, 'config', 'developers.json');
}

module.exports = {
  getRepoRoot,
  getSprintWorkspace,
  getTasksDir,
  getExportDir,
  getTempDir,
  getDevelopersFile,
};
