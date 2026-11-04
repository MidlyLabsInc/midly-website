// Fails if any page loads an analytics or advertising tag outside the consent
// loader. js/consent.js is the only place these tags may load, and only after
// the visitor allows them (California, other US state laws, GDPR and ePrivacy).
// A page that pasted a tag snippet back in would track visitors before they
// choose. Run: node scripts/check-consent-tags.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const TAG = /googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|fbq\(|clarity\.ms|gtag\(\s*['"]config/i;
const SKIP = new Set([".git", "node_modules", "logo design", "social media kit", "docs"]);

function pages(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? pages(path) : name.endsWith(".html") ? [path] : [];
  });
}

const problems = [];
for (const file of pages(".")) {
  const html = readFileSync(file, "utf8");
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of scripts) {
    const open = m[0].slice(0, m[0].indexOf(">") + 1);
    if (TAG.test(open) || TAG.test(m[1])) problems.push(`${file}: ${open.slice(0, 120)}`);
  }
  if (TAG.test(html.replace(/<script\b[\s\S]*?<\/script>/gi, ""))) {
    problems.push(`${file}: a tracking URL outside any script`);
  }
  if (!/<script src="\/js\/consent\.js"><\/script>/.test(html) && /<footer/.test(html)) {
    problems.push(`${file}: does not load /js/consent.js`);
  }
}
if (problems.length) {
  console.error("Tags loading outside the consent loader:\n" + problems.join("\n"));
  process.exit(1);
}
console.log("consent tags: ok");
