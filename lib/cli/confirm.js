'use strict'

const readline = require('./readline')

async function confirm (message) {
  let answer = await readline(message + ' (y/n): ')

  if (answer.toLowerCase() !== 'y') {
    throw new Error()
  }
}

module.exports = confirm
