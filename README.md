# Hello World Action

This GitHub Action says hello to a specified name.

## Inputs

- `name`: (required) The name to greet. Default: `World`.

## Example Usage

```yaml
name: Increment Version on PR or Commit

on:
  pull_request:
    types:
      - closed
  push:
    branches:
      - main

jobs:
  increment-version:
    if: github.event.pull_request.merged == true || github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 16

      - name: Run Increment Pubspec Version
        uses: actions/increment-pubspec-version
        with:
          enable_on_commit: "true"
          github_token: "${{ secrets.GITHUB_TOKEN }}"
```
