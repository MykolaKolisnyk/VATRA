export async function redisDeadline<T>(
  task: () => Promise<T>, retire: () => void, limit = 900,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(task),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("Redis deadline exceeded"));
          try { retire(); } catch (_) {}
        }, limit);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
