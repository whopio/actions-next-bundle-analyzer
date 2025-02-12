# actions-next-bundle-analyzer

GitHub action that analyses the bundle sizes for each route in a Next.js build.

## Usage

Add the following step to a workflow which runs on a [pull_request](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#pull_request) event, after the Next.js project has been built (i.e. after running `pnpm run build`).

```yml
- name: Analyze bundle sizes
  uses: transferwise/actions-next-bundle-analyzer@v2
  with:
    # Optional, specifies where to look for .next folder. Defaults to cwd.
    working-directory: ./apps/my-next-app
    # Optional, configures commenting strategy around insignificant changes, defaults to `always`.
    # Available options:
    #   always: Always comment on PRs, even if it's just to say there are no significant changes.
    #   skip-insignificant: Skip commenting on PRs if there are no signficant changes in page sizes.
    comment-strategy: 'always'
    # Optional, configures whether to create the bundle size summary issue, defaults to `true`.
    # Available options:
    #   true
    #   false
    create-issue: true
    # Optional, defaults to `github.token`.
    github-token: ${{ github.token }}
```

### On a Pull Request

When the job runs on a pull request a comment will be added showing the bundle sizes of the branch and the difference against the default branch:

![image](https://user-images.githubusercontent.com/614392/123790589-69872e80-d8d6-11eb-9dec-0686e0bba760.png)

_Note: Difference to the default branch will only be shown once this action has run on a default branch commit._

### On the default branch

When the workflow runs on the default branch, it will create/update a GitHub Issue with the current bundle sizes.

![image](https://user-images.githubusercontent.com/52004409/156007377-3e6bbb4c-f721-4b42-a363-4559b2ea55df.png)

## Contributing

Compiled files must also be commited. After making changes to TypeScript files run

```
pnpm run build
```

Add both the source files and the new compiled files to your pull request.
