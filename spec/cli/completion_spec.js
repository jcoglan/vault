var jstest    = require("jstest").Test,
    Promise   = require("storeroom").Promise,
    CliHelper = require("./helper")

jstest.describe("CLI completion", function() { with(this) {
  include(CliHelper)

  before(function() { with(this) {
    stub(fileStore, "get").given("/sources/default").returns(Promise.resolve(null))
  }})

  it("completes option names", function(resume) { with(this) {
    expect(stdout, "write").given(["--notes", "--number"].join("\n"))
    call(["--cmplt", "--n"]).then(resume, resume)
  }})

  describe("service names", function() { with(this) {
    before(function() { with(this) {
      stub(fileStore, "entries").given("/services/").returns(Promise.resolve([
        "acme/",
        "bar",
        "bee",
        "queue",
        "zzz",
        "zzz/"
      ]))
      stub(fileStore, "entries").given("/services/acme/").returns(Promise.resolve([
        "password",
        "username"
      ]))
      stub(fileStore, "entries").given("/services/zzz/").returns(Promise.resolve([
        "hello/"
      ]))
      stub(fileStore, "entries").given("/services/zzz/hello/").returns(Promise.resolve([
        "world"
      ]))
      stub(fileStore, "entries").given("/sources/sessions/").returns(Promise.resolve([]))
    }})

    it("completes a simple service name", function(resume) { with(this) {
      expect(stdout, "write").given(["bar", "bee"].join("\n"))
      call(["--cmplt", "b"]).then(resume, resume)
    }})

    it("completes the base of a namespaced service", function(resume) { with(this) {
      expect(stdout, "write").given(["acme/"].join("\n"))
      call(["--cmplt", "ac"]).then(resume, resume)
    }})

    it("completes the children of a namespace", function(resume) { with(this) {
      expect(stdout, "write").given(["acme/password", "acme/username"].join("\n"))
      call(["--cmplt", "acme/"]).then(resume, resume)
    }})

    it("completes a namespaced service", function(resume) { with(this) {
      expect(stdout, "write").given(["acme/username"].join("\n"))
      call(["--cmplt", "acme/u"]).then(resume, resume)
    }})

    it("completes a word that is both a service and namespace", function(resume) { with(this) {
      expect(stdout, "write").given(["zzz", "zzz/"].join("\n"))
      call(["--cmplt", "z"]).then(resume, resume)
    }})

    it("completes a word following a namespace", function(resume) { with(this) {
      expect(stdout, "write").given(["zzz/hello/"].join("\n"))
      call(["--cmplt", "zzz/"]).then(resume, resume)
    }})

    it("completes a multiply-namespaced service", function(resume) { with(this) {
      expect(stdout, "write").given(["zzz/hello/world"].join("\n"))
      call(["--cmplt", "zzz/hello/w"]).then(resume, resume)
    }})
  }})
}})
