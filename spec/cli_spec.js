var fs     = require('fs'),
    path   = require('path'),
    CLI    = require('../lib/vault/cli'),
    Config = require('../lib/vault/config')

JS.ENV.CliSpec = JS.Test.describe("CLI", function() { with(this) {
  before(function() { with(this) {
    this.configPath = path.resolve(__dirname + "/.vault")
    this.exportPath = path.resolve(__dirname + "/export.json")
    this.stdout     = {}
    
    this.cli = new CLI({
      config: {path: configPath, key: "the key"},
      output: this.stdout,
      tty:    false,
      
      password: function(callback) {
        callback("something")
      }
    })
    stub(this.cli, "die")
    
    this.config = new Config({path: configPath, key: "the key"})
  }})
  
  after(function() { with(this) {
    [configPath, exportPath].forEach(function(path) {
      try { fs.unlinkSync(path) } catch (e) {}
    })
  }})
  
  describe("with no config file", function() { with(this) {
    it("outputs a generated password", function() { with(this) {
      expect(stdout, "write").given("Zl51S48;v69x£*4<")
      cli.run(["node", "bin/vault", "google", "-p"])
    }})
    
    it("outputs a password with no symbols", function() { with(this) {
      expect(stdout, "write").given("Zf86R FZY FcKCXX")
      cli.run(["node", "bin/vault", "google", "-p", "--symbol", "0"])
    }})
    
    it("outputs a password with required dashes and uppercase", function() { with(this) {
      expect(stdout, "write").given("ZC 9R -Y9><0Udm4")
      cli.run(["node", "bin/vault", "google", "-p", "--dash", "1", "--upper", "1"])
    }})
    
    it("outputs a password with a length", function() { with(this) {
      expect(stdout, "write").given("zcF;'S")
      cli.run(["node", "bin/vault", "google", "-p", "-l", "6"])
    }})
    
    it("reports an error if no passphrase given", function() { with(this) {
      expect(cli, "die").given("No passphrase given; pass `-p` or run `vault -cp`")
      cli.run(["node", "bin/vault", "google"])
    }})
    
    it("reports an error if no service given", function() { with(this) {
      expect(cli, "die").given("No service name given")
      cli.run(["node", "bin/vault"])
    }})
    
    it("saves a global passphrase", function() { with(this) {
      cli.run(["node", "bin/vault", "-cp"])
      assertEqual( {phrase: "something"}, config.read("internet") )
      assertEqual( {phrase: "something"}, config.read("google") )
    }})
    
    it("saves a service-specific passphrase", function() { with(this) {
      cli.run(["node", "bin/vault", "-cp", "google"])
      assertEqual( {}, config.read("internet") )
      assertEqual( {phrase: "something"}, config.read("google") )
    }})
    
    it("saves a global character constraint", function() { with(this) {
      cli.run(["node", "bin/vault", "-c", "--length", "6", "--symbol", "0"])
      assertEqual( {length: 6, symbol: 0}, config.read("internet") )
      assertEqual( {length: 6, symbol: 0}, config.read("google") )
    }})
    
    it("saves a service-specific character constraint", function() { with(this) {
      cli.run(["node", "bin/vault", "-c", "google", "--length", "6", "--symbol", "0"])
      assertEqual( {}, config.read("internet") )
      assertEqual( {length: 6, symbol: 0}, config.read("google") )
    }})
    
    it("imports a saved settings file", function() { with(this) {
      fs.writeFileSync(exportPath, '{"services":{"google":{"length":8}}}')
      cli.run(["node", "bin/vault", "-i", exportPath])
      assertEqual( {length: 8}, config.read("google") )
    }})
  }})
  
  describe("with a config file", function() { with(this) {
    before(function() { with(this) {
      config.edit(function(c) {
        c.services.twitter = {alpha: 1, symbol: 0}
        c.alpha = 0
        c.phrase = "saved passphrase"
      })
    }})
    
    it("reports an error if the key is wrong", function() { with(this) {
      cli._config = new Config({path: configPath, key: "the wrong key"})
      expect(cli, "die").given("Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings")
      cli.run(["node", "bin/vault", "google"])
    }})
    
    it("outputs a password using the stored passphrase", function() { with(this) {
      expect(stdout, "write").given(")$)4\":1-}-^|\"\"&{")
      cli.run(["node", "bin/vault", "google"])
    }})
    
    it("outputs a password using service-specific settings", function() { with(this) {
      expect(stdout, "write").given("3zJfsY4P6gNOny1t")
      cli.run(["node", "bin/vault", "twitter"])
    }})
    
    it("reports an error if no service given", function() { with(this) {
      expect(cli, "die").given("No service name given")
      cli.run(["node", "bin/vault"])
    }})
    
    it("changes a saved service setting", function() { with(this) {
      cli.run(["node", "bin/vault", "-c", "twitter", "--alpha", "8"])
      assertEqual( {alpha: 8, symbol: 0, phrase: "saved passphrase"}, config.read("twitter") )
    }})
    
    it("changes a saved global setting", function() { with(this) {
      cli.run(["node", "bin/vault", "-c", "--alpha", "8"])
      assertEqual( {alpha: 8, phrase: "saved passphrase"}, config.read("google") )
      assertEqual( {alpha: 1, symbol: 0, phrase: "saved passphrase"}, config.read("twitter") )
    }})
    
    it("exports the saved settings in plaintext", function() { with(this) {
      cli.run(["node", "bin/vault", "-e", exportPath])
      var json = JSON.parse(fs.readFileSync(exportPath))
      assertEqual( {
        services: {
          twitter: {alpha: 1, symbol: 0}
        },
        alpha: 0,
        phrase: "saved passphrase"
      }, json)
    }})
  }})
}})
