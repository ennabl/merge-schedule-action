import * as core from "@actions/core";
import * as github from "@actions/github";
import type { SimplePullRequest } from "@octokit/webhooks-types";
import {
  createComment,
  generateBody,
  getPreviousComment,
  updateComment,
} from "./comment";
import { localeDate, localeDateString } from "./locale-date";
import { getCommitChecksRunsStatus, getCommitStatusesStatus } from "./commit";
import {
  isFork,
  isValidMergeMethod,
  hasScheduleCommand,
  stringifyDate,
  getScheduleDateString,
} from "./utils";
import moment from "moment-timezone";

interface ScheduledPullRequest {
  number: number;
  html_url: string;
  scheduledDate: moment.Moment;
  ref: string;
}

/**
 * handle "schedule" event
 */
export default async function handleSchedule(): Promise<void> {
  if (!process.env.GITHUB_TOKEN) {
    core.setFailed("GITHUB_TOKEN environment variable is not set");
    return;
  }

  const mergeMethod = process.env.INPUT_MERGE_METHOD;
  const requireStatusesSuccess =
    process.env.INPUT_REQUIRE_STATUSES_SUCCESS === "true";
  const automergeFailLabel = process.env.INPUT_AUTOMERGE_FAIL_LABEL;
  if (!isValidMergeMethod(mergeMethod)) {
    core.setFailed(`merge_method "${mergeMethod}" is invalid`);
    return;
  }

  core.info(`GITHUB_TOKEN: ${process.env.GITHUB_TOKEN}`);

  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

  core.info("Loading open pull requests");

  const pullRequestsFilteredByLabel = await octokit.paginate(
    octokit.rest.pulls.list,
    {
      ...github.context.repo,
      state: "open",
    },
    (response) => {
      return response.data
        .filter((pullRequest) => !isFork(pullRequest as SimplePullRequest))
        .filter((pullRequest) =>
          pullRequest.labels.every((label) => label.name !== automergeFailLabel)
        );
    }
  );

  const pullRequests: ScheduledPullRequest[] = (
    (await Promise.all(
      pullRequestsFilteredByLabel.map(
        async (pullRequest): Promise<ScheduledPullRequest | null> => {
          const comments = await octokit.rest.issues.listComments({
            ...github.context.repo,
            issue_number: pullRequest.number,
          });
          const prHasScheduleCommand =
            hasScheduleCommand(pullRequest.body ?? "") ||
            comments.data.some((comment) =>
              hasScheduleCommand(comment.body ?? "")
            );
          if (prHasScheduleCommand) {
            const commentsWithBody: string[] = [
              pullRequest.body ?? "",
              ...comments.data.map((c) => c.body ?? ""),
            ];
            const scheduledDateString =
              commentsWithBody
                .reverse()
                .map((element) => getScheduleDateString(element))
                .find((element) => element !== "") ?? "";
            return {
              number: pullRequest.number,
              html_url: pullRequest.html_url,
              scheduledDate: localeDateString(scheduledDateString),
              ref: pullRequest.head.sha,
            };
          } else {
            return null;
          }
        }
      )
    )) as ScheduledPullRequest[]
  ).filter(Boolean);

  core.info(`${pullRequests.length} scheduled pull requests found`);

  if (pullRequests.length === 0) {
    return;
  }

  const duePullRequests = pullRequests.filter(
    (pr) => pr.scheduledDate < localeDate()
  );

  core.info(`${duePullRequests.length} due pull requests found`);

  if (duePullRequests.length === 0) {
    return;
  }

  for await (const pullRequest of duePullRequests) {
    if (requireStatusesSuccess) {
      const [checkRunsStatus, statusesStatus] = await Promise.all([
        getCommitChecksRunsStatus(octokit, pullRequest.ref),
        getCommitStatusesStatus(octokit, pullRequest.ref),
      ]);
      if (checkRunsStatus !== "completed" || statusesStatus !== "success") {
        core.info(
          `${pullRequest.html_url} is not ready to be merged yet because all checks are not completed or statuses are not success`
        );
        continue;
      }
    }

    try {
      await octokit.rest.pulls.merge({
        ...github.context.repo,
        pull_number: pullRequest.number,
        merge_method: mergeMethod,
      });
      core.info(`${pullRequest.html_url} merged`);
    } catch (error) {
      const previousComment = await getPreviousComment(
        octokit,
        pullRequest.number,
        "fail"
      );
      const commentBody = generateBody(
        `Scheduled merge failed: ${
          (error as Error).message
        }\nIn order to let the automerge-automation try again, the label "${automergeFailLabel}" should be removed.`,
        "error",
        "fail"
      );
      if (previousComment) {
        const { data } = await updateComment(
          octokit,
          previousComment.id,
          commentBody
        );
        core.info(`Comment updated: ${data.html_url}`);
      } else {
        const { data } = await createComment(
          octokit,
          pullRequest.number,
          commentBody
        );
        core.info(`Comment created: ${data.html_url}`);
      }
      await octokit.rest.issues.addLabels({
        ...github.context.repo,
        issue_number: pullRequest.number,
        labels: [automergeFailLabel],
      });
      core.info(`Label added: "${automergeFailLabel}"`);
      continue;
    }

    const previousComment = await getPreviousComment(
      octokit,
      pullRequest.number
    );

    let commentBody = "";
    if (pullRequest.scheduledDate) {
      commentBody = generateBody(
        `Scheduled on ${stringifyDate(pullRequest.scheduledDate)} (${
          process.env.INPUT_TIME_ZONE
        }) successfully merged`,
        "success"
      );
    } else {
      commentBody = generateBody(
        `Scheduled on next cron expression successfully merged`,
        "success"
      );
    }

    if (previousComment) {
      const { data } = await updateComment(
        octokit,
        previousComment.id,
        commentBody
      );
      core.info(`Comment updated: ${data.html_url}`);
      continue;
    }

    const { data } = await createComment(
      octokit,
      pullRequest.number,
      commentBody
    );
    core.info(`Comment created: ${data.html_url}`);
  }
}
