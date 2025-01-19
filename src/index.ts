import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import * as yaml from "yaml";
import { exec } from "child_process";

async function run() {
  try {
    const enableOnCommit = core.getInput("enable_on_commit") === "true";
    const { context } = github;
    const eventName = context.eventName;
    let newVersion = "";

    if (eventName === "pull_request") {
      const pr = context.payload.pull_request;
      if (!pr) {
        core.setFailed("This event is not a Pull Request.");
        return;
      }

      const labels = pr?.labels?.map((label: any) => label.name) || [];
      newVersion = await incrementVersion(labels);
    } else if (eventName === "push" && enableOnCommit) {
      const incrementType = await getIncrementTypeFromCommits();
      if (incrementType) {
        newVersion = (await incrementVersion([incrementType])) || "";
      } else {
        core.info("No keywords found in commits. No action will be taken.");
      }
    } else {
      core.info("No action taken. Event not configured.");
    }

    core.info(`New version: ${newVersion}`);

    core.setOutput("new_version", newVersion);
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

async function getIncrementTypeFromCommits(): Promise<string | null> {
  const { context } = github;
  const token = core.getInput("github_token", { required: true });
  const octokit = github.getOctokit(token);

  const commits = context.payload.commits || [];
  if (commits.length === 0) {
    core.info("No commit found in push payload.");
    return null;
  }

  for (const commit of commits) {
    const message = commit.message.toLowerCase();
    if (message.includes("major")) {
      return "major";
    } else if (message.includes("minor")) {
      return "minor";
    } else if (message.includes("patch")) {
      return "patch";
    }
  }

  core.info("Nothing found in the push payload.");
  return null;
}

async function incrementVersion(labels: string[]) {
  let incrementType: string | undefined;

  if (labels.includes("major")) {
    incrementType = "major";
  } else if (labels.includes("minor")) {
    incrementType = "minor";
  } else if (labels.includes("patch")) {
    incrementType = "patch";
  } else {
    core.warning("No valid labels found. No action will be taken.");
    return;
  }

  const pubspecPath = "./pubspec.yaml";

  if (!fs.existsSync(pubspecPath)) {
    core.setFailed(`File ${pubspecPath} not found.`);
    return;
  }

  const pubspecContent = fs.readFileSync(pubspecPath, "utf8");
  const pubspec = yaml.parse(pubspecContent);

  const currentVersion = pubspec.version;
  if (!currentVersion) {
    core.setFailed("Current version not found in pubspec.yaml.");
    return;
  }

  const [versionPart, buildNumberPart] = currentVersion.split("+");
  const [major, minor, patch] = versionPart.split(".")?.map(Number);
  const buildNumber = buildNumberPart ? parseInt(buildNumberPart, 10) : 0;

  let newVersion: string;
  let newBuildNumber = buildNumber;

  if (!incrementType) {
    core.info("No increment performed. No valid label was provided.");
    return currentVersion;
  }

  if (incrementType === "major") {
    newVersion = `${major + 1}.0.0`;
  } else if (incrementType === "minor") {
    newVersion = `${major}.${minor + 1}.0`;
  } else {
    newVersion = `${major}.${minor}.${patch + 1}`;
  }

  const incrementBuild = core.getInput("increment_build") === "true";
  if (incrementBuild) {
    newBuildNumber += 1;
  }

  pubspec.version =
    newBuildNumber > 0 ? `${newVersion}+${newBuildNumber}` : newVersion;

  fs.writeFileSync(pubspecPath, yaml.stringify(pubspec), "utf8");
  core.info(`Updated version for ${pubspec.version}`);

  if (process.env.GITHUB_ACTIONS === "true" || process.env.CI === "true") {
    await execCommand('git config --global user.name "github-actions[bot]"');
    await execCommand(
      'git config --global user.email "github-actions[bot]@users.noreply.github.com"'
    );
    await execCommand(`git add ${pubspecPath}`);
    await execCommand(
      `git commit -m "chore: increment version to ${pubspec.version}"`
    );

    try {
      await execCommand(`git push`);
    } catch (error) {
      core.warning(`Failed to push: ${error}`);
      return pubspec.version;
    }
  } else {
    core.info(
      "We are not in the CI or GitHub Actions environment, the push will not be performed."
    );
  }

  return pubspec.version;
}

function execCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${stderr || error.message}`);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

if (require.main === module) {
  run();
}

export { run, getIncrementTypeFromCommits, incrementVersion, execCommand };
