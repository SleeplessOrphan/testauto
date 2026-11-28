import { appStatus } from "@/lib/status";

export default function Home() {
  const status = appStatus();
  return (
    <main>
      <h1>testauto</h1>
      <p data-testid="status">{status}</p>
    </main>
  );
}
