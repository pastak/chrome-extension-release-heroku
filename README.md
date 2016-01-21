# chrome-extension-release-heroku

## How To Setup

- Deploy this app to your heroku by [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)
- Set environment values
  - Detail is written on [here](https://github.com/pastak/chrome-extension-release-heroku#require-environment-values)
- Accress to `YOUR_HEROKU_APP_HOST/initialize` and login with your item's owner account to authorize.
- Set your CI config that it pushes extension zip file to `POST YOUR_HEROKU_APP_HOST/release`
  - sample setting is [here](https://github.com/pastak/chrome-extension-release-heroku#ci-sample-settings)

## Require Environment Values

- `ITEM_ID`: Chrome WebStore item id
- `WEBSTORE_CLIENT_ID`: Chrome WebStore OAuth Client Id
- `WEBSTORE_CLIENT_SECRET`: Chrome WebStore OAuth Client Secret
  - Read more about these values: [pastak/chrome-webstore-manager](https://github.com/pastak/chrome-webstore-manager)
  - **Don't forget** add `YOUR_HEROKU_APP_HOST/callback` to Redirect URL
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
      - curl -XPOST -F 'file=@extension.zip' -F "token=$RELEASE_AUTH_TOKEN" YOUR_HEROKU_APP_HOST/release
```
