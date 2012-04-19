require('jsclass')
JS.require('JS.Test')

JS.ENV.Vault = require('../lib/vault')

require('./vault_spec')
require('./config_spec')
JS.Test.autorun()

