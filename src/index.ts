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
        core.setFailed("Este evento não é um Pull Request.");
        return;
      }

      const labels = pr.labels.map((label: any) => label.name);
      newVersion = (await incrementVersion(labels)) || "";
    } else if (eventName === "push" && enableOnCommit) {
      const incrementType = await getIncrementTypeFromCommits();
      if (incrementType) {
        newVersion = (await incrementVersion([incrementType])) || "";
      } else {
        core.info(
          "Nenhuma palavra-chave encontrada nos commits. Nenhuma ação será tomada."
        );
      }
    } else {
      core.info("Nenhuma ação realizada. Evento não configurado.");
    }

    core.info(`New version: ${newVersion}`);

    // Definir a versão como output
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
    core.info("Nenhum commit encontrado no payload do push.");
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
    core.warning("Nenhuma label válida encontrada. Nenhuma ação será tomada.");
    return;
  }

  const pubspecPath = "./pubspec.yaml";

  if (!fs.existsSync(pubspecPath)) {
    core.setFailed(`Arquivo ${pubspecPath} não encontrado.`);
    return;
  }

  const pubspecContent = fs.readFileSync(pubspecPath, "utf8");
  const pubspec = yaml.parse(pubspecContent);

  const currentVersion = pubspec.version;
  if (!currentVersion) {
    core.setFailed("A versão atual não foi encontrada no pubspec.yaml.");
    return;
  }

  const [major, minor, patch] = currentVersion.split(".").map(Number);
  let newVersion: string;

  if (incrementType === "major") {
    newVersion = `${major + 1}.0.0`;
  } else if (incrementType === "minor") {
    newVersion = `${major}.${minor + 1}.0`;
  } else {
    newVersion = `${major}.${minor}.${patch + 1}`;
  }

  pubspec.version = newVersion;

  fs.writeFileSync(pubspecPath, yaml.stringify(pubspec), "utf8");
  console.log(`Versão atualizada para ${newVersion}`);

  await execCommand('git config --global user.name "github-actions[bot]"');
  await execCommand(
    'git config --global user.email "github-actions[bot]@users.noreply.github.com"'
  );
  await execCommand(`git add ${pubspecPath}`);
  await execCommand(
    `git commit -m "chore: incrementa versão para ${newVersion}"`
  );

  try {
    await execCommand(`git push`);
  } catch (error) {
    core.warning(`Falha ao fazer push: ${error}`);
    return newVersion;
  }

  return newVersion;
}

function execCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Erro: ${stderr || error.message}`);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

run();
