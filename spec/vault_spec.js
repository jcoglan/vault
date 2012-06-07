var PHRASE = "She cells C shells bye the sea shoars"

JS.ENV.VaultSpec = JS.Test.describe("Vault", function() { with(this) {
  before(function() { this.vault = new Vault(this.options()) })
  
  define("options", function() { return {} })
  
  describe("pbkdf2", function() { with(this) {
    it("works the same on every platform", function(resume) { with(this) {
      Vault.pbkdf2("foo", "salt", 4, 1, function(error, key) {
        resume(function() {
          assertEqual( "ed3b239acbd18e722fc6559832840547", key )
        })
      })
    }})
  }})
  
  describe("with a passphrase", function() { with(this) {
    define("options", function() { return {phrase: PHRASE} })
    
    it("generates a password", function() { with(this) {
      assertEqual( "y£J05x~X8e3IV{|27u8^", vault.generate("google") )
    }})
    
    it("generates a different password for each service", function() { with(this) {
      assertEqual( "*VX03:: :5Ck}Xj1@[!!", vault.generate("twitter") )
    }})

    it("generates a different password for each passphrase", function() { with(this) {
      vault = new Vault({phrase: PHRASE + "X"})
      assertEqual( "+u7 ZW4T ~[.4Gvw'23e", vault.generate("google") )
    }})
  }})
  
  describe("with a length", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, length: 4} })
    
    it("generates a password of the given length", function() { with(this) {
      assertEqual( "*{tr", vault.generate("google") )
    }})
  }})
  
  describe("with a repetition limit", function() { with(this) {
    define("options", function() { return {phrase: "", length: 24, symbol: 0, number: 0, repeat: 1} })

    it("generates a password with no repeated characters", function() { with(this) {
      assertEqual( "uXcNnQGHMHMBQFRsjSlNKCfP", vault.generate("asd") )
    }})
  }})
  
  describe("with no symbols", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, symbol: 0} })
    
    it("generates a password containing no symbols", function() { with(this) {
      assertEqual( "mGK VjYLING8fEmP7DIN", vault.generate("google") )
    }})
  }})
  
  describe("with more symbols than will fit", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, symbol: 100} })
    
    it("throws an error", function() { with(this) {
      assertThrows(Error, function() { vault.generate("google") })
    }})
  }})
  
  describe("with no numbers", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, number: 0} })
    
    it("generates a password containing no digits", function() { with(this) {
      assertEqual( "y[J %xSX*e£IV.P&&u*}", vault.generate("google") )
    }})
  }})
  
  describe("with no letters", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, alpha: 0} })
    
    it("generates a password containing no letters", function() { with(this) {
      assertEqual( "@,?|;]|]{[{3{!\"@)|{'", vault.generate("google") )
    }})
  }})
  
  describe("with at least 5 numbers", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, length: 8, number: 5} })
    
    it("generates a password with at least 5 digits", function() { with(this) {
      assertEqual( "8.7W795T", vault.generate("songkick") )
    }})
  }})
  
  describe("with lots of spaces", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, space: 12} })
    
    it("generates a password that's almost all spaces", function() { with(this) {
      assertEqual( "s    +8  p -{      R", vault.generate("songkick") )
    }})
  }})
}})

