import mockDate from "mockdate";
import timezoneMock from "timezone-mock";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import {
  cleanupWebhooksFolder,
  generatePullRequestWebhook,
  setupWebhooksFolder,
} from "../test/utils";
import { mockProcessStdout } from "vitest-mock-process";
import * as comment from "./comment";
import handlePullRequest from "./handle-pull-request";

timezoneMock.register("UTC");
mockDate.set("2022-06-10T00:00:00.000Z");

describe("handlePullRequestComment", () => {
  beforeAll(() => {
    setupWebhooksFolder("pull-request-comment");
  });

  afterAll(() => {
    cleanupWebhooksFolder("pull-request-comment");
  });

  test("schedule merge", async () => {
    const mockStdout = mockProcessStdout();
    const createComment = vi.spyOn(comment, "createComment");
    process.env.GITHUB_EVENT_PATH = generatePullRequestWebhook({ number: 19 });

    await handlePullRequest();

    expect(mockStdout.mock.calls).toEqual([
      [
        "Handling pull request opened for https://github.com/ennabl/merge-schedule-action/pull/19\n",
      ],
      [`Schedule command found in pull request body: "2022-06-12"\n`],
      [
        `Comment created: https://github.com/ennabl/merge-schedule-action/issues/19#issuecomment-192\n`,
      ],
    ]);
    expect(createComment.mock.calls).toHaveLength(1);
    expect(createComment.mock.calls[0][2]).toMatchInlineSnapshot(`
      ":hourglass: **Merge Schedule**
      Scheduled to be merged on June 12th 2022, 00:00:00 (UTC)
      <!-- Merge Schedule Pull Request Comment -->"
    `);
  });

  test("schedule merge priority to the last comment", async () => {
    const mockStdout = mockProcessStdout();
    const createComment = vi.spyOn(comment, "createComment");
    process.env.GITHUB_EVENT_PATH = generatePullRequestWebhook({ number: 20 });

    await handlePullRequest();

    expect(mockStdout.mock.calls).toEqual([
      [
        "Handling pull request opened for https://github.com/ennabl/merge-schedule-action/pull/20\n",
      ],
      [`Schedule command found in pull request body: "2022-06-14"\n`],
      [
        `Comment created: https://github.com/ennabl/merge-schedule-action/issues/20#issuecomment-202\n`,
      ],
    ]);
    expect(createComment.mock.calls).toHaveLength(1);
    expect(createComment.mock.calls[0][2]).toMatchInlineSnapshot(`
      ":hourglass: **Merge Schedule**
      Scheduled to be merged on June 14th 2022, 00:00:00 (UTC)
      <!-- Merge Schedule Pull Request Comment -->"
    `);
  });
});
