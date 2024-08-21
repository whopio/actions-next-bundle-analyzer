import { context } from '@actions/github';

import type { Octokit } from './types';
import { formatTextFragments } from './text-format';

async function findIssueByTitleMatch({ octokit, title }: { octokit: Octokit; title: string }) {
  const { data: issues } = await octokit.rest.issues.listForRepo(context.repo);
  return issues.find((issue) => issue.title === title);
}

export async function createOrReplaceIssue({
  octokit,
  title,
  appRoutesTable,
  pagesRoutesTable,
  dynamicTable,
}: {
  octokit: Octokit;
  title: string;
  appRoutesTable: string;
  pagesRoutesTable: string;
  dynamicTable: string;
}): Promise<void> {
  const existingIssue = await findIssueByTitleMatch({ octokit, title });
  const body = formatTextFragments(appRoutesTable, pagesRoutesTable, dynamicTable);

  if (existingIssue) {
    console.log(`Updating issue ${existingIssue.number} with latest bundle sizes`);
    const response = await octokit.rest.issues.update({
      ...context.repo,
      body,
      issue_number: existingIssue.number,
    });
    console.log(`Issue update response status ${response.status}`);
  } else {
    console.log(`Creating issue "${title}" to show latest bundle sizes`);
    const response = await octokit.rest.issues.create({
      ...context.repo,
      body,
      title,
    });
    console.log(`Issue creation response status ${response.status}`);
  }
}
