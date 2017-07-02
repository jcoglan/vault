export VAULT_PATH=~+/.keychain
export VAULT_KEY=foo
export PATH=~+/bin:$PATH

alias vault="env vault"
alias inspect="node spec/inspector.js"
alias inspectdb="cat .keychain/.keys && ls -la .keychain"
alias cleandb="rm -rf .keychain"

. lib/cli/scripts/init
