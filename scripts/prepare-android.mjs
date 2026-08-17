import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const generatedUnusedResources = [
  resolve("android/app/src/main/res/xml/config.xml"),
];

await Promise.all(
  generatedUnusedResources.map((resource) => rm(resource, { force: true })),
);
