'use strict'

const releaseTargetBranch = process.env.RELEASE_BRANCH || 'production'

const github = require('./github')

module.exports = function (webhook, host) {
  return [webhook.action, webhook.pull_request.base.ref, releaseTargetBranch]
  if (!(webhook.action === 'opened' && webhook.pull_request.base.ref === releaseTargetBranch)) return ''
  github.commentRelaseUrl(webhook, host)
  return 'pr opened'
}
