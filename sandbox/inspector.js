'use strict'

const path = require('path')
const escodb = require('../lib/escodb')

async function main () {
  let password = process.env.VAULT_KEY
  let adapter = escodb.createFileAdapter(path.resolve(process.env.VAULT_PATH))
  let store = await escodb.createStore({ adapter, password })

  for await (let item of store.find('/')) {
    let doc = await store.get('/' + item)
    console.log({ item, doc })
  }
}

main()
