"use client";

import { useState } from "react";

export default function EmbedCodeBlock({
  code,
  agentName,
}: {
  code: string;
  agentName?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  }

  function download() {
    // A ready-to-host snippet: a tiny HTML file with the widget script, so the
    // user can drop it into a page or copy the <script> straight out of it.
    const safeName = (agentName || "zukii-agent")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const file = `<!-- Zukii voice agent — paste this <script> before </body> on your site. -->
${code}
`;
    const blob = new Blob([file], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}-widget.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1800);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-panel/50 px-4 py-2.5">
        <span className="mono-label truncate text-cream-faint">
          Embed · paste before &lt;/body&gt;
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={download}
            className={`mono-label rounded-md px-3 py-1 transition-colors ${
              downloaded
                ? "bg-signal text-ink"
                : "border border-line text-cream-dim hover:text-cream"
            }`}
          >
            {downloaded ? "Saved ✓" : "Download"}
          </button>
          <button
            onClick={copy}
            className={`mono-label rounded-md px-3 py-1 transition-colors ${
              copied
                ? "bg-signal text-ink"
                : "border border-line text-cream-dim hover:text-cream"
            }`}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto p-4">
        <code className="font-mono text-sm leading-relaxed text-cream-dim">
          {code}
        </code>
      </pre>
    </div>
  );
}
