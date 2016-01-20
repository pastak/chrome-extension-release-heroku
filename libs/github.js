'use strict'

const GitHubApi = require("github")

const githubToken = process.env.GITHUB_TOKEN

const github = new GitHubApi({
  version: '3.0.0'
})

module.exports = {
  commentRelaseUrl: function (webhook, host) {
    github.authenticate({
        type: 'oauth',
        token: githubToken
    })
    const repoPath = webhook.repository.full_name.split('/')
    github.issue.createComment({
      headers: {
        'User-Agent': 'pastak/chrome-extension-release-heroku'
      },
      user: repoPath[0],
      repo: repoPath[1],
      number: webhook.number,
      body: `Release :rocket: ${host}/prepare-release/${webhook.number} \n Please auth with owner account of this item`
    })
  }
}
