const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const createRateLimiter = (minIntervalMs: number) => {
  let chain: Promise<void> = Promise.resolve();
  let lastTime = 0;

  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (minIntervalMs <= 0) {
      return task();
    }

    const next = chain.then(async () => {
      const elapsed = Date.now() - lastTime;
      const waitMs = Math.max(0, minIntervalMs - elapsed);
      if (waitMs > 0) {
        await sleep(waitMs);
      }
      const result = await task();
      lastTime = Date.now();
      return result;
    });

    chain = next.then(() => undefined);
    return next;
  };
};
