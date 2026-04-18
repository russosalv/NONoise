'use strict';

const fs = require('fs');
const path = require('path');
const { getTempDir } = require('./paths');

const API_VERSION = '7.1';

function getLogFile() {
  const dir = getTempDir();
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'devops-api.log');
}

/**
 * Append a log entry to the log file under `.temp/devops-push/`.
 */
function log(entry) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${entry}\n`;
  fs.appendFileSync(getLogFile(), line, 'utf-8');
}

/**
 * Azure DevOps REST API wrapper.
 * Uses native fetch with Basic auth (PAT).
 * All requests/responses are logged to `.temp/devops-push/devops-api.log`.
 */
class DevOpsApi {
  /**
   * @param {object} opts
   * @param {string} opts.org - Organization URL (e.g. https://dev.azure.com/my-org)
   * @param {string} opts.project - Project name
   * @param {string} opts.pat - Personal Access Token
   */
  constructor({ org, project, pat }) {
    this.baseUrl = `${org.replace(/\/$/, '')}/${encodeURIComponent(project)}`;
    this.headers = {
      'Content-Type': 'application/json-patch+json',
      Authorization: 'Basic ' + Buffer.from(':' + pat).toString('base64'),
    };
    log(`--- Session started ---`);
    log(`Base URL: ${this.baseUrl}`);
  }

  /**
   * Create a work item.
   * @param {string} type - Work item type (Epic, Feature, User Story, Task)
   * @param {Array} patchOps - JSON Patch operations array
   * @returns {Promise<object>} Created work item
   */
  async createWorkItem(type, patchOps) {
    const url = `${this.baseUrl}/_apis/wit/workitems/$${encodeURIComponent(type)}?api-version=${API_VERSION}`;
    log(`CREATE ${type} -> POST ${url}`);
    log(`  Body: ${JSON.stringify(patchOps)}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(patchOps),
    });

    const body = await res.text();
    log(`  Response: ${res.status} ${res.statusText}`);
    log(`  Body: ${body.substring(0, 500)}`);

    if (!res.ok) {
      throw new Error(`CREATE ${type} failed (${res.status}): ${body}`);
    }
    return JSON.parse(body);
  }

  /**
   * Update an existing work item.
   * @param {number} id - Work item ID
   * @param {Array} patchOps - JSON Patch operations array
   * @returns {Promise<object>} Updated work item
   */
  async updateWorkItem(id, patchOps) {
    const url = `${this.baseUrl}/_apis/wit/workitems/${id}?api-version=${API_VERSION}`;
    log(`UPDATE ${id} -> PATCH ${url}`);
    log(`  Body: ${JSON.stringify(patchOps)}`);

    const res = await fetch(url, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(patchOps),
    });

    const body = await res.text();
    log(`  Response: ${res.status} ${res.statusText}`);
    log(`  Body: ${body.substring(0, 500)}`);

    if (!res.ok) {
      throw new Error(`UPDATE ${id} failed (${res.status}): ${body}`);
    }
    return JSON.parse(body);
  }

  /**
   * Get a work item by ID.
   * @param {number} id - Work item ID
   * @returns {Promise<object>} Work item
   */
  async getWorkItem(id) {
    const url = `${this.baseUrl}/_apis/wit/workitems/${id}?api-version=${API_VERSION}`;
    log(`GET ${id} -> GET ${url}`);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: this.headers.Authorization,
      },
    });

    const body = await res.text();
    log(`  Response: ${res.status} ${res.statusText}`);
    log(`  Body: ${body.substring(0, 500)}`);

    if (!res.ok) {
      throw new Error(`GET ${id} failed (${res.status}): ${body}`);
    }
    return JSON.parse(body);
  }
}

module.exports = { DevOpsApi };
