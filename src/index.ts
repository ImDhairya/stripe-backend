import "./lib/tracing";
import env from "./lib/env";
import App from "./app";
import {startWorkers} from "./worker";
import {seedDemoData} from "./lib/seed-demo";

const app = new App();
app.listen();

if (env.RUN_WORKERS_IN_PROCESS) {
  startWorkers();
}

// Seed permanent demo accounts and rich sample data on startup
seedDemoData().catch((err) => {
  console.error("Error executing initial seedDemoData:", err);
});
