'use strict'

const fs = require('fs')
const Migrator = require('./migrator')
const confirm  = require('../cli/confirm')

const SEP = '========================================================================'

async function migrate (logger, pathname, password) {
  let stat

  try {
    stat = fs.statSync(pathname)
  } catch (error) {
    return false
  }

  if (!stat.isFile()) return false

  message(
    'It looks as though your config file (' + pathname + ') was created ' +
    'with an old version of Vault. In order to continue, it needs to be ' +
    'converted to a new format.')

  await confirm('Would you like Vault to perform this conversion now?')

  console.error('\n' + SEP)

  let migrator = new Migrator({ logger, pathname, password })
  let backupPath = await migrator.run()

  console.error(SEP)

  message(
    'Your original config file has been backed up at ' + backupPath + '. ' +
    'If you are happy with how Vault is working, you should delete that file ' +
    'as soon as possible.')
}

function message (text) {
  console.error('\n' + formatMessage(text) + '\n')
}

function formatMessage (text) {
  if (!process.stderr.getWindowSize) return message

  let width = process.stderr.getWindowSize()[0] - 4
  let words = text.split(/\s+/)
  let lines = ['']

  while (words.length > 0) {
    let last = lines[lines.length - 1]
    let word = words.shift()

    if (last.length + word.length + 1 > width) {
      lines.push('')
    }

    last = lines[lines.length - 1]
    lines[lines.length - 1] = (last === '') ? word : last + ' ' + word
  }

  return lines.join('\n')
}

module.exports = { migrate }
