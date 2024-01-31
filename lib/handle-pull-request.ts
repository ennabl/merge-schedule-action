import * as core from "@actions/core";
import * as github from "@actions/github";
import {readFileSync} from "fs";
import localeDate from "./locale-date";
import type {
    PullRequestEvent,
    SimplePullRequest,
} from "@octokit/webhooks-types";
import {
    getScheduleDateString,
    findScheduleDateCommand,
    isFork,
    isValidDate,
    stringifyDate,
} from "./utils";
import {
    createComment,
    deleteComment,
    generateBody,
    getPreviousComment,
    updateComment,
} from "./comment";

/**
 * Handle "pull_request" event
 */
export default async function handlePullRequest(): Promise<void> {
    if (!process.env.GITHUB_TOKEN) {
        core.setFailed("GITHUB_TOKEN environment variable is not set");
        return;
    }

    const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

    const eventPayload = JSON.parse(
        readFileSync(process.env.GITHUB_EVENT_PATH, {encoding: "utf8"})
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

    const previousComment = await getPreviousComment(octokit, pullRequest.number);
    const scheduledDate = await findScheduleDateCommand(pullRequest.number, octokit);

    if (scheduledDate) {
        core.info(`Schedule date found: "${scheduledDate}"`);
    } else {
        if (previousComment) {
            await deleteComment(octokit, previousComment.id);
        }
        core.info("No /schedule command found");
        return;
    }

    let commentBody: string;

    if (scheduledDate) {
        if (!isValidDate(scheduledDate)) {
            commentBody = generateBody(
                `"${scheduledDate}" is not a valid date`,
                "error"
            );
        } else if (new Date(scheduledDate) < localeDate()) {
            let message = `${stringifyDate(scheduledDate)} (UTC) is already in the past`;
            if (process.env.INPUT_TIME_ZONE !== "UTC") {
                message = `${message} on ${process.env.INPUT_TIME_ZONE} time zone`;
            }
            commentBody = generateBody(message, "warning");
        } else {
            commentBody = generateBody(
                `Scheduled to be merged on ${stringifyDate(scheduledDate)} (UTC)`,
                "pending"
            );
        }
    } else {
        commentBody = generateBody(
            `Scheduled to be merged the next time the merge action is scheduled via the cron expressions`,
            "pending"
        );
    }

    if (previousComment) {
        if (previousComment.body === commentBody) {
            core.info("Comment already up to date");
            return;
        }
        const {data} = await updateComment(
            octokit,
            previousComment.id,
            commentBody
        );
        core.info(`Comment updated: ${data.html_url}`);
        return;
    }

    const {data} = await createComment(
        octokit,
        pullRequest.number,
        commentBody
    );
    core.info(`Comment created: ${data.html_url}`);
}
