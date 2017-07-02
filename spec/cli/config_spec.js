var fs        = require("fs"),
    path      = require("path"),
    jstest    = require("jstest").Test,
    Promise   = require("storeroom").Promise,
    CliHelper = require("./helper"),
    editor    = require("../../lib/cli/editor")

jstest.describe("CLI configuration", function() { with(this) {
  include(CliHelper)

  before(function() { with(this) {
    this.pnull = Promise.resolve(null)

    stub(fileStore, "get").given("/sources/default").returns(pnull)
    stub(stdout, "write")
  }})

  describe("global settings", function() { with(this) {
    it("stores a global passphrase", function(resume) { with(this) {
      settings.password = "saved phrase"
      stub(fileStore, "get").given("/global").returns(pnull)

      expect(fileStore, "put").given("/global", {phrase: "saved phrase"}).returning(Promise.resolve())

      call(["--config", "--phrase"]).then(resume, resume)
    }})

    it("acknowledges the save to stdout", function(resume) { with(this) {
      settings.password = "saved phrase"
      stub(fileStore, "get").returns(pnull)
      stub(fileStore, "put").returns(pnull)

      expect(stdout, "write").given(match(/global settings saved/i))

      call(["--config", "--phrase"]).then(resume, resume)
    }})

    it("reports a read error", function(resume) { with(this) {
      settings.password = "saved phrase"
      stub(fileStore, "get").returns(Promise.reject(new Error("failed to read")))

      call(["--config", "--phrase"]).catch(function(error) {
        resume(function() { assertEqual("failed to read", error.message) })
      })
    }})

    it("reports a write error", function(resume) { with(this) {
      settings.password = "saved phrase"
      stub(fileStore, "get").returns(pnull)
      stub(fileStore, "put").returns(Promise.reject(new Error("failed to save")))

      call(["--config", "--phrase"]).catch(function(error) {
        resume(function() { assertEqual("failed to save", error.message) })
      })
    }})

    it("stores a global length", function(resume) { with(this) {
      stub(fileStore, "get").given("/global").returns(pnull)

      expect(fileStore, "put").given("/global", {length: 32}).returning(pnull)

      call(["--config", "--length", "32"]).then(resume, resume)
    }})

    it("stores a global length using shorthand", function(resume) { with(this) {
      stub(fileStore, "get").given("/global").returns(pnull)

      expect(fileStore, "put").given("/global", {length: 32}).returning(pnull)

      call(["-cl", "32"]).then(resume, resume)
    }})

    it("extends an existing global setting", function(resume) { with(this) {
      stub(fileStore, "get").given("/global").returns(Promise.resolve({phrase: "hello"}))

      expect(fileStore, "put").given("/global", {length: 32, phrase: "hello"}).returning(pnull)

      call(["--config", "--length", "32"]).then(resume, resume)
    }})

    it("replaces an existing global setting", function(resume) { with(this) {
      stub(fileStore, "get").given("/global").returns(Promise.resolve({length: 20}))

      expect(fileStore, "put").given("/global", {length: 32}).returning(pnull)

      call(["--config", "--length", "32"]).then(resume, resume)
    }})

    it("deletes the global settings", function(resume) { with(this) {
      settings.confirm = true

      expect(fileStore, "remove").given("/global").returning(pnull)

      call(["--delete-globals"]).then(resume, resume)
    }})

    it("does not delete the global settings without confirmation", function(resume) { with(this) {
      settings.confirm = false

      expect(fileStore, "remove").exactly(0)

      call(["--delete-globals"]).then(resume, resume)
    }})

    it("acknowledges the deletion to stdout", function(resume) { with(this) {
      settings.confirm = true
      stub(fileStore, "remove").returns(pnull)

      expect(stdout, "write").given(match(/global settings deleted/i))

      call(["-G"]).then(resume, resume)
    }})

    it("reports a deletion error", function(resume) { with(this) {
      settings.confirm = true
      stub(fileStore, "remove").returns(Promise.reject(new Error("failed to delete")))

      call(["--delete-globals"]).catch(function(error) {
        resume(function() { assertEqual("failed to delete", error.message) })
      })
    }})
  }})

  describe("service settings", function() { with(this) {
    it("stores config for a service", function(resume) { with(this) {
      stub(fileStore, "get").given("/services/foo").returns(pnull)

      expect(fileStore, "put").given("/services/foo", {symbol: 0}).returning(pnull)

      call(["--config", "foo", "--symbol", "0"]).then(resume, resume)
    }})

    it("acknowledges the save to stdout", function(resume) { with(this) {
      stub(fileStore, "get").returns(pnull)
      stub(fileStore, "put").returns(pnull)

      expect(stdout, "write").given(match(/settings for service "foo" saved/i))

      call(["--config", "foo", "--symbol", "0"]).then(resume, resume)
    }})

    it("reports a read error", function(resume) { with(this) {
      stub(fileStore, "get").returns(Promise.reject(new Error("failed to read")))

      call(["--config", "foo", "--symbol", "0"]).catch(function(error) {
        resume(function() { assertEqual("failed to read", error.message) })
      })
    }})

    it("reports a write error", function(resume) { with(this) {
      stub(fileStore, "get").returns(pnull)
      stub(fileStore, "put").returns(Promise.reject(new Error("failed to save")))

      call(["--config", "foo", "--symbol", "0"]).catch(function(error) {
        resume(function() { assertEqual("failed to save", error.message) })
      })
    }})

    it("stores config for a service using shorthand", function(resume) { with(this) {
      stub(fileStore, "get").given("/services/foo").returns(pnull)

      expect(fileStore, "put").given("/services/foo", {length: 42}).returning(pnull)

      call(["-cl", "42", "foo"]).then(resume, resume)
    }})

    it("extends an existing service setting", function(resume) { with(this) {
      stub(fileStore, "get").given("/services/foo").returns(Promise.resolve({symbol: 0}))

      expect(fileStore, "put").given("/services/foo", {symbol: 0, upper: 2, number: 4}).returning(pnull)

      call(["--config", "foo", "--number", "4", "--upper", "2"]).then(resume, resume)
    }})

    it("replaces an existing service setting", function(resume) { with(this) {
      stub(fileStore, "get").given("/services/foo").returns(Promise.resolve({symbol: 0}))

      expect(fileStore, "put").given("/services/foo", {symbol: 3}).returning(pnull)

      call(["--config", "foo", "--symbol", "3"]).then(resume, resume)
    }})

    it("stores notes for a new service", function(resume) { with(this) {
      stub(fileStore, "get").given("/services/foo").returns(pnull)

      expect(editor, "editTempfile").given(instanceOf("string")).returning(Promise.resolve("the notes"))
      expect(fileStore, "put").given("/services/foo", {notes: "the notes"}).returning(pnull)

      call(["--config", "foo", "--notes"]).then(resume, resume)
    }})

    it("stores new notes for an existing service", function(resume) { with(this) {
      stub(fileStore, "get").given("/services/foo").returns(Promise.resolve({length: 9}))

      expect(editor, "editTempfile").given(instanceOf("string")).returning(Promise.resolve("the notes"))
      expect(fileStore, "put").given("/services/foo", {length: 9, notes: "the notes"}).returning(pnull)

      call(["--config", "foo", "--notes"]).then(resume, resume)
    }})

    it("replaces existing notes for an existing service", function(resume) { with(this) {
      stub(fileStore, "get").given("/services/foo").returns(Promise.resolve({notes: "old notes"}))

      expect(editor, "editTempfile").given("old notes").returning(Promise.resolve("new notes"))
      expect(fileStore, "put").given("/services/foo", {notes: "new notes"}).returning(pnull)

      call(["--config", "foo", "--notes"]).then(resume, resume)
    }})

    it("deletes existing notes for an existing service", function(resume) { with(this) {
      stub(fileStore, "get").given("/services/foo").returns(Promise.resolve({notes: "old notes"}))

      expect(editor, "editTempfile").given("old notes").returning(Promise.resolve(""))
      expect(fileStore, "put").given("/services/foo", {notes: undefined}).returning(pnull)

      call(["--config", "foo", "--notes"]).then(resume, resume)
    }})

    it("deletes a service's settings", function(resume) { with(this) {
      settings.confirm = true

      expect(fileStore, "get").given("/services/foo").returning(Promise.resolve({}))
      expect(fileStore, "remove").given("/services/foo").returning(pnull)

      call(["--delete", "foo"]).then(resume, resume)
    }})

    it("does not delete a service's settings without confirmation", function(resume) { with(this) {
      settings.confirm = false

      expect(fileStore, "get").exactly(0)
      expect(fileStore, "remove").exactly(0)

      call(["--delete", "foo"]).catch(function(error) {
        resume(function() { assertNot(error) })
      })
    }})

    it("does not delete a non-existent service's settings", function(resume) { with(this) {
      settings.confirm = true
      stub(fileStore, "get").given("/services/foo").returns(pnull)

      expect(fileStore, "remove").exactly(0)

      call(["--delete", "foo"]).catch(function(error) {
        resume(function() { assertMatch(/service "foo" is not configured/i, error.message) })
      })
    }})

    it("acknowledges the service deletion to stdout", function(resume) { with(this) {
      settings.confirm = true
      stub(fileStore, "get").given("/services/foo").returns(Promise.resolve({}))
      stub(fileStore, "remove").returns(pnull)

      expect(stdout, "write").given(match(/settings for service "foo" deleted/i))

      call(["-x", "foo"]).then(resume, resume)
    }})

    it("reports a pre-deletion read error", function(resume) { with(this) {
      settings.confirm = true
      stub(fileStore, "get").returns(Promise.reject(new Error("failed to read")))

      call(["--delete", "foo"]).catch(function(error) {
        resume(function() { assertEqual("failed to read", error.message) })
      })
    }})

    it("reports a deletion error", function(resume) { with(this) {
      settings.confirm = true
      stub(fileStore, "get").given("/services/foo").returns(Promise.resolve({}))
      stub(fileStore, "remove").returns(Promise.reject(new Error("failed to delete")))

      call(["--delete", "foo"]).catch(function(error) {
        resume(function() { assertEqual("failed to delete", error.message) })
      })
    }})
  }})

  describe("clearing", function() { with(this) {
    it("clears all the settings", function(resume) { with(this) {
      settings.confirm = true

      expect(fileStore, "remove").given("/global").returning(pnull)
      expect(fileStore, "removeRecursive").given("/services/").returning(pnull)

      call(["--clear"]).then(resume, resume)
    }})

    it("does not clear all the settings without confirmation", function(resume) { with(this) {
      settings.confirm = false

      expect(fileStore, "remove").exactly(0)
      expect(fileStore, "removeRecursive").exactly(0)

      call(["--clear"]).then(resume, resume)
    }})

    it("acknowledges the deletion to stdout", function(resume) { with(this) {
      settings.confirm = true
      stub(fileStore, "remove").returns(pnull)
      stub(fileStore, "removeRecursive").returns(pnull)

      expect(stdout, "write").given(match(/all settings deleted/i))

      call(["-X"]).then(resume, resume)
    }})

    it("reports a deletion error", function(resume) { with(this) {
      settings.confirm = true
      stub(fileStore, "remove").returns(Promise.reject(new Error("failed to delete")))
      stub(fileStore, "removeRecursive").returns(pnull)

      call(["--clear"]).catch(function(error) {
        resume(function() { assertEqual("failed to delete", error.message) })
      })
    }})
  }})

  describe("exporting", function() { with(this) {
    before(function() { with(this) {
      this.exportPath = path.resolve(__dirname, "..", "__vault-export.json")
    }})

    after(function(resume) { with(this) {
      fs.unlink(exportPath, resume)
    }})

    define("exported", function() {
      return JSON.parse(fs.readFileSync(this.exportPath, "utf8"))
    })

    describe("with no stored settings", function() { with(this) {
      before(function() { with(this) {
        stub(fileStore, "get").given("/global").returns(pnull)
        stub(fileStore, "findRecursive").given("/services/").returns([])
      }})

      it("produces a skeleton export file", function(resume) { with(this) {
        call(["--export", exportPath]).then(function() {
          resume(function() {
            assertEqual({ services: {} }, exported())
          })
        }, resume)
      }})
    }})

    describe("with stored global settings", function() { with(this) {
      before(function() { with(this) {
        stub(fileStore, "get").given("/global").returns(Promise.resolve({length: 5, space: 0}))
        stub(fileStore, "findRecursive").given("/services/").returns([])
      }})

      it("exports the global settings", function(resume) { with(this) {
        call(["--export", exportPath]).then(function() {
          resume(function() {
            assertEqual({
              global: {length: 5, space: 0},
              services: {}
            }, exported())
          })
        }, resume)
      }})
    }})

    describe("with stored service settings", function() { with(this) {
      before(function() { with(this) {
        stub(fileStore, "get").given("/global").returns(pnull)
        stub(fileStore, "findRecursive").given("/services/").returns(["foo", "bar/qux"])
        stub(fileStore, "get").given("/services/foo").returns(Promise.resolve({repeat: 3}))
        stub(fileStore, "get").given("/services/bar/qux").returns(Promise.resolve({space: 0}))
      }})

      it("exports the global settings", function(resume) { with(this) {
        call(["--export", exportPath]).then(function() {
          resume(function() {
            assertEqual({
              services: {
                "foo": {repeat: 3},
                "bar/qux": {space: 0}
              }
            }, exported())
          })
        }, resume)
      }})
    }})
  }})

  describe("importing", function() { with(this) {
    before(function() { with(this) {
      this.importPath = path.resolve(__dirname, "..", "__vault-import.json")
    }})

    after(function(resume) { with(this) {
      fs.unlink(importPath, resume)
    }})

    describe("with an unreadable config file", function() { with(this) {
      before(function() { with(this) {
        fs.writeFileSync(importPath, "")
        stub(fs, "readFileSync").raises(new Error("Missing file"))
      }})

      it("reports an error", function(resume) { with(this) {
        call(["--import", importPath]).catch(function(error) {
          resume(function() { assertEqual("Missing file", error.message) })
        })
      }})
    }})

    describe("with an invalid JSON file", function() { with(this) {
      before(function() { with(this) {
        fs.writeFileSync(importPath, "")
      }})

      it("reports an error", function(resume) { with(this) {
        call(["--import", importPath]).catch(function(error) {
          resume(function() { assertMatch(/JSON/, error.message) })
        })
      }})
    }})

    describe("with an empty config file", function() { with(this) {
      before(function() { with(this) {
        fs.writeFileSync(importPath, JSON.stringify({}))
      }})

      it("makes no changes to the store", function(resume) { with(this) {
        call(["--import", importPath]).then(resume, resume)
      }})
    }})

    describe("with a global setting", function() { with(this) {
      before(function() { with(this) {
        fs.writeFileSync(importPath, JSON.stringify({
          global: {length: 32}
        }))
      }})

      it("saves the global setting", function(resume) { with(this) {
        expect(fileStore, "put").given("/global", {length: 32}).returning(pnull)
        call(["--import", importPath]).then(resume, resume)
      }})
    }})

    describe("with service settings", function() { with(this) {
      before(function() { with(this) {
        fs.writeFileSync(importPath, JSON.stringify({
          services: {
            foo: {space: 0, symbol: 0},
            bar: {phrase: "hello"}
          }
        }))
      }})

      it("saves the service settings", function(resume) { with(this) {
        expect(fileStore, "put").given("/services/foo", {space: 0, symbol: 0}).returning(pnull)
        expect(fileStore, "put").given("/services/bar", {phrase: "hello"}).returning(pnull)
        call(["--import", importPath]).then(resume, resume)
      }})
    }})

    describe("with existing service settings", function() { with(this) {
      before(function() { with(this) {
        fs.writeFileSync(importPath, JSON.stringify({
          services: {
            foo: {space: 0, symbol: 0}
          }
        }))
        stub(fileStore, "get").given("/services/foo").returns(Promise.resolve({length: 4}))
      }})

      it("overwrites the existing settings", function(resume) { with(this) {
        expect(fileStore, "put").given("/services/foo", {space: 0, symbol: 0}).returning(pnull)
        call(["--import", importPath]).then(resume, resume)
      }})
    }})
  }})
}})
