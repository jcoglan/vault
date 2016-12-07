export VAULT_PATH=~+/.keychain
export VAULT_KEY=foo
export PATH=~+/bin:$PATH

alias vault="env vault"
alias inspect="rm -f export.json && vault -e export.json && cat export.json"
alias inspectdb="cat .keychain/.keys && ls -la .keychain"
alias cleandb="rm -rf .keychain"

. node/scripts/init
