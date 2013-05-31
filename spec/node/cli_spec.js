var fs            = require('fs'),
    path          = require('path'),
    editor        = require('../../node/editor'),
    LocalStore    = require('../../node/local_store'),
    RemoteStorage = require('../../lib/remotestorage'),
    CLI           = require('../../node/cli')

JS.ENV.CliSpec = JS.Test.describe("CLI", function() { with(this) {
  define("createStubs", function() {})

  before(function() { with(this) {
    createStubs()

    this.configPath = path.resolve(__dirname + "/.vault")
    this.exportPath = path.resolve(__dirname + "/export.json")
    this.stdout     = {write: function() {}}
    this.stderr     = {write: function() {}}
    this.passphrase = "something"
    this.confirm    = true

    this.cli = new CLI({
      config: {path: configPath, key: "the key"},
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

    this.storage = new LocalStore({path: configPath, key: "the key", cache: false})
  }})

  after(function() { with(this) {
    [configPath, exportPath].forEach(function(path) {
      try { fs.unlinkSync(path) } catch (e) {}
    })
  }})

  describe("with no config file", function() { with(this) {
    it("outputs a generated password", function(resume) { with(this) {
      expect(stdout, "write").given("2hk!W[L,2rWWI=~=l>,E")
      cli.run(["node", "bin/vault", "google", "-p"], function() { resume() })
    }})

    it("generates a password using a private key", function(resume) { with(this) {
      expect(stdout, "write").given("c8<BHXZMc*Gxks&%%=F4")
      cli.run(["node", "bin/vault", "google", "-k"], function() { resume() })
    }})

    it("outputs a password with no symbols", function(resume) { with(this) {
      expect(stdout, "write").given("Bb4uFmAEUnTPJh23ecdQ")
      cli.run(["node", "bin/vault", "google", "-p", "--symbol", "0"], function() { resume() })
    }})

    it("outputs a password with required dashes and uppercase", function(resume) { with(this) {
      expect(stdout, "write").given('2-[w]thuTK8unIUVH"Lp')
      cli.run(["node", "bin/vault", "google", "-p", "--dash", "1", "--upper", "1"], function() { resume() })
    }})

    it("outputs a password with all character types", function(resume) { with(this) {
      expect(stdout, "write").given(": : fv_wqt>a-4w1S  R")
      passphrase = "She cells C shells bye the sea shoars"
      cli.run(["node", "bin/vault", "google", "-p", "--dash", "2", "--lower", "2", "--space", "3", "--upper", "2", "--symbol", "1", "--number", "1"], function() { resume() })
    }})

    it("outputs a password with a length", function(resume) { with(this) {
      expect(stdout, "write").given("Tc8k~8")
      cli.run(["node", "bin/vault", "google", "-p", "-l", "6"], function() { resume() })
    }})

    it("outputs a password with a repetition limit", function(resume) { with(this) {
      passphrase = ""
      expect(stdout, "write").given("IVTDzACftqopUXqDHPkuCIhV")
      cli.run(["node", "bin/vault", "asd", "-p", "--number", "0", "--symbol", "0", "-l", "24", "-r", "1"], function() { resume() })
    }})

    it("reports an error if no passphrase given", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "google"], function(e) {
        resume(function() {
          assertEqual( "No passphrase given; pass `-p` or run `vault -cp`", e.message )
      })})
    }})

    it("reports an error if no service given", function(resume) { with(this) {
      cli.run(["node", "bin/vault"], function(e) {
        resume(function() {
          assertEqual( "No service name given", e.message )
      })})
    }})

    it("saves a global passphrase", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-cp"], function() {
        storage.serviceSettings("internet", true, function(e, internet) {
          storage.serviceSettings("google", true, function(e, google) {
            resume(function() {
              assertEqual( {phrase: "something"}, internet )
              assertEqual( {phrase: "something"}, google )
      })})})})
    }})

    it("saves a service-specific passphrase", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-cp", "google"], function() {
        storage.serviceSettings("internet", true, function(e, internet) {
          storage.serviceSettings("google", true, function(e, google) {
            resume(function() {
              assertEqual( {}, internet )
              assertEqual( {phrase: "something"}, google )
      })})})})
    }})

    it("saves a global public key", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-ck"], function() {
        storage.serviceSettings("internet", true, function(e, internet) {
          storage.serviceSettings("google", true, function(e, google) {
            resume(function() {
              assertEqual( {key: "AAAAPUBLICKEY"}, internet )
              assertEqual( {key: "AAAAPUBLICKEY"}, google )
      })})})})
    }})

    it("saves a service-specific public key", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-ck", "google"], function() {
        storage.serviceSettings("internet", true, function(e, internet) {
          storage.serviceSettings("google", true, function(e, google) {
            resume(function() {
              assertEqual( {}, internet )
              assertEqual( {key: "AAAAPUBLICKEY"}, google )
      })})})})
    }})

    it("saves a global character constraint", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-c", "--length", "6", "--symbol", "0"], function() {
        storage.serviceSettings("internet", true, function(e, internet) {
          storage.serviceSettings("google", true, function(e, google) {
            resume(function() {
              assertEqual( {length: 6, symbol: 0}, internet )
              assertEqual( {length: 6, symbol: 0}, google )
      })})})})
    }})

    it("saves a service-specific character constraint", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-c", "google", "--length", "6", "--symbol", "0"], function() {
        storage.serviceSettings("internet", true, function(e, internet) {
          storage.serviceSettings("google", true, function(e, google) {
            resume(function() {
              assertEqual( {}, internet )
              assertEqual( {length: 6, symbol: 0}, google )
      })})})})
    }})

    it("saves some notes for a service", function(resume) { with(this) {
      stub(editor, "edit").yields([null, "Saved notes!"])
      cli.run(["node", "bin/vault", "-c", "--notes", "google"], function() {
        storage.serviceSettings("google", true, function(e, google) {
          resume(function() {
            assertEqual( {notes: "Saved notes!"}, google )
      })})})
    }})

    it("deletes the notes for a service", function(resume) { with(this) {
      stub(editor, "edit").yields([null, " \n\r\t\t \n\r\n "])
      cli.run(["node", "bin/vault", "-c", "--notes", "google"], function() {
        storage.serviceSettings("google", true, function(e, google) {
          resume(function() {
            assertEqual( {}, google )
      })})})
    }})

    it("exports the default settings", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-e", exportPath], function() {
        resume(function() {
          var json = JSON.parse(fs.readFileSync(exportPath))
          assertEqual( {global: {}, services: {}}, json )
      })})
    }})

    it("imports a saved settings file", function(resume) { with(this) {
      fs.writeFileSync(exportPath, '{"services":{"google":{"length":8}}}')
      cli.run(["node", "bin/vault", "-i", exportPath], function() {
        storage.serviceSettings("google", true, function(e, google) {
          resume(function() { assertEqual( {length: 8}, google ) })
      })})
    }})
  }})

  describe("with a config file", function() { with(this) {
    before(function(resume) { with(this) {
      storage.load(function(error, config) {
        config.global = {lower: 0, phrase: "saved passphrase"}

        config.services.twitter  = {lower: 1, symbol: 0}
        config.services.nothing  = {notes: "\nSome notes!\n===========\n\n\n\n"}
        config.services.facebook = {key: "AAAAPUBLICKEY"}

        storage.dump(config, resume)
      })
    }})

    it("reports an error if the key is wrong", function(resume) { with(this) {
      cli._store = new LocalStore({path: configPath, key: "the wrong key"})
      cli.run(["node", "bin/vault", "google"], function(e) {
        resume(function() {
          assertEqual( "Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings", e.message )
      })})
    }})

    it("reports an error if the file has been tampered", function(resume) { with(this) {
      fs.writeFileSync(configPath, fs.readFileSync(configPath).toString().replace(/.$/, "X"))
      cli.run(["node", "bin/vault", "google"], function(e) {
        resume(function() {
          assertEqual( "Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings", e.message )
      })})
    }})

    it("reports an error if the file has a zero-length payload", function(resume) { with(this) {
      fs.writeFileSync(configPath, "DqOnhLAQ98oZtClj0lYjT2Y4YjU2NzRhZGVmMjRlN2E1ZWViYjJhYzRjODZlZjlkYThjNGRhYTVmOTEyZmIyNjdiNmJhNGExMWRiMTEwNWU=")
      cli.run(["node", "bin/vault", "google"], function(e) {
        resume(function() {
          assertEqual( "Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings", e.message )
      })})
    }})

    it("reports an error if the file is too short", function(resume) { with(this) {
      fs.writeFileSync(configPath, "42")
      cli.run(["node", "bin/vault", "google"], function(e) {
        resume(function() {
          assertEqual( "Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings", e.message )
      })})
    }})

    it("completes option fragments", function(resume) { with(this) {
      expect(stdout, "write").given("--lower")
      cli.run(["node", "bin/vault", "--cmplt", "--lo"], function() { resume() })
    }})

    it("completes option fragments with no letters", function(resume) { with(this) {
      expect(stdout, "write").given( ["--add-source", "--browser", "--clear",
                                      "--cmplt", "--config", "--dash",
                                      "--delete", "--delete-globals",
                                      "--delete-source", "--export", "--help",
                                      "--import", "--initpath", "--key",
                                      "--length", "--list-sources", "--lower",
                                      "--notes", "--number", "--phrase",
                                      "--repeat", "--set-source", "--source",
                                      "--space", "--symbol", "--text-browser",
                                      "--upper"].join("\n") )

      cli.run(["node", "bin/vault", "--cmplt", "--"], function() { resume() })
    }})

    it("completes service names", function(resume) { with(this) {
      expect(stdout, "write").given("twitter")
      cli.run(["node", "bin/vault", "--cmplt", "tw"], function() { resume() })
    }})

    it("completes empty service names", function(resume) { with(this) {
      expect(stdout, "write").given(["facebook", "local", "nothing", "twitter"].join("\n"))
      cli.run(["node", "bin/vault", "--cmplt", ""], function() { resume() })
    }})

    it("outputs a password using the stored passphrase", function(resume) { with(this) {
      expect(stdout, "write").given("(JA!4O'+&5I'/-V{N100")
      cli.run(["node", "bin/vault", "google"], function() { resume() })
    }})

    it("outputs a password using a service-specific passphrase", function(resume) { with(this) {
      expect(stdout, "write").given("199pS3LWcTpgGBMEDkx9")
      cli.run(["node", "bin/vault", "twitter"], function() { resume() })
    }})

    it("outputs a password using a service-specific private key", function(resume) { with(this) {
      expect(stdout, "write").given('++IAP:^*$6,"9~R-}%R-')
      cli.run(["node", "bin/vault", "facebook"], function() { resume() })
    }})

    it("allows the --phrase flag to override stored keys", function(resume) { with(this) {
      expect(stdout, "write").given("Q}T.}#S+SE#@+'|}5Q\\A")
      cli.run(["node", "bin/vault", "facebook", "-p"], function() { resume() })
    }})

    it("outputs a password using service-specific settings with overrides", function(resume) { with(this) {
      expect(stdout, "write").given("^g;Y4[k+Sg!1Z1fxY<mO")
      cli.run(["node", "bin/vault", "twitter", "--symbol", "4"], function() { resume() })
    }})

    it("outputs a password on stdout and the notes on stderr", function(resume) { with(this) {
      expect(stdout, "write").given("1$5QC<'<?[FWE~&'P(]U")
      expect(stderr, "write").given("\nSome notes!\n===========\n\n")
      cli.run(["node", "bin/vault", "nothing"], function() { resume() })
    }})

    it("reports an error if no service given", function(resume) { with(this) {
      cli.run(["node", "bin/vault"], function(e) {
        resume(function() {
          assertEqual( "No service name given", e.message )
      })})
    }})

    it("removes all saved services", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-X"], function() {
        storage.serviceSettings("twitter", true, function(e, twitter) {
          resume(function() { assertEqual( {}, twitter ) })
      })})
    }})

    it("removes global settings", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "--delete-globals"], function() {
        storage.serviceSettings("twitter", true, function(e, twitter) {
          resume(function() { assertEqual( {lower: 1, symbol: 0}, twitter ) })
      })})
    }})

    it("removes a saved service", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-x", "twitter"], function() {
        storage.serviceSettings("twitter", true, function(e, twitter) {
          resume(function() { assertEqual( {lower: 0, phrase: "saved passphrase"}, twitter ) })
      })})
    }})

    it("changes a saved service setting", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-c", "twitter", "--lower", "8"], function() {
        storage.serviceSettings("twitter", true, function(e, twitter) {
          resume(function() { assertEqual( {lower: 8, symbol: 0, phrase: "saved passphrase"}, twitter ) })
      })})
    }})

    it("changes a saved global setting", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-c", "--lower", "8"], function() {
        storage.serviceSettings("google", true, function(e, google) {
          storage.serviceSettings("twitter", true, function(e, twitter) {
            resume(function() {
              assertEqual( {lower: 8, phrase: "saved passphrase"}, google )
              assertEqual( {lower: 1, symbol: 0, phrase: "saved passphrase"}, twitter )
      })})})})
    }})

    it("exports the saved settings in plaintext", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-e", exportPath], function() {
        resume(function() {
          var json = JSON.parse(fs.readFileSync(exportPath))
          assertEqual( {
            global: {lower: 0, phrase: "saved passphrase" },
            services: {
              facebook: {key: "AAAAPUBLICKEY"},
              nothing: {notes: "\nSome notes!\n===========\n\n\n\n"},
              twitter: {lower: 1, symbol: 0}
            }
          }, json)
        })
      })
    }})

    it("throws an error when importing a missing file", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-i", __dirname + "/nosuch"], function(error) {
        resume(function() { assert(error) })
      })
    }})

    describe("source-managing methods", function() { with(this) {
      before(function(resume) { with(this) {
        this._5apps   = {}
        this._local   = {}
        this._example = {}

        stub(RemoteStorage.prototype, "connect").given("jcoglan@5apps.com", {}).returns(_5apps)
        stub(RemoteStorage.prototype, "connect").given("me@local.dev", {}).returns(_local)

        storage.load(function(error, config) {
          config.sources["me@local.dev"] = {}
          config.sources["jcoglan@5apps.com"] = {}
          storage.dump(config, resume)
        })
      }})

      describe("adding a valid source", function() { with(this) {
        before(function() { with(this) {
          stub(RemoteStorage.prototype, "connect").given("person@example.com", {browser: null, inline: false}).returns(_example)

          stub(_example, "authorize").yielding([null, {
            oauth:   "https://example.com/auth/person",
            storage: "https://example.com/store/person",
            version: "draft.00",
            token:   "HsLEuMkjrkDBluj5jSy0doPx/b8="
          }])
        }})

        it("adds the source to the local store", function(resume) { with(this) {
          expect(stdout, "write").given('Source "person@example.com" was successfully added.\n')
          cli.run(["node", "bin/vault", "--add-source", "person@example.com"], function() {
            storage.load(function(error, config) {
              resume(function() {
                assertEqual({
                  type:    "remotestorage",
                  version: "draft.00",
                  oauth:   "https://example.com/auth/person",
                  storage: "https://example.com/store/person",
                  token:   "HsLEuMkjrkDBluj5jSy0doPx/b8=",
                  browser: null,
                  inline:  false
                }, config.sources["person@example.com"])
          })})})
        }})

        it("makes the new source the default", function(resume) { with(this) {
          expect(stdout, "write").given('Source "person@example.com" was successfully added.\n')
          expect(stdout, "write").given( ["  jcoglan@5apps.com", "  local", "  me@local.dev", "* person@example.com", ""].join("\n") )
          cli.run(["node", "bin/vault", "--add-source", "person@example.com"], function() {
            cli.run(["node", "bin/vault", "--list-sources"], function() { resume() })
          })
        }})

        describe("when the user chooses not to make the source the default", function() { with(this) {
          before(function() { this.confirm = false })

          it("makes the new source the default", function(resume) { with(this) {
            expect(stdout, "write").given('Source "person@example.com" was successfully added.\n')
            expect(stdout, "write").given( ["  jcoglan@5apps.com", "* local", "  me@local.dev", "  person@example.com", ""].join("\n") )
            cli.run(["node", "bin/vault", "--add-source", "person@example.com"], function() {
              cli.run(["node", "bin/vault", "--list-sources"], function() { resume() })
            })
          }})
        }})
      }})

      describe("adding a valid source with an inline browser", function() { with(this) {
        before(function() { with(this) {
          stub(RemoteStorage.prototype, "connect").given("person@example.com", {browser: "elinks", inline: true}).returns(_example)

          stub(_example, "authorize").yielding([null, {
            oauth:   "https://example.com/auth/person",
            storage: "https://example.com/store/person",
            version: "draft.00",
            token:   "HsLEuMkjrkDBluj5jSy0doPx/b8="
          }])
        }})

        it("adds the source to the local store", function(resume) { with(this) {
          expect(stdout, "write").given('Source "person@example.com" was successfully added.\n')
          cli.run(["node", "bin/vault", "--text-browser", "elinks", "--add-source", "person@example.com"], function() {
            storage.load(function(error, config) {
              resume(function() {
                assertEqual({
                  type:    "remotestorage",
                  version: "draft.00",
                  oauth:   "https://example.com/auth/person",
                  storage: "https://example.com/store/person",
                  token:   "HsLEuMkjrkDBluj5jSy0doPx/b8=",
                  browser: "elinks",
                  inline:  true
                }, config.sources["person@example.com"])
          })})})
        }})
      }})

      describe("adding an invalid source", function() { with(this) {
        before(function() { with(this) {
          stub(RemoteStorage.prototype, "connect").given("person@example.com", {browser: null, inline: false}).returns(_example)

          stub(_example, "authorize").yielding([
            {message: "Could not find remoteStorage endpoints for person@example.com"}
          ])
        }})

        it("does not add the source to the local store", function(resume) { with(this) {
          cli.run(["node", "bin/vault", "--add-source", "person@example.com"], function(error) {
            storage.load(function(err, config) {
              resume(function() {
                assertEqual( "Could not find remoteStorage endpoints for person@example.com", error.message )
                assertEqual( undefined, config.sources["person@example.com"] )
          })})})
        }})
      }})

      describe("clearing the settings", function() { with(this) {
        before(function(resume) { with(this) {
          cli.run(["node", "bin/vault", "-X"], resume)
        }})

        it("does not delete the saved sources", function(resume) { with(this) {
          expect(stdout, "write").given( ["  jcoglan@5apps.com", "* local", "  me@local.dev", ""].join("\n") )
          cli.run(["node", "bin/vault", "--list-sources"], function() { resume() })
        }})
      }})

      it("completes source addresses", function(resume) { with(this) {
        stub(_5apps, "get").given("/vault/services/").yields([null, {content: "{}"}])
        stub(_local, "get").given("/vault/services/").yields([null, {content: "{}"}])
        expect(stdout, "write").given("me@local.dev")
        cli.run(["node", "bin/vault", "--cmplt", "me"], function() { resume() })
      }})

      it("lists the available sources", function(resume) { with(this) {
        expect(stdout, "write").given( ["  jcoglan@5apps.com", "* local", "  me@local.dev", ""].join("\n") )
        cli.run(["node", "bin/vault", "--list-sources"], function() { resume() })
      }})

      it("lets you change the default source", function(resume) { with(this) {
        expect(stdout, "write").given( ["  jcoglan@5apps.com", "  local", "* me@local.dev", ""].join("\n") )
        cli.run(["node", "bin/vault", "--set-source", "me@local.dev"], function() {
          cli.run(["node", "bin/vault", "--list-sources"], function() { resume() })
        })
      }})

      it("shows local as the current source if the current remote is deleted", function(resume) { with(this) {
        expect(stdout, "write").given( ["  jcoglan@5apps.com", "* local", ""].join("\n") )
        cli.run(["node", "bin/vault", "--delete-source", "me@local.dev"], function() {
          cli.run(["node", "bin/vault", "--list-sources"], function() { resume() })
        })
      }})
    }})
  }})
}})

