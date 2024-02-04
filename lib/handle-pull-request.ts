import * as core from "@actions/core";
import { readFileSync } from "fs";
import type {
  PullRequestEvent,
  SimplePullRequest,
} from "@octokit/webhooks-types";
import { isFork } from "./utils";
import schedule from "./schedule";

/**
 * Handle "pull_request" event
 */
export default async function handlePullRequest(): Promise<void> {
  if (!process.env.GITHUB_TOKEN) {
    core.setFailed("GITHUB_TOKEN environment variable is not set");
    return;
  }

  const eventPayload = JSON.parse(
    readFileSync(process.env.GITHUB_EVENT_PATH, { encoding: "utf8" })
  ) as PullRequestEvent;

  const pullRequest = eventPayload.pull_request;

  core.info(
    `Handling pull request ${eventPayload.action} for ${pullRequest.html_url}`
  );

  if (pullRequest.state !== "open") {
    core.info("Pull request already closed, ignoring");
    return;
  }

  if (isFork(pullRequest as SimplePullRequest)) {
    core.setFailed("Setting a scheduled merge is not allowed from forks");
    return;
  }

  await schedule(pullRequest.number);
}
