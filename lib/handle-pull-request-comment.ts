import * as core from "@actions/core";
import * as github from "@actions/github";
import {readFileSync} from "fs";
import localeDate from "./locale-date";
import {
    IssueCommentEvent,
} from "@octokit/webhooks-types";
import {
    findScheduleDateCommand,
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
export default async function handlePullRequestComment(): Promise<void> {
    if (!process.env.GITHUB_TOKEN) {
        core.setFailed("GITHUB_TOKEN environment variable is not set");
        return;
    }

    const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

    const eventPayload = JSON.parse(
        readFileSync(process.env.GITHUB_EVENT_PATH, {encoding: "utf8"})
    ) as IssueCommentEvent;

    const issue = eventPayload.issue;

    core.info(
        `Handling issue ${eventPayload.action} for ${issue.html_url}`
    );

    if (issue.state !== "open") {
        core.info("Issue already closed, ignoring");
        return;
    }

    const previousComment = await getPreviousComment(octokit, issue.number);
    const scheduledDate: string = await findScheduleDateCommand(issue.number, octokit);

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
        issue.number,
        commentBody
    );
    core.info(`Comment created: ${data.html_url}`);
}
