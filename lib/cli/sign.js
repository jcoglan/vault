'use strict'

const SSH = require('ssh-agent')

function sign (sshKey, message) {
  let client = new SSH()
  message = Buffer.from(message, 'utf8')

  return new Promise((resolve, reject) => {
    client.requestIdentities((error, keys) => {
      if (error) return reject(error)

      let key = keys.find((key) => key.ssh_key === sshKey)
      if (!key) return reject(new Error('Private key not found'))

      client.sign(key, message, (error, signature) => {
        if (error) {
          reject(error)
        } else {
          resolve(signature.signature)
        }
      })
    })
  })
}

module.exports = sign
