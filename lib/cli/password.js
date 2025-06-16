'use strict'

const colors = require('@colors/colors')
const prompt = require('prompt')

colors.disable()
prompt.message = ''

const properties = {
  password: { description: 'Passphrase', hidden: true, replace: '*' }
}

async function password () {
  prompt.start()
  let { password } = await prompt.get({ properties })
  prompt.stop()

  return Buffer.from(password, 'binary').toString('utf8')
}

module.exports = password
