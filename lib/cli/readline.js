'use strict'

const readline = require('readline').promises

async function question (message) {
  let rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr
  })

  let answer = await rl.question(message)
  rl.close()

  return answer
}

module.exports = question
