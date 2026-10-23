app_name = "custom_ui"
app_title = "Custom UI PRO"
app_publisher = "Grutika"
app_description = "Custom UI"
app_email = "grutika@example.com"
app_license = "mit"

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = [
    "/assets/custom_ui/css/minimal_desk_v9.css?v=top_zindex_modal_v72"
]
app_include_js = [
    "/assets/custom_ui/js/breadcrumb_chevron_fix.js",
    "/assets/custom_ui/js/ai/executive_prompts.js",
    "/assets/custom_ui/js/ai_navigation.js",
    "/assets/custom_ui/js/color_customizer.js?v=cu_color_v28",
    "/assets/custom_ui/js/theme_toggle.js?v=top_zindex_modal_v72"
]

# include js, css files in header of web template
web_include_css = ["/assets/custom_ui/css/minimal_desk_v9.css"]
web_include_js = ["/assets/custom_ui/js/color_customizer.js?v=cu_color_v28"]

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "custom_ui/public/scss/website"

fixtures = ["Client Script", "AI Model Rate"]

extend_bootinfo = [
    "custom_ui.custom_ui.api.add_theme_colors_to_bootinfo"
]

scheduler_events = {
    "daily": [
        "custom_ui.custom_ui.ai_chat.budget.sync_exchange_rate"
    ]
}