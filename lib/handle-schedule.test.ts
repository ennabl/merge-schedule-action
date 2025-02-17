import mockDate from "mockdate";
import timezoneMock from "timezone-mock";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { mockProcessStdout } from "vitest-mock-process";
import handleSchedule from "./handle-schedule";
import * as comment from "./comment";

timezoneMock.register("UTC");
mockDate.set("2022-06-10T00:00:00.000Z");

beforeEach(() => {
  process.env.INPUT_MERGE_METHOD = "merge";
  process.env.INPUT_TIME_ZONE = "UTC";
});

describe("handleSchedule", () => {
  test("invalid merge method", async () => {
    const mockStdout = mockProcessStdout();
    process.env.INPUT_MERGE_METHOD = "bad-method";

    await handleSchedule();

    expect(mockStdout.mock.calls).toEqual([
      [`::error::merge_method "bad-method" is invalid\n`],
    ]);
  });

  test("due pull requests", async () => {
    const mockStdout = mockProcessStdout();
    const createComment = vi.spyOn(comment, "createComment");
    const updateComment = vi.spyOn(comment, "updateComment");

    await handleSchedule();

    expect(mockStdout.mock.calls).toEqual([
      [`GITHUB_TOKEN: some-token-here\n`],
      [`Loading open pull requests\n`],
      [`13 scheduled pull requests found\n`],
      [`6 due pull requests found\n`],
      [`https://github.com/ennabl/merge-schedule-action/pull/2 merged\n`],
      [
        `Comment created: https://github.com/ennabl/merge-schedule-action/issues/2#issuecomment-22\n`,
      ],
      [`https://github.com/ennabl/merge-schedule-action/pull/3 merged\n`],
      [
        `Comment updated: https://github.com/ennabl/merge-schedule-action/issues/3#issuecomment-31\n`,
      ],
      [
        `Comment created: https://github.com/ennabl/merge-schedule-action/issues/13#issuecomment-132\n`,
      ],
      [`Label added: "automerge-fail"\n`],
      [
        `Comment updated: https://github.com/ennabl/merge-schedule-action/issues/6#issuecomment-61\n`,
      ],
      [`Label added: "automerge-fail"\n`],
      [`https://github.com/ennabl/merge-schedule-action/pull/14 merged\n`],
      [
        `Comment created: https://github.com/ennabl/merge-schedule-action/issues/14#issuecomment-142\n`,
      ],
      [`https://github.com/ennabl/merge-schedule-action/pull/21 merged\n`],
      [
        `Comment created: https://github.com/ennabl/merge-schedule-action/issues/21#issuecomment-212\n`,
      ],
    ]);
    expect(createComment.mock.calls).toHaveLength(4);
    expect(createComment.mock.calls[0][2]).toMatchInlineSnapshot(`
      ":white_check_mark: **Merge Schedule**
      Scheduled on June 8th 2022, 00:00:00 (UTC) successfully merged
      <!-- Merge Schedule Pull Request Comment -->"
    `);
    expect(createComment.mock.calls[1][2]).toMatchInlineSnapshot(`
      ":x: **Merge Schedule**
      Scheduled merge failed: Pull Request is not mergeable
      In order to let the automerge-automation try again, the label \\"automerge-fail\\" should be removed.
      <!-- Merge Schedule Pull Request Comment Fail -->"
    `);
    expect(createComment.mock.calls[2][2]).toMatchInlineSnapshot(`
      ":white_check_mark: **Merge Schedule**
      Scheduled on June 9th 2022, 00:00:00 (UTC) successfully merged
      <!-- Merge Schedule Pull Request Comment -->"
    `);
    expect(updateComment.mock.calls).toHaveLength(2);
    expect(updateComment.mock.calls[0][2]).toMatchInlineSnapshot(`
      ":white_check_mark: **Merge Schedule**
      Scheduled on June 9th 2022, 00:00:00 (UTC) successfully merged
      <!-- Merge Schedule Pull Request Comment -->"
    `);
    expect(updateComment.mock.calls[1][2]).toMatchInlineSnapshot(`
      ":x: **Merge Schedule**
      Scheduled merge failed: Pull Request is not mergeable
      In order to let the automerge-automation try again, the label \\"automerge-fail\\" should be removed.
      <!-- Merge Schedule Pull Request Comment Fail -->"
    `);
  });

  test("due pull requests with require_statuses_success = true", async () => {
    const mockStdout = mockProcessStdout();
    process.env.INPUT_REQUIRE_STATUSES_SUCCESS = "true";
    const createComment = vi.spyOn(comment, "createComment");
    const updateComment = vi.spyOn(comment, "updateComment");

    await handleSchedule();

    expect(mockStdout.mock.calls).toEqual([
      [`GITHUB_TOKEN: some-token-here\n`],
      [`Loading open pull requests\n`],
      [`13 scheduled pull requests found\n`],
      [`6 due pull requests found\n`],
      [`https://github.com/ennabl/merge-schedule-action/pull/2 merged\n`],
      [
        `Comment created: https://github.com/ennabl/merge-schedule-action/issues/2#issuecomment-22\n`,
      ],
      [
        `https://github.com/ennabl/merge-schedule-action/pull/3 is not ready to be merged yet because all checks are not completed or statuses are not success\n`,
      ],
      [
        `Comment created: https://github.com/ennabl/merge-schedule-action/issues/13#issuecomment-132\n`,
      ],
      [`Label added: "automerge-fail"\n`],
      [
        `Comment updated: https://github.com/ennabl/merge-schedule-action/issues/6#issuecomment-61\n`,
      ],
      [`Label added: "automerge-fail"\n`],
      [`https://github.com/ennabl/merge-schedule-action/pull/14 merged\n`],
      [
        `Comment created: https://github.com/ennabl/merge-schedule-action/issues/14#issuecomment-142\n`,
      ],
      [`https://github.com/ennabl/merge-schedule-action/pull/21 merged\n`],
      [
        `Comment created: https://github.com/ennabl/merge-schedule-action/issues/21#issuecomment-212\n`,
      ],
    ]);
    expect(createComment.mock.calls).toHaveLength(4);
    expect(createComment.mock.calls[0][2]).toMatchInlineSnapshot(`
      ":white_check_mark: **Merge Schedule**
      Scheduled on June 8th 2022, 00:00:00 (UTC) successfully merged
      <!-- Merge Schedule Pull Request Comment -->"
    `);
    expect(createComment.mock.calls[1][2]).toMatchInlineSnapshot(`
      ":x: **Merge Schedule**
      Scheduled merge failed: Pull Request is not mergeable
      In order to let the automerge-automation try again, the label \\"automerge-fail\\" should be removed.
      <!-- Merge Schedule Pull Request Comment Fail -->"
    `);
    expect(createComment.mock.calls[2][2]).toMatchInlineSnapshot(`
      ":white_check_mark: **Merge Schedule**
      Scheduled on June 9th 2022, 00:00:00 (UTC) successfully merged
      <!-- Merge Schedule Pull Request Comment -->"
    `);
    expect(updateComment.mock.calls).toHaveLength(1);
    expect(updateComment.mock.calls[0][2]).toMatchInlineSnapshot(`
      ":x: **Merge Schedule**
      Scheduled merge failed: Pull Request is not mergeable
      In order to let the automerge-automation try again, the label \\"automerge-fail\\" should be removed.
      <!-- Merge Schedule Pull Request Comment Fail -->"
    `);
  });
});
