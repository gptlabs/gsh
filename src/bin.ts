#!/usr/bin/env node
/* eslint-disable no-console */
import { clear, error, log, style } from "@tsmodule/log";
import { AUTH0_CLIENT } from "./globs/node";
import { createInterface } from "readline";
import { stdin, stdout } from "process";
import { DOMAIN_URL, PLATFORM, VERSION } from "./globs/shared";
import { appendToTranscript, getTranscript } from "./utils/filesystem";
import { readFile } from "fs/promises";

const authorized = await AUTH0_CLIENT.isAuthorized();
if (!authorized) {
  error("You are not logged in.", [], { postLines: 1 });

  log("Use UPG to log in using `upg login`:", ["dim"]);
  log("https://gptlabs.us/upg", ["underline"]);

  process.exit(1);
}

const rl = createInterface({
  input: stdin,
  output: stdout,
});

rl.on("SIGINT", () => {
  process.exit(1);
});

clear({ flush: true });

const logoPath = new URL("./header.txt", import.meta.url);
const logoFile = await readFile(logoPath, "utf8");
const logoText = logoFile.replace("(A version number goes here)", VERSION);

console.log(style(logoText, ["dim"]));

while (true) {
  const transcript = await getTranscript();
  const command = await new Promise<string>((resolve) => {
    rl.question(` ${style("$", ["bold", "dim"])} `, resolve);
  });
  // console.log({ transcript });
  console.log();
  // console.log(style(command, ["dim"]));

  const { native } = await AUTH0_CLIENT.fetch(
    `${DOMAIN_URL}/api/gsh/shell`,
    {
      method: "POST",
      body: new URLSearchParams({
        command,
        platform: PLATFORM,
        transcript,
      })
    }
  ).then((res) => res.json()) as any;

  const replacedLinePrefixes = native.trim().split("\n").map(
    (line: string) => line.replace(/^\$ /, "")
  ).join("\n");

  console.log(style(replacedLinePrefixes, ["dim"]));
  console.log();

  await appendToTranscript(command, native);
}
