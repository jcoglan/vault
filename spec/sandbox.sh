export VAULT_PATH=~+/.keychain
export VAULT_KEY=foo
export PATH=~+/bin:$PATH

alias inspect="node spec/inspector.js"
alias inspectdb="tree -a .keychain && cat .keychain/config"
alias cleandb="rm -rf .keychain"

. lib/cli/scripts/init
