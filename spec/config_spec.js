JS.ENV.ConfigSpec = JS.Test.describe("Config", function() { with(this) {
  before(function() { with(this) {
    this.storage = {}
    this.config  = new Vault.Config(storage)
  }})
  
  describe("with no config file", function(resume) { with(this) {
    before(function() { with(this) {
      stub(storage, "load").yields([null, {global: {}, services: {}}])
    }})
    
    it("returns empty settings for a service", function(resume) { with(this) {
      config.read("internet", function(e, internet) {
        resume(function() { assertEqual( {}, internet ) })
      })
    }})
    
    it("does not create a config file on read", function(resume) { with(this) {
      expect(storage, "dump").exactly(0)
      config.read("internet", resume)
    }})
    
    it("creates a file on edit", function(resume) { with(this) {
      expect(storage, "dump").given({global: {}, services: {}}).yields([null])
      config.edit(function() {}, resume)
    }})
  }})
  
  describe("with a config file", function() { with(this) {
    before(function() { with(this) {
      stub(storage, "load").yields([null,
        {
          global: {symbol: 2, phrase: "the phrase"},
          services: {
            internet: {symbol: 0, alpha: 4},
            work: {phrase: "something"}
          }
        }
      ])
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

