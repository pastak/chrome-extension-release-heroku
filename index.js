'use strict'
const fs = require('fs')
const path = require('path')
const app = require('koa')()
app.keys = [process.env.SECRET_HURR]
const router = require('koa-router')()
const koaBody = require('koa-body')
const session = require('koa-session')
const redis = require('redis').createClient(process.env.REDIS_URL || 6379)
const ChromeWebstoreManager = require('chrome-webstore-manager')
const itemId = process.env.ITEM_ID
const clientId = process.env.WEBSTORE_CLIENT_ID
const clientSecret = process.env.WEBSTORE_CLIENT_SECRET
const webhook = require('./libs/webhook')

const chromeWebstoreManager = new ChromeWebstoreManager(clientId, clientSecret)

router.get('/', function *(next) {
  this.type = 'text/html'
  this.body = `This app is receive webhook from github to release chrome webstore<br />
  <a href='https://chrome.google.com/webstore/detail/${itemId}'>This item's webstore page</a>.
  <br />
  <br />
  Webhook URL<input readonly='readonly' type='text' style='width: 800px' value='${this.request.origin}/webhook' onClick='this.select()'/>
  `
})

// Receive Webhook from GitHub
router.post('/webhook', koaBody(), function *(next) {
  if (this.headers['x-github-event'] !== 'pull_request') return this.body = ''
  const reqJSON = this.request.body
  this.body = webhook(reqJSON, this.request.origin)
})

router.get('/prepare-release/:issueNumber', function *(next) {
  const callbackUrl = `${this.request.origin}/callback`
  this.session.number = this.params.issueNumber
  this.response.redirect(chromeWebstoreManager.getCodeUrl(callbackUrl))
})

router.get('/callback', function *(next) {
  const query = {}
  this.request.querystring.split('&').forEach((q) => {
    const tmp = q.split('=')
    query[tmp[0]] = tmp[1]
  })
  const callbackUrl = `${this.request.origin}/callback`
  this.body = yield chromeWebstoreManager.getAccessToken(query['code'], callbackUrl).then((data) => {
    data = JSON.parse(data)
    redis.set(`token_${this.session.number}`, data.access_token, () => {})
    return 'Success to prepare your release. This item will be released as soon as merged.TOKEN is '+ data.access_token
  })
})

// Receive Zip from CI
router.post('/release/:issueNumber', koaBody({multipart:true}), function *(next) {
  const koa = this
  const extZipBinData = fs.readFileSync(this.request.body.files.file.path)
  this.body = yield new Promise((resolve) => {
    redis.get(`token_${this.params.issueNumber}`, function (err, value) {
      if (err) {
        koa.response.status = 500
        return resolve({message: 'error on get value from redis', error: err})
      }
      chromeWebstoreManager.updateItem(value, extZipBinData, itemId)
      .then((data) => {
        chromeWebstoreManager.publishItem(value, itemId).then(() => {
          resolve({message: 'success'})
        }).catch((err) => {
          koa.response.status = 500
          resolve({message: 'failed to upload', error: err})
        })
      }).catch((err) => {
        koa.response.status = 500
        resolve({message: 'failed to upload', error: err})
      })
    })
  })
})

app.use(router.routes())
app.use(session(app))
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`listening on port ${port}`)
})
