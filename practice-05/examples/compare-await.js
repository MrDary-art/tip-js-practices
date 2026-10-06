import { createApiServer } from "../api/server.mjs";
import { createApiClient } from "../src/api-client.js";

const server = createApiServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const client = createApiClient({ baseUrl: `http://127.0.0.1:${port}/api` });

async function delay() {
  return client.requestJson("/debug/delay", { query: { ms: 150 } });
}

try {
  for (let run = 1; run <= 3; run += 1) {
    let started = performance.now();
    await delay();
    await delay();
    const sequential = Math.round(performance.now() - started);

    started = performance.now();
    await Promise.all([delay(), delay()]);
    const parallel = Math.round(performance.now() - started);
    console.log(`Запуск ${run}: последовательно ${sequential} мс; Promise.all ${parallel} мс`);
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}
