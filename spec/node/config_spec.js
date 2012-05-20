var fs         = require('fs'),
    path       = require('path'),
    LocalStore = require('../../node/local_store'),
    Config     = require('../../node/config')

JS.ENV.ConfigSpec = JS.Test.describe("Config", function() { with(this) {
  before(function() { with(this) {
    this.configPath = path.resolve(__dirname + "/.vault")
    this.exportPath = path.resolve(__dirname + "/export.json")
    this.storage    = new LocalStore({path: configPath, key: "the key"})
    this.config     = new Config(storage)
  }})
  
  after(function() { with(this) {
    [configPath, exportPath].forEach(function(path) {
      try { fs.unlinkSync(path) } catch (e) {}
    })
  }})
  
  describe("with no config file", function(resume) { with(this) {
    it("returns empty settings for a service", function(resume) { with(this) {
      config.read("internet", function(e, internet) {
        resume(function() { assertEqual( {}, internet ) })
      })
    }})
    
    it("does not create a config file on read", function(resume) { with(this) {
      config.read("internet", function() {
        fs.stat(configPath, function(error, stat) {
          resume(function() { assert(error) })
        })
      })
    }})
    
    it("creates a file on edit", function(resume) { with(this) {
      config.edit(function() {}, function() {
        fs.stat(configPath, function(error, stat) {
          resume(function() { assert(!error) })
        })
      })
    }})
    
    it("retrieves service settings after edit", function(resume) { with(this) {
      config.edit(function(c) { c.services.internet = {n:42} }, function() {
        config.read("internet", function(e, internet) {
          resume(function() { assertEqual( {n:42}, internet ) })
        })
      })
    }})
  }})
  
  describe("with a config file", function() { with(this) {
    before(function(resume) { with(this) {
      config.edit(function(c) {
        c.services.internet = {symbol: 0, alpha: 4}
        c.services.work = {phrase: "something"}
        c.global.symbol = 2
        c.global.phrase = "the phrase"
      }, resume)
    }})
    
    it("returns global settings for an unknown service", function(resume) { with(this) {
      config.read("unknown", function(e, unknown) {
        resume(function() { assertEqual( {phrase: "the phrase", symbol: 2}, unknown ) })
      })
    }})
    
    it("returns merged settings for a known service", function(resume) { with(this) {
      config.read("internet", function(e, internet) {
        config.read("work", function(e, work) {
          resume(function() {
            assertEqual( {phrase: "the phrase", symbol: 0, alpha: 4}, internet )
            assertEqual( {phrase: "something", symbol: 2}, work )
      })})})
    }})
  }})
}})

