var fs     = require('fs'),
    path   = require('path'),
    CLI    = require('../../node/cli'),
    Config = require('../../node/config')

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
    
    this.config = new Config({path: configPath, key: "the key"})
  }})
  
  after(function() { with(this) {
    [configPath, exportPath].forEach(function(path) {
      try { fs.unlinkSync(path) } catch (e) {}
    })
  }})
  
  describe("with no config file", function() { with(this) {
    it("outputs a generated password", function(resume) { with(this) {
      expect(stdout, "write").given("Zl51S48;v69x£*4<")
      cli.run(["node", "bin/vault", "google", "-p"], resume)
    }})
    
    it("outputs a password with no symbols", function(resume) { with(this) {
      expect(stdout, "write").given("Zf86R FZY FcKCXX")
      cli.run(["node", "bin/vault", "google", "-p", "--symbol", "0"], resume)
    }})
    
    it("outputs a password with required dashes and uppercase", function(resume) { with(this) {
      expect(stdout, "write").given("ZC 9R -Y9><0Udm4")
      cli.run(["node", "bin/vault", "google", "-p", "--dash", "1", "--upper", "1"], resume)
    }})
    
    it("outputs a password with a length", function(resume) { with(this) {
      expect(stdout, "write").given("zcF;'S")
      cli.run(["node", "bin/vault", "google", "-p", "-l", "6"], resume)
    }})
    
    it("reports an error if no passphrase given", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "google"], function(e) {
        resume(function() {
          assertEqual( "No passphrase given; pass `-p` or run `vault -cp`", e.message )
        })
      })
    }})
    
    it("reports an error if no service given", function(resume) { with(this) {
      cli.run(["node", "bin/vault"], function(e) {
        resume(function() {
          assertEqual( "No service name given", e.message )
        })
      })
    }})
    
    it("saves a global passphrase", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-cp"], function() {
        config.read("internet", function(e, internet) {
          config.read("google", function(e, google) {
            resume(function() {
              assertEqual( {phrase: "something"}, internet )
              assertEqual( {phrase: "something"}, google )
      })})})})
    }})
    
    it("saves a service-specific passphrase", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-cp", "google"], function() {
        config.read("internet", function(e, internet) {
          config.read("google", function(e, google) {
            resume(function() {
              assertEqual( {}, internet )
              assertEqual( {phrase: "something"}, google )
      })})})})
    }})
    
    it("saves a global character constraint", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-c", "--length", "6", "--symbol", "0"], function() {
        config.read("internet", function(e, internet) {
          config.read("google", function(e, google) {
            resume(function() {
              assertEqual( {length: 6, symbol: 0}, internet )
              assertEqual( {length: 6, symbol: 0}, google )
      })})})})
    }})
    
    it("saves a service-specific character constraint", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-c", "google", "--length", "6", "--symbol", "0"], function() {
        config.read("internet", function(e, internet) {
          config.read("google", function(e, google) {
            resume(function() {
              assertEqual( {}, internet )
              assertEqual( {length: 6, symbol: 0}, google )
      })})})})
    }})
    
    it("imports a saved settings file", function(resume) { with(this) {
      fs.writeFileSync(exportPath, '{"services":{"google":{"length":8}}}')
      cli.run(["node", "bin/vault", "-i", exportPath], function() {
        config.read("google", function(e, google) {
          resume(function() { assertEqual( {length: 8}, google ) })
        })
      })
    }})
  }})
  
  describe("with a config file", function() { with(this) {
    before(function(resume) { with(this) {
      config.edit(function(c) {
        c.services.twitter = {alpha: 1, symbol: 0}
        c.global.alpha = 0
        c.global.phrase = "saved passphrase"
      }, resume)
    }})
    
    it("reports an error if the key is wrong", function(resume) { with(this) {
      cli._config = new Config({path: configPath, key: "the wrong key"})
      cli.run(["node", "bin/vault", "google"], function(e) {
        resume(function() {
          assertEqual( "Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings", e.message )
        })
      })
    }})
    
    it("outputs a password using the stored passphrase", function(resume) { with(this) {
      expect(stdout, "write").given(")$)4\":1-}-^|\"\"&{")
      cli.run(["node", "bin/vault", "google"], resume)
    }})
    
    it("outputs a password using service-specific settings", function(resume) { with(this) {
      expect(stdout, "write").given("3zJfsY4P6gNOny1t")
      cli.run(["node", "bin/vault", "twitter"], resume)
    }})
    
    it("outputs a password using service-specific settings with overrides", function(resume) { with(this) {
      expect(stdout, "write").given("3Z$£=54\"0&}:0:<m")
      console.log('---------------------------------------------')
      cli.run(["node", "bin/vault", "twitter", "--symbol", "4"], resume)
    }})
    
    it("reports an error if no service given", function(resume) { with(this) {
      cli.run(["node", "bin/vault"], function(e) {
        resume(function() {
          assertEqual( "No service name given", e.message )
        })
      })
    }})
    
    it("changes a saved service setting", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-c", "twitter", "--alpha", "8"], function() {
        config.read("twitter", function(e, twitter) {
          resume(function() { assertEqual( {alpha: 8, symbol: 0, phrase: "saved passphrase"}, twitter ) })
        })
      })
    }})
    
    it("changes a saved global setting", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-c", "--alpha", "8"], function() {
        config.read("google", function(e, google) {
          config.read("twitter", function(e, twitter) {
            resume(function() {
              assertEqual( {alpha: 8, phrase: "saved passphrase"}, google )
              assertEqual( {alpha: 1, symbol: 0, phrase: "saved passphrase"}, twitter )
      })})})})
    }})
    
    it("exports the saved settings in plaintext", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-e", exportPath], function() {
        resume(function() {
          var json = JSON.parse(fs.readFileSync(exportPath))
          assertEqual( {
            global: {alpha: 0, phrase: "saved passphrase" },
            services: {
              twitter: {alpha: 1, symbol: 0}
            }
          }, json)
        })
      })
    }})
  }})
}})

