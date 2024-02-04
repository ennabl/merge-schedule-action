import * as core from "@actions/core";
import * as github from "@actions/github";
import {
  createComment,
  deleteComment,
  generateBody,
  getPreviousComment,
  updateComment,
} from "./comment";
import {
  getScheduleDateString,
  hasScheduleCommand,
  isValidDate,
  stringifyDate,
} from "./utils";
import { localeDate, localeDateString } from "./locale-date";

export default async function schedule(pullRequestId: number): Promise<void> {
  if (!process.env.GITHUB_TOKEN) {
    core.setFailed("GITHUB_TOKEN environment variable is not set");
    return;
  }

  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

  const pullRequest = await octokit.rest.pulls.get({
    ...github.context.repo,
    pull_number: pullRequestId,
  });

  const previousComment = await getPreviousComment(
    octokit,
    pullRequest.data.number
  );

  const comments = await octokit.paginate(
    octokit.rest.issues.listComments,
    {
      ...github.context.repo,
      issue_number: pullRequestId,
    },
    (response) => {
      return response.data;
    }
  );

  if (
    !(
      hasScheduleCommand(pullRequest.data.body ?? "") ||
      comments.some((c) => hasScheduleCommand(c.body ?? ""))
    )
  ) {
    core.info("No /schedule command found");
    if (previousComment) {
      await deleteComment(octokit, previousComment.id);
    }
    return;
  }

  const commentsWithBody: string[] = [
    pullRequest.data.body ?? "",
    ...comments.map((c) => c.body ?? ""),
  ];
  const scheduledDateString =
    commentsWithBody
      .reverse()
      .map((element) => getScheduleDateString(element))
      .find((element) => element !== "") ?? "";
  const scheduledDate = localeDateString(scheduledDateString);

  core.info(
    `Schedule command found in pull request body: "${scheduledDateString}"`
  );

  let commentBody: string;

  if (!isValidDate(scheduledDate)) {
    commentBody = generateBody(
      `"${scheduledDateString}" is not a valid date`,
      "error"
    );
  } else if (scheduledDate < localeDate()) {
    const message = `${stringifyDate(
      scheduledDate
    )} is already in the past. Current time is ${stringifyDate(
      localeDate()
    )}. Timezone: ${process.env.INPUT_TIME_ZONE}`;
    commentBody = generateBody(message, "warning");
  } else {
    commentBody = generateBody(
      `Scheduled to be merged on ${stringifyDate(scheduledDate)} (${
        process.env.INPUT_TIME_ZONE
      })`,
      "pending"
    );
  }

  if (previousComment) {
    if (previousComment.body === commentBody) {
      core.info("Comment already up to date");
      return;
    }
    const { data } = await updateComment(
      octokit,
      previousComment.id,
      commentBody
    );
    core.info(`Comment updated: ${data.html_url}`);
    return;
  }

  const { data } = await createComment(
    octokit,
    pullRequest.data.number,
    commentBody
  );
  core.info(`Comment created: ${data.html_url}`);
}
