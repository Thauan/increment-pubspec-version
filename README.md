# Increment Pubspec Version GitHub Action

This GitHub Action increments the version in your `pubspec.yaml` file based on PR labels or commit messages. It supports automatic tagging and pushing changes to the repository.

## Features

- Increment version based on PR labels: `major`, `minor`, `patch`.
- Increment version based on commit messages: detects keywords `major`, `minor`, `patch`.
- Outputs the new version for use in subsequent steps (e.g., creating tags).
- Configurable to enable or disable functionality on commit events.

---

## Inputs

### `enable_on_commit`

- **Description**: Enable functionality for commit events.
- **Required**: No.
- **Default**: `false`.

### `github_token`

- **Description**: GitHub token for authenticating with the repository.
- **Required**: Yes.

### `increment_build`

- **Description**: Defines whether the build number should be incremented
- **Required**: No.
- **Default**: `true`.

---

## Outputs

### `new_version`

- **Description**: The incremented version from `pubspec.yaml`.

---

## Permissions Setup

To allow this Action to push changes or create tags, ensure the appropriate permissions are configured:

1. Add the following permissions block to your workflow file:

   ```yaml
   permissions:
     contents: write
   ```

2. Ensure your repository settings allow workflows to have **Read and Write permissions**:

   - Navigate to **Settings** > **Actions** > **General**.
   - Under **Workflow permissions**, select **Read and write permissions**.
   - Save the changes.

---

## Example Workflow

Here is an example workflow to use this action:

```yaml
name: Increment Version on PR or Commit

on:
  pull_request:
    types:
      - closed
  push:
    branches:
      - main

permissions:
  contents: write

jobs:
  increment-version:
    if: github.event.pull_request.merged == true || github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 16

      - name: Run Increment Pubspec Version
        uses: ./
        with:
          enable_on_commit: "true"
          github_token: "${{ secrets.GITHUB_TOKEN }}"

      - name: Create Tag with New Version
        if: steps.increment_version.outputs.new_version
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git tag v${{ steps.increment_version.outputs.new_version }}
          git push origin v${{ steps.increment_version.outputs.new_version }}
```

---

## Functionality Details

### Pull Request Labels

- The Action checks for specific labels (`major`, `minor`, `patch`) when a PR is merged.
- It increments the version in `pubspec.yaml` accordingly:
  - `major`: Increments the major version (e.g., `1.0.0` -> `2.0.0`).
  - `minor`: Increments the minor version (e.g., `1.0.0` -> `1.1.0`).
  - `patch`: Increments the patch version (e.g., `1.0.0` -> `1.0.1`).

### Commit Messages

- When enabled (`enable_on_commit: true`), the Action parses commit messages for keywords (`major`, `minor`, `patch`).
- It increments the version in `pubspec.yaml` based on the first detected keyword.

### Outputs

- The new version is outputted as `new_version` for use in subsequent steps.
- Example usage:

  ```yaml
  - name: Use New Version
    run: |
      echo "New version is ${{ steps.increment_version.outputs.new_version }}"
  ```

---

## Troubleshooting

### Error: `Permission to <repo>.git denied to github-actions[bot].`

This occurs if the workflow lacks the necessary permissions. Ensure:

1. The workflow includes:

   ```yaml
   permissions:
     contents: write
   ```

2. The repository settings allow workflows to have write access.

### Error: `Cannot find module dist/index.js`

- Ensure the Action is built before use by running:

  ```bash
  npm install
  npm run build
  ```

- Commit the `dist/` directory to your repository.

---

## Development and Testing

To test the Action locally, use the [`act`](https://github.com/nektos/act) tool:

1. Install `act`.
2. Run the workflow locally:

   ```bash
   act -j increment-version
   ```
