import { jest } from "@jest/globals";
import { getInput, setFailed, setOutput, warning } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { run, incrementVersion, getIncrementTypeFromCommits } from "./index";
import * as fs from "fs";
import * as yaml from "yaml";

jest.mock("@actions/core", () => ({
  getInput: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
  warning: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock("@actions/github", () => ({
  context: {
    payload: {
      pull_request: undefined,
    },
    repo: {
      owner: "owner",
      repo: "repo",
    },
  },
  getOctokit: jest.fn(),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));

jest.mock("child_process");

describe("Increment Pubspec Version Action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should fail if it's not a Pull Request event", async () => {
    context.eventName = "pull_request";
    context.payload.pull_request = undefined;

    await run();

    expect(setFailed).toHaveBeenCalledWith("This event is not a Pull Request.");
  });

  it("should increment the version to patch when the 'patch' label is present in the PR", async () => {
    (getInput as jest.Mock) = jest.fn().mockImplementation((input) => {
      if (input === "increment_build") return "true";
      return undefined;
    });

    context.eventName = "pull_request";
    context.payload.pull_request = {
      number: 1,
      labels: [{ name: "patch" }],
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      yaml.stringify({ version: "1.0.0+1" })
    );

    await run();

    expect(getInput).toHaveBeenCalledWith("increment_build");
    expect(setOutput).toHaveBeenCalledWith("new_version", "1.0.1+2");
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "./pubspec.yaml",
      expect.stringContaining("version: 1.0.1+2"),
      "utf8"
    );
  });

  it("should increment the version to patch when the 'minor' label is present in the PR", async () => {
    (getInput as jest.Mock) = jest.fn().mockImplementation((input) => {
      if (input === "increment_build") return "true";
      return undefined;
    });

    context.eventName = "pull_request";
    context.payload.pull_request = {
      number: 1,
      labels: [{ name: "minor" }],
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      yaml.stringify({ version: "1.0.0+20" })
    );

    await run();

    expect(setOutput).toHaveBeenCalledWith("new_version", "1.1.0+21");
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "./pubspec.yaml",
      expect.stringContaining("version: 1.1.0+21"),
      "utf8"
    );
  });

  it("should increment the version to patch when the 'major' label is present in the PR", async () => {
    (getInput as jest.Mock) = jest.fn().mockImplementation((input) => {
      if (input === "increment_build") return "true";
      return undefined;
    });

    context.eventName = "pull_request";
    context.payload.pull_request = {
      number: 1,
      labels: [{ name: "major" }],
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      yaml.stringify({ version: "1.0.0+2" })
    );

    await run();

    expect(setOutput).toHaveBeenCalledWith("new_version", "2.0.0+3");
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "./pubspec.yaml",
      expect.stringContaining("version: 2.0.0+3"),
      "utf8"
    );
  });

  it("should increment the version to patch when the 'major' label is present in the PR", async () => {
    context.eventName = "pull_request";
    context.payload.pull_request = {
      number: 1,
      labels: [{ name: "major" }],
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      yaml.stringify({ version: "1.0.0+2" })
    );

    await run();

    expect(setOutput).toHaveBeenCalledWith("new_version", "2.0.0+2");
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "./pubspec.yaml",
      expect.stringContaining("version: 2.0.0+2"),
      "utf8"
    );
  });

  it("should increment the version to patch when the 'major' when not contain build number, but increment_build is true", async () => {
    (getInput as jest.Mock) = jest.fn().mockImplementation((input) => {
      if (input === "increment_build") return "true";
      return undefined;
    });

    context.eventName = "pull_request";
    context.payload.pull_request = {
      number: 1,
      labels: [{ name: "major" }],
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      yaml.stringify({ version: "1.0.0" })
    );

    await run();

    expect(setOutput).toHaveBeenCalledWith("new_version", "2.0.0+1");
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "./pubspec.yaml",
      expect.stringContaining("version: 2.0.0+1"),
      "utf8"
    );
  });

  it("should increment the version to patch when the 'major' when increment_build is false", async () => {
    context.eventName = "pull_request";
    context.payload.pull_request = {
      number: 1,
      labels: [{ name: "major" }],
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      yaml.stringify({ version: "1.0.0" })
    );

    await run();

    expect(setOutput).toHaveBeenCalledWith("new_version", "2.0.0");
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "./pubspec.yaml",
      expect.stringContaining("version: 2.0.0"),
      "utf8"
    );
  });

  it("should add label to the pull request", async () => {
    (getInput as jest.Mock).mockReturnValueOnce("gh-token-value");
    (getInput as jest.Mock).mockReturnValueOnce("label-value");
    (context as any).payload.pull_request = {
      number: 1,
    };

    await run();

    expect(getInput).toHaveBeenCalledWith("enable_on_commit");
    expect(getOctokit).not.toHaveBeenCalled();
    expect(setFailed).not.toHaveBeenCalled();
  });

  it("should fail if the pubspec.yaml file doesn't contain a version", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(yaml.stringify({}));

    await incrementVersion(["patch"]);

    expect(setFailed).toHaveBeenCalledWith(
      "Current version not found in pubspec.yaml."
    );
  });

  it("Should warn if there are no valid labels in the PR", async () => {
    context.eventName = "pull_request";
    context.payload.pull_request = {
      number: 1,
      labels: [{ name: "invalid-label" }],
    };

    await run();

    expect(warning).toHaveBeenCalledWith(
      "No valid labels found. No action will be taken."
    );
  });

  it("Should return no increment if there are no keywords in the commits", async () => {
    context.eventName = "push";
    context.payload.commits = [{ message: "fix: atualiza documentação" }];

    const incrementType = await getIncrementTypeFromCommits();

    expect(incrementType).toBeNull();
  });

  it("Deve falhar se o arquivo pubspec.yaml não existir", async () => {
    context.eventName = "pull_request";
    context.payload.pull_request = {
      number: 2,
      labels: [{ name: "patch" }],
    };

    (fs.existsSync as jest.Mock).mockReturnValue(false);

    await run();

    expect(setFailed).toHaveBeenCalledWith("File ./pubspec.yaml not found.");
  });
});
