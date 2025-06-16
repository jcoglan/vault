'use strict'

const child = require('child_process')
const crypto = require('../crypto')
const fs = require('fs')

const DEFAULT_EDITOR = 'vim'

class Editor {
  static editTempfile (content) {
    let path = '/tmp/vault-notes-' + crypto.randomBytes(16).toString('hex')
    return Editor.edit(path, content)
  }

  static edit (path, content) {
    return new Editor(path).edit(content)
  }

  constructor (path) {
    this._path = path
    this._editor = process.env.VISUAL || process.env.EDITOR || DEFAULT_EDITOR
  }

  async edit (content) {
    fs.writeFileSync(this._path, content)

    let proc = child.spawn(this._editor, [this._path], { stdio: [0, 1, 2] })
    await waitForExit(proc, 'Editor exited with non-zero status')

    let result = fs.readFileSync(this._path, 'utf8')
    fs.unlinkSync(this._path)

    return result
  }
}

function waitForExit (proc) {
  return new Promise((resolve, reject) => {
    proc.on('exit', (status) => {
      if (status === 0) {
        resolve()
      } else {
        reject(new Error(message + ' (' + status + ')'))
      }
    })
  })
}

module.exports = Editor
