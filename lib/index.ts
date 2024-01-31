import * as core from "@actions/core";
import * as github from "@actions/github";

import handlePullRequest from "./handle-pull-request";
import handleSchedule from "./handle-schedule";
import handlePullRequestComment from "./handle-pull-request-comment";

main();

async function main() {
    try {
        if (github.context.eventName === "pull_request") {
            await handlePullRequest();
            return;
        }

        if (github.context.eventName === "issue_comment") {
            await handlePullRequestComment();
            return;
        }

        await handleSchedule();
    } catch (error) {
        core.setFailed(error as Error);
    }
}
