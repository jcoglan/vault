var async       = require("async"),
    path        = require("path"),
    rmrf        = require("rimraf"),
    CLI         = require("../../node/cli"),
    Store       = require("../../lib/store"),
    FileAdapter = require("../../node/file_adapter")

var CliHelper = new JS.Module()

CliHelper.included = function(suite) {
  suite.before(function() { with(this) {
    this.configPath = path.join(__dirname, ".vault")
    this.exportPath = path.join(__dirname, "export.json")
    this.stdout     = {write: function() {}}
    this.stderr     = {write: function() {}}
    this.passphrase = "something"
    this.confirm    = true

    this.cli = new CLI({
      config: {path: configPath, key: "the key", cache: false},
      stdout: this.stdout,
      stderr: this.stderr,
      tty:    false,

      confirm: function(message, callback) {
        callback(confirm)
      },

      password: function(callback) {
        callback(passphrase)
      },

      selectKey: function(callback) {
        callback(null, "AAAAPUBLICKEY")
      },

      sign: function(key, message, callback) {
        if (key === "AAAAPUBLICKEY")
          callback(null, message);
        else
          callback(new Error("Could not sign the message"))
      }
    })

    this.storage = new Store(new FileAdapter(configPath), "the key", {cache: false})
  }})

  suite.after(function(resume) { with(this) {
    async.forEach([configPath, exportPath], rmrf, resume)
  }})
}

module.exports = CliHelper

