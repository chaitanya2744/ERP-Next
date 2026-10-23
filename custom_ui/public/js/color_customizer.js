/**
 * color_customizer.js — Apple HIG Live Color Theme Customizer
 * Allows users / administrators to customize Primary, Accent, Background, Surface, and Text colors.
 * Live instant preview across Desk Icons, Form Tabs, Action Buttons, AI Hero Avatar & Voice Orb
 * Admin-level system persistence & cache clearing.
 */
(function () {
    "use strict";

    const STORAGE_KEY = "cu_color_scheme";
    const STYLE_TAG_ID = "cu-custom-colors-style";

    const DEFAULT_COLORS = {
        primary: "#006269",
        accent: "#00A3AD",
        bg: "#F5F5F7",
        surface: "#FFFFFF",
        text: "#1D1D1F"
    };

    const COLOR_DEFS = [
        {
            key: "primary",
            label: "Primary Brand Color",
            hint: "Desktop icons, Create/Save buttons, active form tabs, AI hero avatar & send button",
            defaultHex: "#006269"
        },
        {
            key: "accent",
            label: "Accent Color",
            hint: "Focus rings, badges, AI hero halo ring, subtle highlights, and voice orb glow",
            defaultHex: "#00A3AD"
        },
        {
            key: "bg",
            label: "Canvas Background",
            hint: "Desk layout canvas, page background, and AI chat background",
            defaultHex: "#F5F5F7"
        },
        {
            key: "surface",
            label: "Surface & Cards",
            hint: "Page header, form sections, modal cards, and AI chat bubbles",
            defaultHex: "#FFFFFF"
        },
        {
            key: "text",
            label: "Text Color",
            hint: "Form labels, card headings, and chat typography",
            defaultHex: "#1D1D1F"
        }
    ];

    /* ─── Color Math Helpers ─── */
    function hexToRgb(hex) {
        if (!hex || typeof hex !== "string") return { r: 0, g: 0, b: 0 };
        hex = hex.replace("#", "").trim();
        if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
        if (hex.length !== 6) return { r: 0, g: 0, b: 0 };
        const num = parseInt(hex, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    function rgbToHex(r, g, b) {
        const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
        return "#" + [r, g, b].map(x => clamp(x).toString(16).padStart(2, "0")).join("").toUpperCase();
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    function hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }

    function adjustLightness(hex, percent) {
        try {
            const { r, g, b } = hexToRgb(hex);
            const { h, s, l } = rgbToHsl(r, g, b);
            const newL = Math.max(0, Math.min(100, l + percent));
            const rgb = hslToRgb(h, s, newL);
            return rgbToHex(rgb.r, rgb.g, rgb.b);
        } catch (e) {
            return hex;
        }
    }

    function setLightness(hex, targetL) {
        try {
            const { r, g, b } = hexToRgb(hex);
            const { h, s } = rgbToHsl(r, g, b);
            const rgb = hslToRgb(h, s, targetL);
            return rgbToHex(rgb.r, rgb.g, rgb.b);
        } catch (e) {
            return hex;
        }
    }

    function normalizeHex(hex, fallback) {
        if (!hex || typeof hex !== "string") return fallback;
        hex = hex.trim();
        if (!hex.startsWith("#")) hex = "#" + hex;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex.toUpperCase();
        if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
            return ("#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]).toUpperCase();
        }
        return fallback;
    }

    /* ─── Desktop Icons Inliner (Enables Real-Time Live Color Changes) ─── */
    function inlineDesktopIcons() {
        const imgs = document.querySelectorAll(".desktop-icon img, .icon-container img, .sidebar-header img, .header-logo img, .dropdown-menu-item img, img.app-icon, img.logo, img[src*='desktop_icons']");
        imgs.forEach(async (img) => {
            if (img.dataset.inlined) return;
            img.dataset.inlined = "true";
            const src = img.getAttribute("src");
            if (!src || !src.includes(".svg")) return;
            try {
                const res = await fetch(src);
                if (!res.ok) return;
                const svgText = await res.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(svgText, "image/svg+xml");
                const svg = doc.querySelector("svg");
                if (svg) {
                    svg.setAttribute("class", (img.getAttribute("class") || "") + " cu-inlined-svg");
                    svg.style.width = "100%";
                    svg.style.height = "100%";
                    svg.style.display = "block";

                    const shapes = svg.querySelectorAll("path, rect, circle, polygon");
                    shapes.forEach((shape, idx) => {
                        const rawFill = (shape.getAttribute("fill") || "").toLowerCase().trim();
                        const rawStroke = (shape.getAttribute("stroke") || "").toLowerCase().trim();
                        const fillOpacity = shape.getAttribute("fill-opacity");

                        // White inner glyphs MUST remain crisp white
                        if (rawFill === "white" || rawFill === "#ffffff" || rawFill === "#fff") {
                            shape.setAttribute("fill", "#FFFFFF");
                            shape.setAttribute("class", "cu-icon-white");
                        } else if (fillOpacity) {
                            // Subtle background squircle with opacity
                            shape.setAttribute("fill", "var(--cu-primary)");
                            shape.setAttribute("class", "cu-icon-subtle-bg");
                        } else if (idx === 0) {
                            // Solid squircle background
                            shape.setAttribute("fill", "var(--cu-primary)");
                            shape.setAttribute("class", "cu-icon-bg");
                        } else {
                            // Colored inner glyph (e.g. accounting.svg)
                            shape.setAttribute("fill", "var(--cu-primary)");
                            shape.setAttribute("class", "cu-icon-glyph");
                        }

                        if (rawStroke === "white" || rawStroke === "#ffffff" || rawStroke === "#fff") {
                            shape.setAttribute("stroke", "#FFFFFF");
                            shape.setAttribute("class", (shape.getAttribute("class") || "") + " cu-icon-white-stroke");
                        } else if (rawStroke && rawStroke !== "none") {
                            shape.setAttribute("stroke", "var(--cu-primary)");
                            shape.setAttribute("class", (shape.getAttribute("class") || "") + " cu-icon-stroke");
                        }
                    });

                    img.replaceWith(svg);
                }
            } catch (e) {}
        });
    }

    /* ─── Apply Colors to DOM ─── */
    function applyColors(colors) {
        if (!colors) return;
        const primary = normalizeHex(colors.primary, DEFAULT_COLORS.primary);
        const accent = normalizeHex(colors.accent, DEFAULT_COLORS.accent);
        const bg = normalizeHex(colors.bg, DEFAULT_COLORS.bg);
        const surface = normalizeHex(colors.surface, DEFAULT_COLORS.surface);
        const text = normalizeHex(colors.text, DEFAULT_COLORS.text);

        const primaryRgb = hexToRgb(primary);
        const accentRgb = hexToRgb(accent);

        const primaryDk = adjustLightness(primary, -12);
        const primaryDarkest = adjustLightness(primary, -28);
        const primaryLt = adjustLightness(primary, 14);
        const accentLt = setLightness(accent, 93);
        const accentXlt = setLightness(accent, 97);
        const textSub = adjustLightness(text, 20);
        const textMuted = adjustLightness(text, 40);
        const textFaint = adjustLightness(text, 55);
        const surface2 = adjustLightness(surface, -4);

        const css = `
            :root,
            html,
            body,
            html.theme-apple,
            body.theme-apple,
            body.theme-v9,
            body.ai-assistant-page-active {
                /* Custom UI Core Tokens */
                --cu-primary: ${primary} !important;
                --cu-primary-rgb: ${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b} !important;
                --cu-primary-dk: ${primaryDk} !important;
                --cu-primary-lt: ${primaryLt} !important;
                --cu-accent: ${accent} !important;
                --cu-accent-rgb: ${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b} !important;
                --cu-accent-lt: ${accentLt} !important;
                --cu-accent-xlt: ${accentXlt} !important;
                --cu-bg: ${bg} !important;
                --cu-surface: ${surface} !important;
                --cu-surface-solid: ${surface} !important;
                --cu-surface-2: ${surface2} !important;
                --cu-text: ${text} !important;
                --cu-text-sub: ${textSub} !important;
                --cu-text-muted: ${textMuted} !important;
                --cu-text-faint: ${textFaint} !important;
                --primary: ${primary} !important;
                --brand-color: ${primary} !important;

                /* AI Chat Screen Variables */
                --pro-primary: ${primary} !important;
                --pro-primary-hover: ${primaryDk} !important;
                --pro-accent: ${accent} !important;
                --pro-surface: ${surface} !important;
                --pro-text-main: ${text} !important;
                --pro-text-muted: ${textMuted} !important;
                --chat-bg: ${bg} !important;
                --bubble-user: ${primary} !important;
                --bubble-user-text: #FFFFFF !important;
                --bubble-ai: ${surface} !important;
                --bubble-ai-text: ${text} !important;
                --send-btn: ${primary} !important;
                --send-btn-hover: ${primaryDk} !important;
                --input-focus: ${accent} !important;
            }

            /* ─── 1. Canvas & Background Overrides ─── */
            body,
            body.theme-apple,
            body.theme-apple #body,
            body.theme-apple .page-container,
            body.theme-apple .layout-main,
            body.theme-apple .layout-main-section,
            body.theme-apple .workspace-page,
            body.theme-v9,
            body.ai-assistant-page-active,
            body.ai-assistant-page-active #body,
            body.ai-assistant-page-active .ai-assistant-page-wrapper,
            body.ai-assistant-page-active #ai-chat-root {
                background: ${bg} !important;
                background-color: ${bg} !important;
            }

            /* ─── 2. Surface & Cards & Header Overrides ─── */
            body.theme-apple .page-head,
            body.theme-apple .layout-side-section,
            body.theme-apple .body-sidebar,
            body.theme-apple .desk-sidebar,
            body.theme-apple .widget,
            body.theme-apple .frappe-card,
            body.theme-apple .form-section,
            body.theme-apple .modal-content,
            body.theme-apple .chart-widget-box {
                background: ${surface} !important;
                background-color: ${surface} !important;
            }


            /* AI Chat Input - Zero weird borders/rings on click/focus */
            #chat-input,
            #chat-input:focus,
            #chat-input:focus-visible,
            #chat-input:active,
            body.theme-apple #chat-input,
            body.theme-apple #chat-input:focus,
            body.theme-apple #chat-input:focus-visible,
            body.theme-apple #chat-input:active {
                outline: none !important;
                border: none !important;
                box-shadow: none !important;
                -webkit-box-shadow: none !important;
            }

            #chat-input-wrap,
            #chat-input-wrap:focus,
            #chat-input-wrap:focus-within,
            #chat-input-wrap:focus-visible,
            body.theme-apple #chat-input-wrap,
            body.theme-apple #chat-input-wrap:focus,
            body.theme-apple #chat-input-wrap:focus-within,
            body.theme-apple #chat-input-wrap:focus-visible {
                outline: none !important;
            }

            #chat-input-wrap:focus-within,
            body.theme-apple #chat-input-wrap:focus-within {
                border-color: rgba(0, 0, 0, 0.12) !important;
                box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.08) !important;
            }

            [data-theme="dark"] #chat-input-wrap:focus-within,
            body.theme-apple.dark #chat-input-wrap:focus-within {
                border-color: rgba(255, 255, 255, 0.14) !important;
                box-shadow: 0 10px 32px rgba(0, 0, 0, 0.4) !important;
            }

            /* ─── 3. Desktop Icons & Folders (Apple HIG 68px Grid) ─── */
            body.theme-apple .desktop-wrapper > .icons-container > .icons > .desktop-icon,
            body.theme-v9 .desktop-wrapper > .icons-container > .icons > .desktop-icon,
            .desktop-icon:not(.in-folder):not(.folder-icon *) {
                gap: 8px !important;
                width: 120px !important;
                height: 120px !important;
                padding: 8px 6px !important;
            }

            /* Top-level Icon Containers (Apps & Folders) */
            body.theme-apple .desktop-wrapper > .icons-container > .icons > .desktop-icon > .icon-container,
            body.theme-apple .desktop-icon:not(.in-folder):not(.folder-icon *) > .icon-container,
            body.theme-v9 .desktop-wrapper > .icons-container > .icons > .desktop-icon > .icon-container,
            body.theme-v9 .desktop-icon:not(.in-folder):not(.folder-icon *) > .icon-container,
            .desktop-icon:not(.in-folder):not(.folder-icon *) > .icon-container {
                width: 68px !important;
                height: 68px !important;
                min-width: 68px !important;
                min-height: 68px !important;
                max-width: 68px !important;
                max-height: 68px !important;
                border-radius: 16px !important;
                box-shadow: 0 8px 22px -4px rgba(0, 0, 0, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.05) !important;
                transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease !important;
            }

            body.theme-apple .desktop-icon:not(.in-folder):not(.folder-icon *) > .icon-container:hover,
            body.theme-v9 .desktop-icon:not(.in-folder):not(.folder-icon *) > .icon-container:hover,
            .desktop-icon:not(.in-folder):not(.folder-icon *) > .icon-container:hover {
                transform: translateY(-4px) scale(1.06) !important;
                box-shadow: 0 14px 28px -4px rgba(0, 0, 0, 0.18), 0 4px 10px -2px rgba(0, 0, 0, 0.08) !important;
            }

            /* Single App Icons (non-folder) */
            body.theme-apple .desktop-icon:not(.in-folder):not(.folder-icon *) > .icon-container:not(.folder-icon),
            body.theme-v9 .desktop-icon:not(.in-folder):not(.folder-icon *) > .icon-container:not(.folder-icon),
            .desktop-icon:not(.in-folder):not(.folder-icon *) > .icon-container:not(.folder-icon) {
                padding: 0 !important;
                overflow: hidden !important;
            }

            body.theme-apple .desktop-icon:not(.in-folder):not(.folder-icon *) > .icon-container:not(.folder-icon) img,
            body.theme-apple .desktop-icon:not(.in-folder):not(.folder-icon *) > .icon-container:not(.folder-icon) svg,
            body.theme-v9 .desktop-icon:not(.in-folder):not(.folder-icon *) > .icon-container:not(.folder-icon) img,
            body.theme-v9 .desktop-icon:not(.in-folder):not(.folder-icon *) > .icon-container:not(.folder-icon) svg,
            .desktop-icon:not(.in-folder):not(.folder-icon *) > .icon-container:not(.folder-icon) img,
            .desktop-icon:not(.in-folder):not(.folder-icon *) > .icon-container:not(.folder-icon) svg,
            .modal-body .icons .desktop-icon .icon-container img,
            .modal-body .icons .desktop-icon .icon-container svg {
                width: 68px !important;
                height: 68px !important;
                min-width: 68px !important;
                min-height: 68px !important;
                max-width: 68px !important;
                max-height: 68px !important;
                border-radius: 16px !important;
                display: block !important;
            }

            /* Folder Container (e.g. Accounting) */
            body.theme-apple .desktop-icon > .icon-container.folder-icon,
            body.theme-v9 .desktop-icon > .icon-container.folder-icon,
            .desktop-icon > .icon-container.folder-icon {
                width: 68px !important;
                height: 68px !important;
                min-width: 68px !important;
                min-height: 68px !important;
                max-width: 68px !important;
                max-height: 68px !important;
                border-radius: 16px !important;
                background: rgba(255, 255, 255, 0.72) !important;
                backdrop-filter: blur(25px) saturate(190%) !important;
                -webkit-backdrop-filter: blur(25px) saturate(190%) !important;
                border: 1px solid rgba(255, 255, 255, 0.6) !important;
                box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.8) !important;
                padding: 0 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
            }

            /* Child Icons inside Folder Thumbnail Preview */
            body.theme-apple .folder-icon .icons,
            body.theme-v9 .folder-icon .icons,
            .folder-icon .icons {
                gap: 5px !important;
                display: grid !important;
                grid-template-columns: repeat(2, 20px) !important;
                grid-template-rows: repeat(2, 20px) !important;
                justify-content: center !important;
                align-content: center !important;
                width: 45px !important;
                height: 45px !important;
                margin: auto !important;
                padding: 0 !important;
                border: none !important;
            }

            body.theme-apple .folder-icon .desktop-icon,
            body.theme-apple .folder-icon .icons .desktop-icon,
            body.theme-v9 .folder-icon .desktop-icon,
            body.theme-v9 .folder-icon .icons .desktop-icon,
            .folder-icon .desktop-icon,
            .folder-icon .icons .desktop-icon {
                width: 20px !important;
                height: 20px !important;
                min-width: 20px !important;
                min-height: 20px !important;
                max-width: 20px !important;
                max-height: 20px !important;
                padding: 0 !important;
                margin: 0 !important;
                gap: 0 !important;
                border: none !important;
                box-shadow: none !important;
                transform: none !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }

            body.theme-apple .folder-icon .desktop-icon .icon-container,
            body.theme-apple .folder-icon .icons .desktop-icon .icon-container,
            body.theme-v9 .folder-icon .desktop-icon .icon-container,
            body.theme-v9 .folder-icon .icons .desktop-icon .icon-container,
            .folder-icon .desktop-icon .icon-container,
            .folder-icon .icons .desktop-icon .icon-container {
                width: 20px !important;
                height: 20px !important;
                min-width: 20px !important;
                min-height: 20px !important;
                max-width: 20px !important;
                max-height: 20px !important;
                padding: 0 !important;
                margin: 0 !important;
                border-radius: 5px !important;
                overflow: hidden !important;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12) !important;
                transform: none !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }

            body.theme-apple .folder-icon .desktop-icon .icon-container img,
            body.theme-apple .folder-icon .desktop-icon .icon-container svg,
            body.theme-apple .folder-icon .icons .desktop-icon .icon-container img,
            body.theme-apple .folder-icon .icons .desktop-icon .icon-container svg,
            body.theme-v9 .folder-icon .desktop-icon .icon-container img,
            body.theme-v9 .folder-icon .desktop-icon .icon-container svg,
            body.theme-v9 .folder-icon .icons .desktop-icon .icon-container img,
            body.theme-v9 .folder-icon .icons .desktop-icon .icon-container svg,
            .folder-icon .desktop-icon .icon-container img,
            .folder-icon .desktop-icon .icon-container svg,
            .folder-icon .icons .desktop-icon .icon-container img,
            .folder-icon .icons .desktop-icon .icon-container svg {
                width: 20px !important;
                height: 20px !important;
                min-width: 20px !important;
                min-height: 20px !important;
                max-width: 20px !important;
                max-height: 20px !important;
                border-radius: 5px !important;
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            .cu-inlined-svg path.cu-icon-bg,
            .cu-inlined-svg rect.cu-icon-bg {
                fill: ${primary} !important;
            }
            .cu-inlined-svg path.cu-icon-subtle-bg,
            .cu-inlined-svg rect.cu-icon-subtle-bg {
                fill: ${primary} !important;
            }
            .cu-inlined-svg path.cu-icon-glyph {
                fill: ${primary} !important;
            }
            .cu-inlined-svg path.cu-icon-white,
            .cu-inlined-svg [fill="#FFFFFF"],
            .cu-inlined-svg [fill="white"] {
                fill: #FFFFFF !important;
            }
            .cu-inlined-svg .cu-icon-stroke {
                stroke: ${primary} !important;
            }
            .cu-inlined-svg .cu-icon-white-stroke {
                stroke: #FFFFFF !important;
            }

            .sidebar-header .sidebar-item-icon:has(svg),
            .sidebar-header .sidebar-item-icon:has(img),
            .dropdown-menu-item .sidebar-item-icon:has(svg),
            .dropdown-menu-item .sidebar-item-icon:has(img) {
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
            }

            .sidebar-header .header-logo {
                width: 28px !important;
                height: 28px !important;
                border-radius: 8px !important;
                overflow: hidden !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }

            .dropdown-menu-item .sidebar-item-icon {
                width: 24px !important;
                height: 24px !important;
                border-radius: 6px !important;
                overflow: hidden !important;
            }

            .desktop-icon .icon-title,
            .desktop-icon,
            .icon-caption,
            .icon-title,
            body.theme-apple .desktop-icon .icon-title,
            body.theme-v9 .desktop-icon .icon-title {
                color: #1D1D1F !important;
                font-size: 13.5px !important;
                font-weight: 550 !important;
                letter-spacing: -0.012em !important;
                text-decoration: none !important;
                text-align: center !important;
                line-height: 1.3 !important;
            }

            /* ─── 4. Desk Top Navbar Overrides ─── */
            header.navbar-container,
            header.desktop-navbar,
            .desktop-navbar,
            .navbar-container,
            body.theme-apple .navbar {
                background: linear-gradient(180deg, ${primaryDarkest}F5 0%, ${primaryDk}EE 100%) !important;
                border-bottom: 1px solid ${accent}55 !important;
                box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.35) !important;
            }

            /* ─── 5. Action Buttons (Create, Save, Submit, Primary) ─── */
            body.theme-apple .primary-action,
            body.theme-apple .page-head .btn-primary,
            body.theme-apple .btn-primary,
            body.theme-apple button.btn-primary,
            body.theme-v9 .btn-primary,
            .btn-primary,
            .primary-action {
                background: linear-gradient(180deg, ${primaryLt} 0%, ${primary} 100%) !important;
                background-color: ${primary} !important;
                border: 1px solid ${primaryDk} !important;
                border-color: ${primaryDk} !important;
                color: #FFFFFF !important;
                box-shadow: 0 2px 8px ${primary}4D !important;
            }
            body.theme-apple .primary-action:hover,
            body.theme-apple .page-head .btn-primary:hover,
            body.theme-apple .btn-primary:hover,
            body.theme-apple button.btn-primary:hover {
                background: linear-gradient(180deg, ${primary} 0%, ${primaryDk} 100%) !important;
                background-color: ${primaryDk} !important;
                border-color: ${primaryDk} !important;
                box-shadow: 0 4px 12px ${primary}66 !important;
            }

            /* ─── 6. Form Tabs (Exploded Items, Production Item, etc.) ─── */
            body.theme-apple .form-tabs-list .nav-link.active,
            body.theme-v9 .form-tabs-list .nav-link.active,
            body.theme-apple .form-tabs .nav-link.active,
            body.theme-v9 .form-tabs .nav-link.active,
            .form-tabs-list .nav-link.active,
            .form-tabs .nav-link.active {
                background: linear-gradient(180deg, ${primaryLt} 0%, ${primary} 100%) !important;
                background-color: ${primary} !important;
                color: #FFFFFF !important;
                border-radius: 8px !important;
                box-shadow: 0 2px 8px ${primary}52, 0 1px 2px rgba(0, 0, 0, 0.04) !important;
            }
            body.theme-apple .form-tabs-list .nav-link:hover,
            body.theme-v9 .form-tabs-list .nav-link:hover,
            body.theme-apple .form-tabs .nav-link:hover {
                color: ${primary} !important;
            }

            /* ─── 7. Sidebar Active Navigation ─── */
            body.theme-apple .active-sidebar,
            body.theme-apple .standard-sidebar-item.selected,
            body.theme-apple .sidebar-item.selected,
            body.theme-v9 .active-sidebar {
                background: linear-gradient(135deg, ${primary} 0%, ${accent} 100%) !important;
                color: #FFFFFF !important;
            }
            body.theme-apple .active-sidebar .item-anchor,
            body.theme-apple .active-sidebar .sidebar-item-label,
            body.theme-apple .standard-sidebar-item.selected .sidebar-item-label {
                color: #FFFFFF !important;
            }
            body.theme-apple .active-sidebar .sidebar-item-icon svg,
            body.theme-apple .standard-sidebar-item.selected .sidebar-item-icon svg {
                color: #FFFFFF !important;
                fill: #FFFFFF !important;
                stroke: #FFFFFF !important;
            }

            /* ─── 8. Widgets & Badges ─── */
            body.theme-apple .shortcut-widget-box::before,
            body.theme-apple .widget.shortcut-widget-box::before {
                background: linear-gradient(180deg, ${accent} 0%, ${primary} 100%) !important;
            }
            body.theme-apple .number-widget-box::before {
                background: linear-gradient(90deg, ${accent} 0%, ${primary} 100%) !important;
            }
            body.theme-apple .number-widget-box .number {
                background: linear-gradient(135deg, ${primaryDk} 0%, ${primary} 50%, ${accent} 100%) !important;
                -webkit-background-clip: text !important;
                -webkit-text-fill-color: transparent !important;
            }
            body.theme-apple .badge-primary {
                background: ${primary} !important;
                color: #FFFFFF !important;
            }

            /* ─── 9. Selective Links & Accent Icons ─── */
            body.theme-apple a.text-primary,
            body.theme-apple .text-primary,
            body.theme-apple .sidebar-header .sidebar-item-icon svg {
                color: ${primary} !important;
            }

            /* ─── 10. AI Chat Screen Hero Avatar, Components & Prompt Cards ─── */
            .hero-avatar-core,
            #hero-avatar-core,
            body.ai-assistant-page-active .hero-avatar-core,
            body.ai-assistant-page-active #hero-avatar-core {
                background: radial-gradient(circle at 35% 28%, ${primaryLt} 0%, ${primary} 48%, ${primaryDarkest} 100%) !important;
                box-shadow: 
                    0 10px 26px -3px ${primary}73,
                    0 0 16px ${accent}59,
                    inset 0 1.5px 2px rgba(255, 255, 255, 0.85),
                    inset 0 -2px 3px rgba(0, 0, 0, 0.35) !important;
                border: 1.5px solid rgba(255, 255, 255, 0.5) !important;
                color: #FFFFFF !important;
            }

            .hero-avatar-core.bot-scanning,
            #hero-avatar-core.bot-scanning,
            body.ai-assistant-page-active .hero-avatar-core.bot-scanning {
                box-shadow: 0 0 32px ${accent}F0, inset 0 0 16px rgba(255, 255, 255, 0.8) !important;
            }

            .hero-avatar-halo,
            body.ai-assistant-page-active .hero-avatar-halo {
                background: conic-gradient(from 0deg, ${accentLt}, ${accent}, ${primaryLt}, ${primary}, ${accentLt}) !important;
                opacity: 0.85 !important;
            }

            .hero-avatar-ring,
            body.ai-assistant-page-active .hero-avatar-ring {
                border: 1.5px solid ${accent}80 !important;
            }

            .hero-ambient-glow,
            body.ai-assistant-page-active .hero-ambient-glow {
                background: radial-gradient(circle, ${primaryLt}50 0%, ${primary}20 40%, rgba(0, 0, 0, 0) 70%) !important;
            }

            .hero-status-ping,
            .hero-ping-wave,
            body.ai-assistant-page-active .hero-status-ping,
            body.ai-assistant-page-active .hero-ping-wave {
                background: ${accent} !important;
            }

            .welcome-headline,
            body.theme-apple .welcome-headline,
            .welcome-title,
            .hero-title,
            body.ai-assistant-page-active .welcome-headline,
            body.ai-assistant-page-active .welcome-title,
            body.ai-assistant-page-active .hero-title {
                background: linear-gradient(135deg, ${text} 15%, ${primary} 65%, ${accent} 100%) !important;
                -webkit-background-clip: text !important;
                -webkit-text-fill-color: transparent !important;
                background-clip: text !important;
            }

            .capability-seg.active {
                background: linear-gradient(90deg, ${accent} 0%, ${primary} 100%) !important;
            }

            .siri-vocal-tag,
            .capability-tag,
            #ai-capability-tag {
                color: ${primary} !important;
                background: ${accentLt} !important;
                border: 1px solid ${accent}66 !important;
            }

            .cap-tag-dot,
            .voice-wave-bars .v-bar,
            .capability-cursor {
                background: ${accent} !important;
            }

            .capability-avatar {
                background: linear-gradient(135deg, ${primaryLt} 0%, ${primary} 100%) !important;
                box-shadow: 0 2px 10px ${primary}59 !important;
            }

            .capability-shimmer-ring {
                background: linear-gradient(90deg, transparent 0%, ${accent}47 50%, transparent 100%) !important;
            }

            .welcome-capability-badge {
                border: 1px solid ${primary}29 !important;
                box-shadow: 0 4px 20px -2px ${primary}1A, 0 2px 6px rgba(0, 0, 0, 0.03) !important;
            }

            .welcome-capability-badge:hover {
                border-color: ${accent}8C !important;
                box-shadow: 0 8px 30px -4px ${primary}2E, 0 0 0 1px ${accent}4D !important;
            }

            /* AI Chat Header & User Items */
            body.theme-apple #chat-header .avatar,
            #chat-header .avatar {
                background: linear-gradient(180deg, ${primaryLt} 0%, ${primary} 100%) !important;
            }

            body.theme-apple #new-chat-btn,
            #new-chat-btn {
                background: linear-gradient(180deg, ${primaryLt} 0%, ${primary} 100%) !important;
                color: #FFFFFF !important;
            }
            body.theme-apple #new-chat-btn:hover,
            #new-chat-btn:hover {
                background: ${primaryDk} !important;
            }

            /* AI Chat Sidebar remains neutral Apple macOS style */
            body.theme-apple .session-item.active,
            .session-item.active {
                background: rgba(0, 0, 0, 0.06) !important;
                color: #1D1D1F !important;
                border-left: 3px solid ${primary} !important;
            }

            body.theme-apple .msg-row.user .msg-avatar,
            .msg-row.user .msg-avatar {
                background: linear-gradient(180deg, ${primaryLt} 0%, ${primary} 100%) !important;
            }

            body.theme-apple .msg-row.user .msg-bubble,
            .msg-row.user .msg-bubble,
            .chat-bubble-user {
                background: linear-gradient(180deg, ${primaryLt} 0%, ${primary} 100%) !important;
                color: #FFFFFF !important;
            }

            body.theme-apple #send-btn,
            #send-btn,
            #ai-send-btn,
            .ai-chat-send-btn,
            .pro-send-btn {
                background: linear-gradient(180deg, ${primaryLt} 0%, ${primary} 100%) !important;
                color: #FFFFFF !important;
            }
            body.theme-apple #send-btn:hover,
            #send-btn:hover,
            #ai-send-btn:hover,
            .ai-chat-send-btn:hover,
            .pro-send-btn:hover {
                background: ${primaryDk} !important;
            }

            /* Executive Prompt Tabs & Cards */
            .exec-card-module-tag {
                color: ${primary} !important;
                background: ${primary}14 !important;
            }
            .exec-card:hover {
                border-color: ${accent} !important;
                box-shadow: 0 6px 16px -2px ${primary}1F !important;
            }
            .exec-card .exec-action-btn.run {
                background: ${primary}14 !important;
                color: ${primary} !important;
                border: 1px solid ${primary}29 !important;
            }
            .exec-card .exec-action-btn.run:hover,
            .exec-card:hover .exec-action-btn.run {
                background: ${primary} !important;
                color: #FFFFFF !important;
                border-color: transparent !important;
                box-shadow: 0 2px 6px ${primary}40 !important;
            }
            .exec-card-prompt-preview {
                background: ${primary}0A !important;
                border: 1px solid ${primary}1F !important;
            }
            .exec-card:hover .exec-card-prompt-preview {
                background: ${accent}12 !important;
                border-color: ${accent}40 !important;
            }

            /* Executive Prompt Tabs & Buttons */
            .exec-tab-btn.active {
                background: linear-gradient(135deg, ${primaryLt} 0%, ${primary} 100%) !important;
                border-color: transparent !important;
                color: #FFFFFF !important;
                box-shadow: 0 3px 10px ${primary}40 !important;
            }
            .exec-action-btn.run {
                background: linear-gradient(135deg, ${primaryLt} 0%, ${primary} 100%) !important;
                color: #FFFFFF !important;
                box-shadow: 0 2px 6px ${primary}40 !important;
            }
            .exec-action-btn.run:hover {
                background: ${primaryDk} !important;
            }
            .exec-card:hover .exec-action-btn.run {
                background: ${primary} !important;
            }
            .prompt-text-placeholder {
                color: ${primary} !important;
                border: 1px dashed ${accent} !important;
                background: ${accentLt} !important;
            }

            /* Voice Controls */
            #mic-btn:hover,
            .voice-call-trigger-btn:hover {
                border-color: ${primary} !important;
                color: ${primary} !important;
                background: ${primary}1A !important;
            }
            .voice-lang-chip.active,
            .voice-btn-commit,
            .voice-lang-search-btn.active,
            .voice-lang-btn.active,
            .vbtn-send {
                background: linear-gradient(135deg, ${accent} 0%, ${primary} 100%) !important;
            }
            .voice-pip-btn.voice-pip-send {
                background: ${accent} !important;
            }

            /* Voice Orb */
            .voice-orb-glow {
                background: radial-gradient(circle, ${primaryLt}88 0%, rgba(0, 0, 0, 0) 70%) !important;
            }
            .voice-avatar-orb:not(.thinking):not(.speaking) .voice-orb-core,
            .voice-orb-core {
                background: linear-gradient(135deg, ${accent} 0%, ${primary} 45%, ${primaryDk} 100%) !important;
                box-shadow: 0 10px 30px ${primaryLt}66, inset 0 2px 4px rgba(255, 255, 255, 0.4) !important;
            }
        `;

        let styleTag = document.getElementById(STYLE_TAG_ID);
        if (!styleTag) {
            styleTag = document.createElement("style");
            styleTag.id = STYLE_TAG_ID;
            document.head.appendChild(styleTag);
        } else {
            // Re-append to head to ensure highest priority in stylesheet cascade order
            document.head.appendChild(styleTag);
        }
        styleTag.innerHTML = css;

        const root = document.documentElement;
        if (root) {
            root.style.setProperty("--cu-primary", primary);
            root.style.setProperty("--cu-primary-rgb", `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
            root.style.setProperty("--cu-primary-dk", primaryDk);
            root.style.setProperty("--cu-primary-lt", primaryLt);
            root.style.setProperty("--cu-accent", accent);
            root.style.setProperty("--cu-accent-rgb", `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
            root.style.setProperty("--cu-accent-lt", accentLt);
            root.style.setProperty("--cu-accent-xlt", accentXlt);
            root.style.setProperty("--cu-bg", bg);
            root.style.setProperty("--cu-surface", surface);
            root.style.setProperty("--cu-surface-solid", surface);
            root.style.setProperty("--cu-surface-2", surface2);
            root.style.setProperty("--cu-text", text);
            root.style.setProperty("--primary", primary);
            root.style.setProperty("--brand-color", primary);

            // AI chat variables
            root.style.setProperty("--pro-primary", primary);
            root.style.setProperty("--pro-primary-hover", primaryDk);
            root.style.setProperty("--pro-accent", accent);
            root.style.setProperty("--pro-surface", surface);
            root.style.setProperty("--chat-bg", bg);
            root.style.setProperty("--bubble-user", primary);
            root.style.setProperty("--send-btn", primary);
            root.style.setProperty("--send-btn-hover", primaryDk);
            root.style.setProperty("--input-focus", accent);
        }

        if (document.body) {
            document.body.style.setProperty("--cu-primary", primary);
            document.body.style.setProperty("--cu-primary-rgb", `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
            document.body.style.setProperty("--cu-accent", accent);
            document.body.style.setProperty("--cu-accent-rgb", `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
            document.body.style.setProperty("--pro-primary", primary);
            document.body.style.setProperty("--pro-accent", accent);
            document.body.style.setProperty("--pro-primary-hover", primaryDk);
            document.body.style.setProperty("--bubble-user", primary);
            document.body.style.setProperty("--send-btn", primary);
        }

        // Inline desktop icons so their colors update in real time
        inlineDesktopIcons();
    }

    function getSavedColors() {
        try {
            const local = localStorage.getItem(STORAGE_KEY);
            if (local) {
                const parsed = JSON.parse(local);
                if (parsed && typeof parsed === "object") return parsed;
            }
        } catch (e) {}

        if (window.frappe && frappe.boot && frappe.boot.custom_ui_theme_colors) {
            const bootColors = frappe.boot.custom_ui_theme_colors;
            if (typeof bootColors === "string") {
                try { return JSON.parse(bootColors); } catch(e) {}
            } else if (typeof bootColors === "object") {
                return bootColors;
            }
        }

        return { ...DEFAULT_COLORS };
    }

    try {
        const initial = getSavedColors();
        applyColors(initial);
    } catch (e) {}

    /* ─── Dialog Implementation ─── */
    function openColorCustomizerDialog() {
        const currentColors = { ...DEFAULT_COLORS, ...getSavedColors() };
        const tempColors = { ...currentColors };
        let isApplied = false;

        const isAdmin = Boolean(
            (window.frappe && frappe.session && frappe.session.user === "Administrator") ||
            (window.frappe && frappe.user_roles && frappe.user_roles.includes("System Manager"))
        );

        const d = new frappe.ui.Dialog({
            title: __("🎨 Theme Color Customizer"),
            size: "large"
        });

        const sphereStyle = (hex) => {
            const dark = adjustLightness(hex, -25);
            return `background: radial-gradient(circle at 35% 35%, #FFFFFF 0%, ${hex} 45%, ${dark} 100%);`;
        };

        let html = `
            <div class="cu-customizer-container" style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif;">
                <div class="cu-customizer-header" style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <div style="font-size: 15px; font-weight: 600; color: #1D1D1F;">Customize Application Colors</div>
                        <div style="font-size: 13px; color: #64748B; margin-top: 2px;">
                            Click any 3D color sphere, use the color selector, or edit hex codes. Updates reflect live across the entire system.
                        </div>
                    </div>
                    ${
                        isAdmin
                            ? `<span style="display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: rgba(0, 163, 173, 0.12); color: var(--cu-primary);">
                                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--cu-primary); margin-right: 6px;"></span>
                                Admin: Global Persistence
                               </span>`
                            : `<span style="font-size: 11px; color: #64748B;">Personal mode</span>`
                    }
                </div>

                <div class="cu-color-grid" style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px;">
        `;

        COLOR_DEFS.forEach((def) => {
            const hex = normalizeHex(tempColors[def.key], def.defaultHex);
            html += `
                <div class="cu-color-card" data-key="${def.key}" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    border-radius: 12px;
                    background: rgba(0,0,0,0.02);
                    border: 1px solid rgba(0,0,0,0.06);
                    transition: border-color 0.15s ease, background 0.15s ease;
                ">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <div class="cu-sphere-wrapper" style="
                            position: relative;
                            width: 44px;
                            height: 44px;
                            border-radius: 50%;
                            cursor: pointer;
                            overflow: hidden;
                            box-shadow: 0 4px 10px rgba(0,0,0,0.18), inset -2px -2px 6px rgba(0,0,0,0.3), inset 2px 2px 6px rgba(255,255,255,0.6);
                        " title="Click to choose ${def.label}">
                            <div class="cu-color-sphere" id="cu-sphere-${def.key}" style="
                                position: absolute;
                                inset: 0;
                                border-radius: 50%;
                                ${sphereStyle(hex)}
                                pointer-events: none;
                            "></div>
                            <input type="color" class="cu-native-picker" id="cu-picker-${def.key}" value="${hex}" style="
                                position: absolute;
                                top: -10px;
                                left: -10px;
                                width: 64px;
                                height: 64px;
                                opacity: 0.01;
                                cursor: pointer;
                                border: none;
                                padding: 0;
                                margin: 0;
                                z-index: 5;
                            " />
                        </div>
                        <div>
                            <div style="font-size: 14px; font-weight: 600; color: #1D1D1F;">${def.label}</div>
                            <div style="font-size: 12px; color: #64748B;">${def.hint}</div>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px;">
                        <!-- Color Selector Swatch before Hex Code -->
                        <div class="cu-swatch-box" style="
                            position: relative;
                            width: 36px;
                            height: 36px;
                            border-radius: 8px;
                            overflow: hidden;
                            border: 1.5px solid rgba(0,0,0,0.14);
                            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
                            cursor: pointer;
                            background: ${hex};
                        " id="cu-swatch-box-${def.key}" title="Click color selector">
                            <input type="color" class="cu-native-swatch" id="cu-swatch-${def.key}" value="${hex}" style="
                                position: absolute;
                                top: -8px;
                                left: -8px;
                                width: 52px;
                                height: 52px;
                                border: none;
                                padding: 0;
                                cursor: pointer;
                                opacity: 0.01;
                                z-index: 5;
                            " />
                        </div>

                        <!-- Hex Input -->
                        <input type="text" class="cu-hex-input" id="cu-hex-${def.key}" maxlength="7" value="${hex}" placeholder="#RRGGBB" style="
                            width: 96px;
                            padding: 7px 10px;
                            border-radius: 8px;
                            border: 1px solid rgba(0,0,0,0.15);
                            font-family: monospace;
                            font-size: 13px;
                            font-weight: 600;
                            text-transform: uppercase;
                            background: #ffffff;
                            color: #1D1D1F;
                            outline: none;
                            text-align: center;
                        " />
                    </div>
                </div>
            `;
        });

        html += `
                </div>

                <!-- Live Harmonizer Preview Strip -->
                <div style="
                    padding: 16px;
                    border-radius: 12px;
                    background: var(--cu-bg);
                    border: 1px solid rgba(0,0,0,0.08);
                    margin-bottom: 20px;
                ">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; margin-bottom: 10px;">
                        Live Palette Preview
                    </div>
                    <div id="cu-preview-card" style="
                        padding: 16px;
                        border-radius: 10px;
                        background: ${tempColors.surface};
                        border: 1px solid rgba(0,0,0,0.08);
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.04);
                    ">
                        <div>
                            <div id="cu-preview-heading" style="font-size: 14px; font-weight: 600; color: #1D1D1F;">
                                ERPNext Workspace & AI Copilot
                            </div>
                            <div id="cu-preview-desc" style="font-size: 12px; color: #64748B;">
                                Desktop Icons & Hero Avatar Theme
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span id="cu-preview-badge" style="
                                padding: 4px 10px;
                                border-radius: 16px;
                                font-size: 12px;
                                font-weight: 600;
                                background: ${setLightness(tempColors.accent, 93)};
                                color: ${tempColors.accent};
                            ">Active</span>
                            <button type="button" id="cu-preview-btn" style="
                                padding: 6px 14px;
                                border-radius: 8px;
                                font-size: 13px;
                                font-weight: 600;
                                border: none;
                                background: ${tempColors.primary};
                                color: #FFFFFF;
                                cursor: default;
                            ">Action Button</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        d.$body.html(html);

        function updateLiveComponents() {
            applyColors(tempColors);

            const card = d.$wrapper.find("#cu-preview-card").get(0);
            const heading = d.$wrapper.find("#cu-preview-heading").get(0);
            const desc = d.$wrapper.find("#cu-preview-desc").get(0);
            const badge = d.$wrapper.find("#cu-preview-badge").get(0);
            const btn = d.$wrapper.find("#cu-preview-btn").get(0);

            if (card) card.style.background = tempColors.surface;
            if (heading) heading.style.color = "#1D1D1F";
            if (desc) desc.style.color = "#64748B";
            if (badge) {
                badge.style.background = setLightness(tempColors.accent, 93);
                badge.style.color = tempColors.accent;
            }
            if (btn) btn.style.background = tempColors.primary;

            COLOR_DEFS.forEach((def) => {
                const currentHex = normalizeHex(tempColors[def.key], def.defaultHex);
                const sph = d.$wrapper.find(`#cu-sphere-${def.key}`).get(0);
                if (sph) {
                    sph.style.background = `radial-gradient(circle at 35% 35%, #FFFFFF 0%, ${currentHex} 45%, ${adjustLightness(currentHex, -25)} 100%)`;
                }
                const swatchBox = d.$wrapper.find(`#cu-swatch-box-${def.key}`).get(0);
                if (swatchBox) {
                    swatchBox.style.background = currentHex;
                }
            });
        }

        // Mount dialog DOM
        d.show();

        // Bind interactive listeners directly within d.$wrapper
        COLOR_DEFS.forEach((def) => {
            const picker = d.$wrapper.find(`#cu-picker-${def.key}`).get(0);
            const swatch = d.$wrapper.find(`#cu-swatch-${def.key}`).get(0);
            const hexInput = d.$wrapper.find(`#cu-hex-${def.key}`).get(0);

            const onColorSelected = function (val) {
                val = val.toUpperCase();
                tempColors[def.key] = val;
                if (hexInput) hexInput.value = val;
                if (picker) picker.value = val;
                if (swatch) swatch.value = val;
                updateLiveComponents();
            };

            if (picker) {
                picker.addEventListener("input", (e) => onColorSelected(e.target.value));
                picker.addEventListener("change", (e) => onColorSelected(e.target.value));
            }

            if (swatch) {
                swatch.addEventListener("input", (e) => onColorSelected(e.target.value));
                swatch.addEventListener("change", (e) => onColorSelected(e.target.value));
            }

            if (hexInput) {
                const handleHexInput = function () {
                    let raw = hexInput.value.trim();
                    if (!raw) return;
                    if (!raw.startsWith("#")) raw = "#" + raw;
                    if (/^#[0-9A-Fa-f]{6}$/.test(raw)) {
                        const fullHex = raw.toUpperCase();
                        tempColors[def.key] = fullHex;
                        if (picker) picker.value = fullHex;
                        if (swatch) swatch.value = fullHex;
                        updateLiveComponents();
                    } else if (/^#[0-9A-Fa-f]{3}$/.test(raw)) {
                        const fullHex = ("#" + raw[1] + raw[1] + raw[2] + raw[2] + raw[3] + raw[3]).toUpperCase();
                        tempColors[def.key] = fullHex;
                        if (picker) picker.value = fullHex;
                        if (swatch) swatch.value = fullHex;
                        updateLiveComponents();
                    }
                };

                hexInput.addEventListener("input", handleHexInput);
                hexInput.addEventListener("change", handleHexInput);
                hexInput.addEventListener("keyup", handleHexInput);
                hexInput.addEventListener("paste", function () {
                    setTimeout(handleHexInput, 20);
                });

                hexInput.addEventListener("blur", function () {
                    let raw = hexInput.value.trim();
                    if (!raw.startsWith("#")) raw = "#" + raw;
                    if (/^#[0-9A-Fa-f]{6}$/.test(raw)) {
                        hexInput.value = raw.toUpperCase();
                    } else if (/^#[0-9A-Fa-f]{3}$/.test(raw)) {
                        hexInput.value = ("#" + raw[1] + raw[1] + raw[2] + raw[2] + raw[3] + raw[3]).toUpperCase();
                    } else {
                        hexInput.value = tempColors[def.key];
                    }
                });
            }
        });

        // Setup Secondary Action (Reset Defaults)
        d.set_secondary_action(function () {
            Object.assign(tempColors, DEFAULT_COLORS);
            COLOR_DEFS.forEach((def) => {
                const picker = d.$wrapper.find(`#cu-picker-${def.key}`).get(0);
                const swatch = d.$wrapper.find(`#cu-swatch-${def.key}`).get(0);
                const hexInput = d.$wrapper.find(`#cu-hex-${def.key}`).get(0);
                if (picker) picker.value = DEFAULT_COLORS[def.key];
                if (swatch) swatch.value = DEFAULT_COLORS[def.key];
                if (hexInput) hexInput.value = DEFAULT_COLORS[def.key];
            });
            updateLiveComponents();
            frappe.show_alert({ message: __("Reset to default Apple Teal palette"), indicator: "blue" });
        });
        d.get_secondary_btn().html(__("Reset Defaults"));

        // Setup Primary Action (Apply & Save)
        d.footer.removeClass("hide");
        const primaryBtn = d.get_primary_btn().removeClass("hide").html(__("Apply & Save"));
        primaryBtn.off("click").on("click", function () {
            // Read active values directly from input fields
            COLOR_DEFS.forEach((def) => {
                const hexVal = d.$wrapper.find(`#cu-hex-${def.key}`).val();
                const swatchVal = d.$wrapper.find(`#cu-swatch-${def.key}`).val();
                const pickerVal = d.$wrapper.find(`#cu-picker-${def.key}`).val();
                const val = (hexVal || swatchVal || pickerVal || tempColors[def.key] || def.defaultHex).trim();
                tempColors[def.key] = normalizeHex(val, def.defaultHex);
            });

            isApplied = true;
            applyColors(tempColors);

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(tempColors));
            } catch (e) {}

            if (isAdmin) {
                frappe.call({
                    method: "custom_ui.custom_ui.api.save_theme_colors",
                    args: {
                        colors: JSON.stringify(tempColors)
                    },
                    freeze: true,
                    freeze_message: __("Updating global theme colors and clearing cache..."),
                    callback: function (r) {
                        if (r && r.message && r.message.status === "success") {
                            frappe.show_alert({
                                message: __("Theme colors updated globally & cache cleared!"),
                                indicator: "green"
                            }, 5);
                        }
                    }
                });
            } else {
                frappe.show_alert({
                    message: __("Colors applied locally to your browser!"),
                    indicator: "green"
                });
            }

            d.hide();
        });

        d.$wrapper.on("hidden.bs.modal", function () {
            if (!isApplied) {
                const saved = getSavedColors();
                applyColors(saved);
            }
        });
    }

    /* ─── Single Authoritative Dropdown Menu Hook ─── */
    try {
        if (window.frappe && frappe.boot && frappe.boot.navbar_settings && Array.isArray(frappe.boot.navbar_settings.settings_dropdown)) {
            frappe.boot.navbar_settings.settings_dropdown = frappe.boot.navbar_settings.settings_dropdown.filter(i => !/customize.*color/i.test(i.item_label || i.label || ""));
        }
    } catch (e) {}

    try {
        if (window.frappe && frappe.desktop && Array.isArray(frappe.desktop.desktop_menu_items)) {
            frappe.desktop.desktop_menu_items = frappe.desktop.desktop_menu_items.filter(i => !/customize.*color/i.test(i.label || ""));
        }
    } catch (e) {}

    if (window.frappe && frappe.ui && frappe.ui.menu && frappe.ui.menu.prototype) {
        if (!frappe.ui.menu.prototype._cu_color_patched) {
            frappe.ui.menu.prototype._cu_color_patched = true;
            const origMake = frappe.ui.menu.prototype.make;
            frappe.ui.menu.prototype.make = function () {
                try {
                    if (Array.isArray(this.menu_items)) {
                        const isColorItem = (m) => m && (/customize.*color/i.test(m.label || m.name || m.item_label || ""));
                        const cleanItems = this.menu_items.filter(m => !isColorItem(m));

                        const hasLogout = cleanItems.some(m => m && (/logout/i.test(m.label || m.name || "")));
                        if (hasLogout) {
                            const logoutIdx = cleanItems.findIndex(m => m && (/logout/i.test(m.label || m.name || "")));
                            const customItem = {
                                name: "customize-colors",
                                label: __("Customize Colors"),
                                icon: "palette",
                                onClick: function () {
                                    openColorCustomizerDialog();
                                }
                            };
                            if (logoutIdx !== -1) {
                                cleanItems.splice(logoutIdx, 0, customItem);
                            } else {
                                cleanItems.push(customItem);
                            }
                            this.menu_items = cleanItems;
                        }
                    }
                } catch (err) {}
                return origMake.apply(this, arguments);
            };
        }
    }

    // Keep styles at the bottom of <head> and re-apply on page changes
    function reapplyOnRouteChange() {
        const styleTag = document.getElementById(STYLE_TAG_ID);
        if (styleTag && styleTag.parentNode && document.head.lastElementChild !== styleTag) {
            document.head.appendChild(styleTag);
        }
        applyColors(getSavedColors());
        inlineDesktopIcons();
    }

    if (window.MutationObserver && document.head) {
        const headObserver = new MutationObserver(function () {
            const styleTag = document.getElementById(STYLE_TAG_ID);
            if (styleTag && document.head.lastElementChild !== styleTag) {
                document.head.appendChild(styleTag);
            }
        });
        headObserver.observe(document.head, { childList: true });
    }

    document.addEventListener("DOMContentLoaded", reapplyOnRouteChange);
    document.addEventListener("page-change", reapplyOnRouteChange);
    if (window.frappe && frappe.router) {
        frappe.router.on("change", function () {
            reapplyOnRouteChange();
            setTimeout(reapplyOnRouteChange, 60);
            setTimeout(reapplyOnRouteChange, 250);
            setTimeout(reapplyOnRouteChange, 750);
        });
    }

    setInterval(inlineDesktopIcons, 600);

    window.openColorCustomizerDialog = openColorCustomizerDialog;
})();
