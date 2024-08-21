import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import {
  getComparisonMarkdownTable,
  getDynamicBundleSizes,
  getSingleColumnMarkdownTable,
  getStaticAppBundleSizes,
  getStaticPagesBundleSizes,
} from './bundle-size';

import { createOrReplaceComment } from './comments';
import { determineAppName } from './determine-app-name';
import { downloadArtifactAsJson } from './download-artifacts';
import { getInputs } from './input-helper';
import { createOrReplaceIssue } from './issue';
import { uploadJsonAsArtifact } from './upload-artifacts';

const ARTIFACT_NAME_PREFIX = 'next-bundle-analyzer__';
const APP_FILE_NAME = 'app-bundle-sizes.json';
const PAGES_FILE_NAME = 'bundle-sizes.json';
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
    const referenceAppBundleSizes = (await downloadArtifactAsJson(
      octokit,
      default_branch,
      artifactName,
      APP_FILE_NAME,
    )) || { sha: 'none', data: [] };
    console.log(referenceAppBundleSizes);
    const referencePagesBundleSizes = (await downloadArtifactAsJson(
      octokit,
      default_branch,
      artifactName,
      PAGES_FILE_NAME,
    )) || { sha: 'none', data: [] };
    console.log(referencePagesBundleSizes);
    const referenceDynamicBundleSizes = (await downloadArtifactAsJson(
      octokit,
      default_branch,
      artifactName,
      DYNAMIC_FILE_NAME,
    )) || { sha: 'none', data: [] };
    console.log(referenceDynamicBundleSizes);

    console.log('> Calculating local bundle sizes');
    const appBundleSizes = getStaticAppBundleSizes(inputs.workingDirectory);
    console.log('>> Route (App)');
    console.log(appBundleSizes);
    const pagesBundleSizes = getStaticPagesBundleSizes(inputs.workingDirectory);
    console.log('>> Route (Pages)');
    console.log(pagesBundleSizes);
    const dynamicBundleSizes = getDynamicBundleSizes(inputs.workingDirectory);
    console.log('>> Dynamic import');
    console.log(dynamicBundleSizes);

    console.log('> Uploading local bundle sizes');
    await uploadJsonAsArtifact(artifactName, [
      { fileName: APP_FILE_NAME, data: appBundleSizes },
      { fileName: PAGES_FILE_NAME, data: pagesBundleSizes },
      { fileName: DYNAMIC_FILE_NAME, data: dynamicBundleSizes },
    ]);

    if (issueNumber) {
      const title = `### Bundle sizes [${appName}]`;
      const shaInfo = `Compared against ${referencePagesBundleSizes.sha}`;
      const appRoutesTable = getComparisonMarkdownTable({
        referenceBundleSizes: referenceAppBundleSizes.data,
        actualBundleSizes: appBundleSizes,
        name: 'Route (App)',
      });
      const pagesRoutesTable = getComparisonMarkdownTable({
        referenceBundleSizes: referencePagesBundleSizes.data,
        actualBundleSizes: pagesBundleSizes,
        name: 'Route (Pages)',
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
        appRoutesTable,
        pagesRoutesTable,
        dynamicTable,
        strategy: inputs.commentStrategy,
      });
    } else if (context.ref === `refs/heads/${default_branch}` && inputs.createIssue) {
      console.log('> Creating/updating bundle size issue');
      const title = `Bundle sizes [${appName}]`;
      const appRoutesTable = getSingleColumnMarkdownTable({
        bundleSizes: appBundleSizes,
        name: 'Route (App)',
      });
      const pagesRoutesTable = getSingleColumnMarkdownTable({
        bundleSizes: pagesBundleSizes,
        name: 'Route (Pages)',
      });
      const dynamicTable = getSingleColumnMarkdownTable({
        bundleSizes: dynamicBundleSizes,
        name: 'Dynamic import',
      });
      createOrReplaceIssue({
        octokit,
        title,
        appRoutesTable,
        pagesRoutesTable,
        dynamicTable,
      });
    }
  } catch (e) {
    console.log(e);
    core.setFailed((e as { message?: any })?.message);
  }
}

run();
