"use client";
import { config, configProblems, configured } from "@/lib/config";

/** Says which setting is wrong instead of quietly reading somebody else's contract. */
export function Notice() {
  if (configured) return null;
  return (
    <div className="wrap mt-3">
      <div className="notice">
        <strong>Setup needed.</strong> The console is not pointed at a Standing contract yet, so reads and buttons are paused.
        <ul className="mt-2 list-disc pl-5">
          {configProblems.map((p) => (
            <li key={p.name}>
              <code className="mono">{p.name}</code> is {p.found}; it should be {p.wanted}.
            </li>
          ))}
        </ul>
        <p className="mt-2 muted">Network: Studio Next, chain {config.chainId}. In Vercel: Project, Settings, Environment Variables, then redeploy.</p>
      </div>
    </div>
  );
}
