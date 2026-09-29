#!/usr/bin/env node
/**
 * Deploys the site from a developer machine; never from CI.
 *
 *   AWS_PROFILE=nightshift npm run deploy
 *
 * Refuses to start unless the profile resolves to the account the Nightshift
 * zone lives in, then builds and deploys both stacks.
 */
import { execFileSync } from "node:child_process";

const ACCOUNT = "755348349819";
const run = (command, args) =>
  execFileSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
const identity = JSON.parse(
  execFileSync("aws", ["sts", "get-caller-identity", "--output", "json"], { encoding: "utf8" }),
);
if (identity.Account !== ACCOUNT) {
  console.error(`refusing to deploy: this profile is account ${identity.Account}, not ${ACCOUNT}`);
  process.exit(1);
}
console.log(`Deploying as ${identity.Arn}.`);
run("npm", ["run", "build"]);
run("npx", ["cdk", "deploy", "--all", ...process.argv.slice(2)]);
