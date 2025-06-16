'use strict'

const pap = require('posix-argv-parser')

class OptParser {
  constructor (options, shorts, args) {
    this._options = {}
    this._args = args

    this._parser = pap.create()

    for (let [key, type] of Object.entries(options)) {
      this._options[key] = { type }
    }

    for (let [key, long] of Object.entries(shorts)) {
      long = long.replace(/^--/, '')
      this._options[long].short = key
    }

    for (let [key, { type, short }] of Object.entries(this._options)) {
      let signature = ['--' + key]
      let profile = { hasValue: type !== Boolean }

      if (type === Number) {
        profile.transform = (str) => parseInt(str, 10)
      }
      if (short) {
        signature.push('-' + short)
      }

      this._parser.createOption(signature, profile)
    }

    for (let arg of args) {
      this._parser.createOperand(arg)
    }
  }

  parse (argv) {
    return new Promise((resolve, reject) => {
      this._parser.parse(argv.slice(2), (error, opt) => {
        if (error) return reject(new Error(error[0]))

        let processed = {}

        for (let key in opt) {
          if (!/^-[a-z]/i.test(key) && opt[key].isSet) {
            let name = key.replace(/^--/, '')
            let { type } = this._options[name] || {}
            processed[name] = (type === Boolean) ? true : opt[key].value
          }
        }

        resolve(processed)
      })
    })
  }
}

module.exports = OptParser
