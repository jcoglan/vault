var fs     = require('fs'),
    path   = require('path'),
    Config = require('../lib/vault/config')

JS.ENV.ConfigSpec = JS.Test.describe("Config", function() { with(this) {
  before(function() { with(this) {
    this.configPath = path.resolve(__dirname + "/.vault")
    this.exportPath = path.resolve(__dirname + "/export.json")
    this.config = new Config({path: configPath, key: "the key"})
  }})
  
  after(function() { with(this) {
    [configPath, exportPath].forEach(function(path) {
      try { fs.unlinkSync(path) } catch (e) {}
    })
  }})
  
  describe("with no config file", function() { with(this) {
    it("returns empty settings for a service", function() { with(this) {
      assertEqual( {}, config.read("internet") )
    }})
    
    it("does not create a config file on read", function(resume) { with(this) {
      config.read("internet")
      fs.stat(configPath, function(error, stat) {
        resume(function() { assert(error) })
      })
    }})
    
    it("creates a file on edit", function(resume) { with(this) {
      config.edit(function() {})
      fs.stat(configPath, function(error, stat) {
        resume(function() { assert(!error) })
      })
    }})
    
    it("retrieves service settings after edit", function() { with(this) {
      config.edit(function(c) { c.services.internet = {n:42} })
      assertEqual( {n:42}, config.read("internet") )
    }})
    
    it("exports the default settings", function() { with(this) {
      config.export(exportPath)
      var json = JSON.parse(fs.readFileSync(exportPath))
      assertEqual( {services: {}}, json )
    }})
    
    it("creates a file on import", function() { with(this) {
      fs.writeFileSync(exportPath, '{"services":{"saved":{"phrase":"stored"}}}')
      config.import(exportPath)
      assertEqual( {phrase: "stored"}, config.read("saved") )
    }})
  }})
  
  describe("with a config file", function() { with(this) {
    before(function() { with(this) {
      config.edit(function(c) {
        c.services.internet = {symbol: 0, alpha: 4}
        c.services.work = {phrase: "something"}
        c.symbol = 2
        c.phrase = "the phrase"
      })
    }})
    
    it("returns global settings for an unknown service", function() { with(this) {
      assertEqual( {phrase: "the phrase", symbol: 2}, config.read("unknown") )
    }})
    
    it("returns merged settings for a known service", function() { with(this) {
      assertEqual( {phrase: "the phrase", symbol: 0, alpha: 4}, config.read("internet") )
      assertEqual( {phrase: "something", symbol: 2}, config.read("work") )
    }})
    
    it("exports the saved settings", function() { with(this) {
      config.export(exportPath)
      var json = JSON.parse(fs.readFileSync(exportPath))
      assertEqual( {
        services: {
          internet: {symbol: 0, alpha: 4},
          work:     {phrase: "something"}
        },
        symbol: 2,
        phrase: "the phrase"
      }, json )
    }})
    
    it("throws an error when importing a missing file", function() { with(this) {
      assertThrows(Error, function() { config.import(__dirname + "/nosuch") })
    }})
  }})
}})
