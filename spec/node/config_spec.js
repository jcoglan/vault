var fs     = require('fs'),
    path   = require('path'),
    Config = require('../../node/config')

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
    
    it("exports the default settings", function(resume) { with(this) {
      config.export(exportPath, function() {
        resume(function() {
          var json = JSON.parse(fs.readFileSync(exportPath))
          assertEqual( {services: {}}, json )
        })
      })
    }})
    
    it("creates a file on import", function(resume) { with(this) {
      fs.writeFileSync(exportPath, '{"services":{"saved":{"phrase":"stored"}}}')
      config.import(exportPath, function() {
        config.read("saved", function(e, saved) {
          resume(function() { assertEqual( {phrase: "stored"}, saved ) })
        })
      })
    }})
  }})
  
  describe("with a config file", function() { with(this) {
    before(function(resume) { with(this) {
      config.edit(function(c) {
        c.services.internet = {symbol: 0, alpha: 4}
        c.services.work = {phrase: "something"}
        c.symbol = 2
        c.phrase = "the phrase"
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
    
    it("exports the saved settings", function(resume) { with(this) {
      config.export(exportPath, function() {
        resume(function() {
          var json = JSON.parse(fs.readFileSync(exportPath))
          assertEqual( {
            services: {
              internet: {symbol: 0, alpha: 4},
              work:     {phrase: "something"}
            },
            symbol: 2,
            phrase: "the phrase"
          }, json )
        })
      })
    }})
    
    it("throws an error when importing a missing file", function() { with(this) {
      assertThrows(Error, function() { config.import(__dirname + "/nosuch") })
    }})
  }})
}})

