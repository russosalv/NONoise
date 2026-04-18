'use strict';

/**
 * Maps the sprint task breakdown JSON structures to Azure DevOps
 * JSON Patch operations consumed by the REST API.
 */

/**
 * Build patch ops for a Feature work item.
 * @param {object} feature - Feature object from the task breakdown JSON
 * @param {number|null} epicId - Parent Epic work item ID
 * @param {object} env - { iterationPath, areaPath, org }
 * @returns {Array} JSON Patch operations
 */
function buildFeaturePatch(feature, epicId, env) {
  const ops = [
    { op: 'add', path: '/fields/System.Title', value: feature.title },
    { op: 'add', path: '/fields/System.Description', value: feature.description },
    { op: 'add', path: '/fields/System.Tags', value: feature.tags },
    { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.StoryPoints', value: feature.storyPoints },
  ];

  if (env.iterationPath) {
    ops.push({ op: 'add', path: '/fields/System.IterationPath', value: env.iterationPath });
  }
  if (env.areaPath) {
    ops.push({ op: 'add', path: '/fields/System.AreaPath', value: env.areaPath });
  }
  if (epicId) {
    ops.push({
      op: 'add',
      path: '/relations/-',
      value: {
        rel: 'System.LinkTypes.Hierarchy-Reverse',
        url: buildWorkItemUrl(env.org, epicId),
      },
    });
  }

  return ops;
}

/**
 * Build patch ops for a User Story work item.
 * @param {object} us - User Story object from the task breakdown JSON
 * @param {number} featureId - Parent Feature work item ID
 * @param {object} env - { iterationPath, areaPath, org }
 * @returns {Array} JSON Patch operations
 */
function buildUserStoryPatch(us, featureId, env) {
  const ops = [
    { op: 'add', path: '/fields/System.Title', value: us.title },
    { op: 'add', path: '/fields/System.Description', value: us.description },
    { op: 'add', path: '/fields/Microsoft.VSTS.Common.AcceptanceCriteria', value: us.acceptanceCriteria },
    { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.StoryPoints', value: us.storyPoints },
  ];

  if (env.iterationPath) {
    ops.push({ op: 'add', path: '/fields/System.IterationPath', value: env.iterationPath });
  }
  if (env.areaPath) {
    ops.push({ op: 'add', path: '/fields/System.AreaPath', value: env.areaPath });
  }
  if (featureId) {
    ops.push({
      op: 'add',
      path: '/relations/-',
      value: {
        rel: 'System.LinkTypes.Hierarchy-Reverse',
        url: buildWorkItemUrl(env.org, featureId),
      },
    });
  }

  return ops;
}

/**
 * Build patch ops for a Task work item.
 * @param {object} task - Task object from the task breakdown JSON
 * @param {number} usId - Parent User Story work item ID
 * @param {object} env - { iterationPath, areaPath, org }
 * @returns {Array} JSON Patch operations
 */
function buildTaskPatch(task, usId, env) {
  const ops = [
    { op: 'add', path: '/fields/System.Title', value: task.title },
    { op: 'add', path: '/fields/System.Description', value: task.description },
    { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.OriginalEstimate', value: task.originalEstimate },
    { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork', value: task.originalEstimate },
    { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.CompletedWork', value: 0 },
  ];

  if (task.assignedTo) {
    ops.push({ op: 'add', path: '/fields/System.AssignedTo', value: task.assignedTo });
  }
  if (env.iterationPath) {
    ops.push({ op: 'add', path: '/fields/System.IterationPath', value: env.iterationPath });
  }
  if (env.areaPath) {
    ops.push({ op: 'add', path: '/fields/System.AreaPath', value: env.areaPath });
  }
  if (usId) {
    ops.push({
      op: 'add',
      path: '/relations/-',
      value: {
        rel: 'System.LinkTypes.Hierarchy-Reverse',
        url: buildWorkItemUrl(env.org, usId),
      },
    });
  }

  return ops;
}

/**
 * Build a work item URL for relation links.
 */
function buildWorkItemUrl(org, id) {
  return `${org.replace(/\/$/, '')}/_apis/wit/workitems/${id}`;
}

/**
 * Build patch ops to add predecessor links to a work item.
 * @param {number[]} predecessorIds - DevOps work item IDs of predecessors
 * @param {string} org - Organization URL
 * @returns {Array} JSON Patch operations
 */
function buildPredecessorPatch(predecessorIds, org) {
  return predecessorIds.map((predId) => ({
    op: 'add',
    path: '/relations/-',
    value: {
      rel: 'System.LinkTypes.Dependency-Reverse',
      url: buildWorkItemUrl(org, predId),
      attributes: { comment: 'Auto-linked by @nonoise/devops-push' },
    },
  }));
}

module.exports = { buildFeaturePatch, buildUserStoryPatch, buildTaskPatch, buildPredecessorPatch };
