# Custom UI Frappe Contract

Bench: `/home/chaitanya/frappe/frappe-bench`

Site used for validation: `mfg.clicentrix.com`

## Stable integration points

- Keep `app_include_css`, `app_include_js`, `web_include_css`, fixtures, and scheduler paths in `custom_ui/hooks.py` valid.
- Keep the whitelisted methods `custom_ui.custom_ui.api.chat`, `custom_ui.custom_ui.api.get_wallet_summary`, and `custom_ui.custom_ui.api.estimate_tokens_and_cost` at their current dotted paths.
- Keep `custom_ui.custom_ui.ai_chat.budget.recharge_wallet` and `custom_ui.custom_ui.ai_chat.budget.sync_exchange_rate` available at their current paths.
- Keep `frappe.pages["ai"]` lifecycle handlers and all `frappe.call` method paths stable while splitting the AI page JavaScript.
- Keep current API response keys and permission behavior stable.

## Validation commands

Run from the bench root:

```bash
env/bin/python -m compileall apps/custom_ui/custom_ui
source ~/.nvm/nvm.sh && bench build --app custom_ui
bench --site mfg.clicentrix.com clear-cache
```

Automated site tests are disabled in the current site configuration. Use focused bench execution and a manual AI page/wallet smoke check unless tests are explicitly enabled.
