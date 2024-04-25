import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import {
  getComparisonMarkdownTable,
  getDynamicBundleSizes,
  getSingleColumnMarkdownTable,
  getStaticBundleSizes,
} from './bundle-size';

import { createOrReplaceComment } from './comments';
import { determineAppName } from './determine-app-name';
import { downloadArtifactAsJson } from './download-artifacts';
import { getInputs } from './input-helper';
import { createOrReplaceIssue } from './issue';
import { uploadJsonAsArtifact } from './upload-artifacts';

const ARTIFACT_NAME_PREFIX = 'next-bundle-analyzer__';
const FILE_NAME = 'bundle-sizes.json';
const DYNAMIC_FILE_NAME = 'dynamic-bundle-sizes.json';

async function run() {
  try {
    const inputs = getInputs();
    const appName = determineAppName(inputs.workingDirectory);
    const artifactName = `${ARTIFACT_NAME_PREFIX}${appName}`;

    const octokit = getOctokit(inputs.githubToken);

    const {
      data: { default_branch },
    } = await octokit.rest.repos.get(context.repo);

    const issueNumber = context.payload.pull_request?.number;

    console.log(`> Downloading bundle sizes from ${default_branch}`);
    const referenceBundleSizes = (await downloadArtifactAsJson(
      octokit,
      default_branch,
      artifactName,
      FILE_NAME,
    )) || { sha: 'none', data: [] };
    console.log(referenceBundleSizes);
    const referenceDynamicBundleSizes = (await downloadArtifactAsJson(
      octokit,
      default_branch,
      artifactName,
      DYNAMIC_FILE_NAME,
    )) || { sha: 'none', data: [] };
    console.log(referenceDynamicBundleSizes);

    console.log('> Calculating local bundle sizes');
    const bundleSizes = getStaticBundleSizes(inputs.workingDirectory);
    console.log(bundleSizes);
    const dynamicBundleSizes = getDynamicBundleSizes(inputs.workingDirectory);
    console.log(dynamicBundleSizes);

    console.log('> Uploading local bundle sizes');
    await uploadJsonAsArtifact(artifactName, [
      { fileName: FILE_NAME, data: bundleSizes },
      { fileName: DYNAMIC_FILE_NAME, data: dynamicBundleSizes },
    ]);

    if (issueNumber) {
      const title = `### Bundle sizes [${appName}]`;
      const shaInfo = `Compared against ${referenceBundleSizes.sha}`;
      const routesTable = getComparisonMarkdownTable({
        referenceBundleSizes: referenceBundleSizes.data,
        actualBundleSizes: bundleSizes,
        name: 'Route',
      });
      const dynamicTable = getComparisonMarkdownTable({
        referenceBundleSizes: referenceDynamicBundleSizes.data,
        actualBundleSizes: dynamicBundleSizes,
        name: 'Dynamic import',
      });
      createOrReplaceComment({
        octokit,
        issueNumber,
        title,
        shaInfo,
        routesTable,
        dynamicTable,
        strategy: inputs.commentStrategy,
      });
    } else if (context.ref === `refs/heads/${default_branch}` && inputs.createIssue) {
      console.log('> Creating/updating bundle size issue');
      const title = `Bundle sizes [${appName}]`;
      const routesTable = getSingleColumnMarkdownTable({ bundleSizes, name: 'Route' });
      const dynamicTable = getSingleColumnMarkdownTable({
        bundleSizes: dynamicBundleSizes,
        name: 'Dynamic import',
      });
      createOrReplaceIssue({
        octokit,
        title,
        routesTable,
        dynamicTable,
      });
    }
  } catch (e) {
    console.log(e);
    core.setFailed((e as { message?: any })?.message);
  }
}

run();
