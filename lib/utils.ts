import type {SimplePullRequest} from "@octokit/webhooks-types";
import * as github from "@actions/github";
import {GitHub} from "@actions/github/lib/utils";
import * as core from "@actions/core";

type Octokit = InstanceType<typeof GitHub>;

export async function findScheduleDateCommand(pullRequestId: number, octokit: Octokit): Promise<string> {
    const pullRequestResponse = await octokit.rest.pulls.get({
        ...github.context.repo,
        pull_number: pullRequestId,
    })

    const bodyDate = getScheduleDateString(pullRequestResponse.data.body);

    const commentDates: string[] = await octokit.paginate(
        octokit.rest.issues.listComments,
        {
            ...github.context.repo,
            issue_number: pullRequestResponse.data.number,
        },
        (response) => {
            return response
                .data
                .flatMap((comment) => getScheduleDateString(comment.body ?? ""))
                .filter(Boolean)
                .map((dateString) => new Date(dateString).toISOString());
        }
    )

    commentDates.unshift(bodyDate)

    core.info(`Dates: ${commentDates}`);

    const lastDate: string = commentDates.pop() ?? "";

    core.info(`Last date: ${lastDate}`);

    return lastDate
}

export function isFork(pullRequest: SimplePullRequest): boolean {
    return pullRequest.head.repo.fork;
}

export function getScheduleDateString(text: string | null): string {
    if (!text) return "";
    return text.match(/(^|\n)\/schedule (.*)/)?.pop() ?? "";
}

type MergeMethod = "merge" | "squash" | "rebase";

export function isValidMergeMethod(method: string): method is MergeMethod {
    return ["merge", "squash", "rebase"].includes(method);
}

/**
 * @reference https://stackoverflow.com/a/1353711/206879
 */
export function isValidDate(dateString: string): boolean {
    return !isNaN(new Date(dateString).getTime());
}

export function stringifyDate(datestring: string): string {
    const dateTimeString = new Date(datestring).toISOString().split(".")[0];
    const [date, time] = dateTimeString.split("T");
    return `${date} ${time}`;
}
