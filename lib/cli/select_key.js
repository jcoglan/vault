'use strict'

const SSH = require('ssh-agent')
const readline = require('./readline')

const SNIP = 12

function selectKey () {
  let client = new SSH()

  return new Promise((resolve, reject) => {
    client.requestIdentities(async (error, keys) => {
      if (error) return reject(error)

      keys = keys.filter((key) => key.type === 'ssh-rsa')

      if (keys.length === 0) {
        return reject(new Error('No usable RSA keys were found'))
      }

      if (keys.length === 1) {
        return resolve(keys[0].ssh_key)
      }

      console.error('\nWhich key would you like to use?\n')

      for (let [i, { comment, ssh_key }] of keys.entries()) {
        let start = ssh_key.substr(0, SNIP)
        let end = ssh_key.substr(ssh_key.length - SNIP)
        let abbrev = start + '...' + end

        console.error(`${i + 1}: ${comment}, ${abbrev}`)
      }

      let answer = await readline('\nEnter a number (1-' + keys.length + '): ')
      let index = parseInt(answer, 10)

      if (index >= 1 && index <= keys.length) {
        resolve(keys[index - 1].ssh_key)
      } else {
        reject(new Error('Selected key must be between 1 and ' + keys.length))
      }
    })
  })
}

module.exports = selectKey
