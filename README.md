# chrome-extension-release-heroku

## How To Setup

- Deploy this app to your heroku by [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)
- Set environment values
  - Detail is written on [here](https://github.com/pastak/chrome-extension-release-heroku#require-environment-values)
- Copy `Webhook URL` and set webhook on your repository settings
  - `Payload URL`: Your webhook URL
  - `Content type`: application/JSON
  - Choose **Send me everything.**
- Set your CI config that it pushes extension zip file to `POST YOUR_HEROKU_APP_HOST/release/PR_ISSUE_NUMBER`
  - sample setting is [here](https://github.com/pastak/chrome-extension-release-heroku#ci-sample-settings)

### Usage

- Make Pull Request to your release branch.
- Access to URL (`YOUR_HEROKU_APP_HOST/prepare-release/PR_NUM`) on automate comment on your PR.
- Authorize with Chrome WebStore item's owner account
- Merge your PR.
- (maybe automatic in CI) Post extension zip to `YOUR_HEROKU_APP_HOST/release/PR_ISSUE_NUMBER`

## Require Environment Values

- `ITEM_ID`: Chrome WebStore item id
- `WEBSTORE_CLIENT_ID`: Chrome WebStore OAuth Client Id
- `WEBSTORE_CLIENT_SECRET`: Chrome WebStore OAuth Client Secret
  - Read more about these values: [pastak/chrome-webstore-manager](https://github.com/pastak/chrome-webstore-manager)
- `RELEASE_BRANCH`: Your flow's release branch name
  - Default: `production`
- `GITHUB_TOKEN`: Your GitHub Token
- `SECRET_HURR`: Secret for cookie sign
- `AUTH_TOKEN`: Token for authorization with receive zip

## CI sample settings

- `circle.yml`

```
deployment:
  production:
    branch: production
    commands:
      - build_command # Build extension
      - pack_command # Zip extension directory
      - export PR_NUM=$(echo $CI_PULL_REQUEST | sed -e "s/^\([^:]*\):\(.*\)$/\1/")
      - curl -XPOST -F 'file=@extension.zip' -F "token=$RELEASE_AUTH_TOKEN" YOUR_HEROKU_APP_HOST/release/$PR_NUM
```
