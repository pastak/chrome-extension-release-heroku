'use strict'
const fs = require('fs')
const path = require('path')
const app = require('koa')()
const router = require('koa-router')()
const koaBody = require('koa-body')
const ChromeWebstoreManager = require('chrome-webstore-manager')
const redis = require('redis').createClient(process.env.REDIS_URL || 6379)
const itemId = process.env.ITEM_ID
const clientId = process.env.WEBSTORE_CLIENT_ID
const clientSecret = process.env.WEBSTORE_CLIENT_SECRET

const chromeWebstoreManager = new ChromeWebstoreManager(clientId, clientSecret)

const getToken = () => {
  return (callback) => {
    redis.get('token', callback)
  }
}

const setToken = (token) => {
  return (callback) => {
    redis.set('token', token, callback)
  }
}

const delToken = () => {
  return (callback) => {
    redis.DEL('token', callback)
  }
}

router.get('/', function *(next) {
  this.type = 'text/html'
  this.body = `This app is receive webhook from github to release chrome webstore<br />
  <a href='https://chrome.google.com/webstore/detail/${itemId}'>This item's webstore page</a>.`
})

router.get('/initialize', function *(next) {
  const token = yield getToken()
  if (token) {
    this.body = token
  } else {
    const callbackUrl = `${this.request.origin}/callback`
    this.response.redirect(chromeWebstoreManager.getCodeUrl(callbackUrl))
  }
})

router.post('/delete_token', function *() {
  try {
    yield delToken()
    this.response.redirect('/initialize')
  } catch(e) {
    this.status = 500
    this.body = e
  }
})

router.get('/callback', function *(next) {
  const query = {}
  this.request.querystring.split('&').forEach((q) => {
    const tmp = q.split('=')
    query[tmp[0]] = tmp[1]
  })
  const callbackUrl = `${this.request.origin}/callback`
  this.body = yield chromeWebstoreManager.getAccessToken(query['code'], callbackUrl).then(function *(next, data) {
    data = JSON.parse(data)
    data.expired_at = Date.now() + (Number(data.expires_in) * 1000)
    yield setToken(JSON.stringify(data))
    return 'Success to save your token!'
  })
})

// Receive Zip from CI
router.post('/release', koaBody({multipart:true}), function *(next) {
  const koa = this
  const authToken = this.request.body.fields.token
  if (authToken !== process.env.AUTH_TOKEN) {
    this.status = 401
    return this.body = {message: 'token invalid'}
  }
  const extZipBinData = fs.readFileSync(this.request.body.files.file.path)
  this.body = yield new Promise(function *(next, resolve) {
    const tokenStr = yield getToken()
    const tokenJSON = JSON.parse(tokenStr)
    let token = tokenJSON.access_token
    const updateAndPublishItem = () => {
      chromeWebstoreManager.updateItem(token, extZipBinData, itemId)
      .then((data) => {
        chromeWebstoreManager.publishItem(token, itemId).then(() => {
          resolve({message: 'success'})
        }).catch((err) => {
          koa.status = 500
          resolve({message: 'failed to publish', error: err})
        })
      }).catch((err) => {
        koa.status = 500
        resolve({message: 'failed to upload', error: err})
      })
    }
    if (tokenJSON.expired_at < Date.now()) {
      chromeWebstoreManager.getRefreshToken(tokenJSON.refresh_token)
        .then(function *(next, data) {
          data = JSON.parse(data)
          data.expired_at = Date.now() + (Number(data.expires_in) * 1000)
          const newTokenJson = Object.assign(tokenJSON, data)
          token = newTokenJson.access_token
          yield setToken(JSON.stringify(newTokenJson))
        }).then(updateAndPublishItem)
    } else {
      updateAndPublishItem()
    }
  })
})

app.use(router.routes())
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`listening on port ${port}`)
})
