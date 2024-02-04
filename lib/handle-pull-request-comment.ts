import * as core from "@actions/core";
import { readFileSync } from "fs";
import { IssueCommentEvent } from "@octokit/webhooks-types";
import schedule from "./schedule";

/**
 * Handle "pull_request" event
 */
export default async function handlePullRequestComment(): Promise<void> {
  if (!process.env.GITHUB_TOKEN) {
    core.setFailed("GITHUB_TOKEN environment variable is not set");
    return;
  }

  const eventPayload = JSON.parse(
    readFileSync(process.env.GITHUB_EVENT_PATH, { encoding: "utf8" })
  ) as IssueCommentEvent;

  const issue = eventPayload.issue;

  core.info(
    `Handling issue_comment ${eventPayload.action} for ${issue.html_url}`
  );

  if (issue.state !== "open") {
    core.info("Issue already closed, ignoring");
    return;
  }

  if (eventPayload.action === "deleted") {
    core.info("Comment deleted, ignoring");
    return;
  }

  await schedule(eventPayload.issue.number);
}
