// Deals tests to `--shard`s round-robin instead of Playwright's contiguous slices. The slow
// per-Lesson design walks sit next to each other in design.spec.ts, so contiguous slices put
// most of the suite's time in one shard; dealing one test at a time spreads them evenly.
import type { FullConfig, Reporter, Suite, TestRun } from "@playwright/test/reporter";

export default class RoundRobinShards implements Reporter {
  async preprocess({ config, suite, testRun }: { config: FullConfig; suite: Suite; testRun: TestRun }) {
    if (!config.shard) return;
    const { current, total } = config.shard;
    testRun.skipSharding();
    suite.allTests().forEach((test, i) => {
      if (i % total !== current - 1) testRun.exclude(test);
    });
  }

  printsToStdio() {
    return false;
  }
}
