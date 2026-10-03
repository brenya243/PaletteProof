(() => {
    const state = {
        colors: [],
        theme: null,
        selectedText: "#ffffff",
        selectedBg: "#0f172a"
    };

    const els = {
        dropzone: document.getElementById("dropzone"),
        fileInput: document.getElementById("fileInput"),
        previewWrap: document.getElementById("previewWrap"),
        preview: document.getElementById("preview"),
        results: document.getElementById("results"),
        dominantPalette: document.getElementById("dominantPalette"),
        themePalette: document.getElementById("themePalette"),
        textColor: document.getElementById("textColor"),
        bgColor: document.getElementById("bgColor"),
        swapColors: document.getElementById("swapColors"),
        autoText: document.getElementById("autoText"),
        previewText: document.getElementById("previewText"),
        contrastResult: document.getElementById("contrastResult"),
        cssOutput: document.getElementById("cssOutput"),
        tailwindOutput: document.getElementById("tailwindOutput"),
        copyCss: document.getElementById("copyCss"),
        copyTailwind: document.getElementById("copyTailwind"),
        copyShare: document.getElementById("copyShare")
    };

    function init() {
        bindEvents();
        loadFromHash();

        if (state.colors.length) {
            renderAll();
        }
    }

    function bindEvents() {
        els.dropzone.addEventListener("click", () => els.fileInput.click());

        els.dropzone.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                els.fileInput.click();
            }
        });

        ["dragenter", "dragover"].forEach(eventName => {
            els.dropzone.addEventListener(eventName, event => {
                event.preventDefault();
                els.dropzone.classList.add("dragover");
            });
        });

        ["dragleave", "drop"].forEach(eventName => {
            els.dropzone.addEventListener(eventName, event => {
                event.preventDefault();
                els.dropzone.classList.remove("dragover");
            });
        });

        els.dropzone.addEventListener("drop", event => {
            const file = event.dataTransfer?.files?.[0];
            handleFile(file);
        });

        els.fileInput.addEventListener("change", event => {
            const file = event.target.files?.[0];
            event.target.value = "";
            handleFile(file);
        });

        els.textColor.addEventListener("change", event =>
            setTextColor(event.target.value)
        );
        els.bgColor.addEventListener("change", event =>
            setBackground(event.target.value)
        );
        els.swapColors.addEventListener("click", swapColors);
        els.autoText.addEventListener("click", () =>
            setTextColor(bestTextColor(state.selectedBg))
        );

        els.copyCss.addEventListener("click", async () => {
            await copyText(generateCssVars(), "Variables CSS copiées.");
        });

        els.copyTailwind.addEventListener("click", async () => {
            await copyText(
                generateTailwindConfig(),
                "Configuration Tailwind copiée."
            );
        });

        els.copyShare.addEventListener("click", async () => {
            updateHash();
            await copyText(window.location.href, "Lien de partage copié.");
        });

        window.addEventListener("hashchange", loadFromHash);
    }

    function handleFile(file) {
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showToast("Veuillez importer un fichier image valide.");
            return;
        }

        const reader = new FileReader();

        reader.onload = event => {
            els.preview.src = event.target.result;
            els.previewWrap.hidden = false;

            const image = new Image();
            image.onload = () => processImage(image);
            image.onerror = () =>
                showToast("Impossible de lire l'image importée.");
            image.src = event.target.result;
        };

        reader.onerror = () => showToast("Impossible de lire le fichier.");
        reader.readAsDataURL(file);
    }

    function processImage(image) {
        try {
            const canvas = document.createElement("canvas");
            const maxDim = 240;

            const width = image.naturalWidth || image.width;
            const height = image.naturalHeight || image.height;
            const scale = Math.min(1, maxDim / Math.max(width, height));

            canvas.width = Math.max(1, Math.round(width * scale));
            canvas.height = Math.max(1, Math.round(height * scale));

            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

            const data = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
            ).data;
            const pixels = [];

            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];
                if (alpha < 125) continue;

                pixels.push([data[i], data[i + 1], data[i + 2]]);
            }

            if (!pixels.length) {
                showToast("Aucune couleur exploitable n'a été trouvée.");
                return;
            }

            const extracted = medianCut(pixels, 6);
            const unique = uniqueColors(extracted);

            state.colors = unique.map(rgbToHex);
            state.theme = generateTheme(state.colors[0], state.colors[1]);
            state.selectedBg = state.colors[0];
            state.selectedText = bestTextColor(state.selectedBg);

            renderAll();
            updateHash();
            els.results.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (error) {
            console.error(error);
            showToast("Une erreur est survenue pendant l'analyse de l'image.");
        }
    }

    function renderAll() {
        els.results.hidden = false;
        renderDominantPalette();
        renderThemePalette();
        populateSelects();
        updateContrast();
        updateExports();
    }

    function renderDominantPalette() {
        els.dominantPalette.innerHTML = "";

        state.colors.forEach((hex, index) => {
            els.dominantPalette.appendChild(
                createSwatch(hex, `Dominante ${index + 1}`, true)
            );
        });
    }

    function renderThemePalette() {
        els.themePalette.innerHTML = "";

        if (!state.theme) return;

        const groups = [
            {
                title: "Palette de base",
                items: [
                    ["Primaire", state.theme.primary],
                    ["Primaire sombre", state.theme.primaryDark],
                    ["Primaire clair", state.theme.primaryLight],
                    ["Accent", state.theme.accent]
                ]
            },
            {
                title: "Mode clair",
                items: [
                    ["Fond", state.theme.light.bg],
                    ["Surface", state.theme.light.surface],
                    ["Texte", state.theme.light.text],
                    ["Texte secondaire", state.theme.light.muted]
                ]
            },
            {
                title: "Mode sombre",
                items: [
                    ["Fond", state.theme.dark.bg],
                    ["Surface", state.theme.dark.surface],
                    ["Texte", state.theme.dark.text],
                    ["Texte secondaire", state.theme.dark.muted]
                ]
            }
        ];

        groups.forEach(group => {
            const section = document.createElement("section");
            section.className = "theme-group";

            const heading = document.createElement("h3");
            heading.textContent = group.title;

            const grid = document.createElement("div");
            grid.className = "palette-grid";

            group.items.forEach(([label, hex]) => {
                grid.appendChild(createSwatch(hex, label, true));
            });

            section.append(heading, grid);
            els.themePalette.appendChild(section);
        });
    }

    function createSwatch(hex, label, showBadges) {
        const article = document.createElement("article");
        article.className = "swatch";

        const color = document.createElement("div");
        color.className = "swatch-color";
        color.style.backgroundColor = hex;
        color.style.color = bestTextColor(hex);

        const title = document.createElement("span");
        title.textContent = label;

        const value = document.createElement("strong");
        value.textContent = hex.toUpperCase();

        color.append(title, value);

        const meta = document.createElement("div");
        meta.className = "swatch-meta";

        if (showBadges) {
            const badges = document.createElement("div");
            badges.className = "badges";

            const whiteRatio = contrastRatio(hex, "#ffffff");
            const blackRatio = contrastRatio(hex, "#000000");

            badges.append(
                createBadge(
                    `Blanc ${whiteRatio.toFixed(2)}`,
                    whiteRatio >= 4.5
                ),
                createBadge(`Noir ${blackRatio.toFixed(2)}`, blackRatio >= 4.5)
            );

            meta.appendChild(badges);
        }

        const actions = document.createElement("div");
        actions.className = "swatch-actions";

        const backgroundButton = document.createElement("button");
        backgroundButton.type = "button";
        backgroundButton.textContent = "Fond";
        backgroundButton.addEventListener("click", () => setBackground(hex));

        const textButton = document.createElement("button");
        textButton.type = "button";
        textButton.textContent = "Texte";
        textButton.addEventListener("click", () => setTextColor(hex));

        actions.append(backgroundButton, textButton);
        meta.appendChild(actions);
        article.append(color, meta);

        return article;
    }

    function createBadge(text, pass) {
        const badge = document.createElement("span");
        badge.className = `badge ${pass ? "pass" : "fail"}`;
        badge.textContent = text;
        return badge;
    }

    function populateSelects() {
        const options = [];

        state.colors.forEach((hex, index) => {
            options.push({
                group: "Dominantes",
                label: `Dominante ${index + 1}`,
                value: hex
            });
        });

        if (state.theme) {
            const themeItems = [
                ["Primaire", state.theme.primary],
                ["Primaire sombre", state.theme.primaryDark],
                ["Primaire clair", state.theme.primaryLight],
                ["Accent", state.theme.accent],
                ["Fond clair", state.theme.light.bg],
                ["Surface claire", state.theme.light.surface],
                ["Texte clair", state.theme.light.text],
                ["Texte clair secondaire", state.theme.light.muted],
                ["Fond sombre", state.theme.dark.bg],
                ["Surface sombre", state.theme.dark.surface],
                ["Texte sombre", state.theme.dark.text],
                ["Texte sombre secondaire", state.theme.dark.muted]
            ];

            themeItems.forEach(([label, value]) => {
                options.push({
                    group: "Thème généré",
                    label,
                    value
                });
            });
        }

        const uniqueOptions = [];
        const seen = new Set();

        options.forEach(option => {
            if (!isValidHex(option.value)) return;

            const key = option.value.toLowerCase();

            if (!seen.has(key)) {
                seen.add(key);
                uniqueOptions.push({
                    ...option,
                    value: key
                });
            }
        });

        fillSelect(els.textColor, uniqueOptions);
        fillSelect(els.bgColor, uniqueOptions);

        ensureSelectOption(els.textColor, state.selectedText);
        ensureSelectOption(els.bgColor, state.selectedBg);

        els.textColor.value = state.selectedText.toLowerCase();
        els.bgColor.value = state.selectedBg.toLowerCase();
    }

    function fillSelect(select, options) {
        select.innerHTML = "";

        options.forEach(option => {
            const element = document.createElement("option");
            element.value = option.value;
            element.textContent = `${option.group} : ${option.label} — ${option.value.toUpperCase()}`;
            select.appendChild(element);
        });
    }

    function ensureSelectOption(select, value) {
        if (!isValidHex(value)) return;

        const normalized = value.toLowerCase();

        const exists = Array.from(select.options).some(
            option => option.value === normalized
        );

        if (!exists) {
            const option = document.createElement("option");
            option.value = normalized;
            option.textContent = `Personnalisé — ${normalized.toUpperCase()}`;
            select.appendChild(option);
        }
    }

    function setBackground(hex) {
        if (!isValidHex(hex)) return;

        state.selectedBg = hex.toLowerCase();
        ensureSelectOption(els.bgColor, state.selectedBg);
        els.bgColor.value = state.selectedBg;

        updateContrast();
        updateHash();
    }

    function setTextColor(hex) {
        if (!isValidHex(hex)) return;

        state.selectedText = hex.toLowerCase();
        ensureSelectOption(els.textColor, state.selectedText);
        els.textColor.value = state.selectedText;

        updateContrast();
        updateHash();
    }

    function swapColors() {
        const previousText = state.selectedText;

        state.selectedText = state.selectedBg;
        state.selectedBg = previousText;

        ensureSelectOption(els.textColor, state.selectedText);
        ensureSelectOption(els.bgColor, state.selectedBg);

        els.textColor.value = state.selectedText;
        els.bgColor.value = state.selectedBg;

        updateContrast();
        updateHash();
    }

    function updateContrast() {
        if (!isValidHex(state.selectedText)) state.selectedText = "#ffffff";
        if (!isValidHex(state.selectedBg)) state.selectedBg = "#000000";

        const ratio = contrastRatio(state.selectedText, state.selectedBg);

        els.previewText.innerHTML = "";
        els.previewText.style.backgroundColor = state.selectedBg;
        els.previewText.style.color = state.selectedText;

        const title = document.createElement("p");
        title.className = "large";
        title.textContent = "Titre large — PaletteProof";

        const paragraph = document.createElement("p");
        paragraph.textContent =
            "Texte normal : vérification du contraste WCAG pour BS3 Digital.";

        els.previewText.append(title, paragraph);

        const levels = [
            { label: "AA normal", pass: ratio >= 4.5 },
            { label: "AAA normal", pass: ratio >= 7 },
            { label: "AA large", pass: ratio >= 3 },
            { label: "AAA large", pass: ratio >= 4.5 }
        ];

        els.contrastResult.innerHTML = "";

        const ratioElement = document.createElement("div");
        ratioElement.className = "ratio";
        ratioElement.textContent = `${ratio.toFixed(2)}:1`;

        const badges = document.createElement("div");
        badges.className = "badges";

        levels.forEach(level =>
            badges.appendChild(createBadge(level.label, level.pass))
        );

        const note = document.createElement("p");
        note.className = "contrast-note";

        if (ratio >= 7) {
            note.textContent =
                "Excellent contraste : conforme AAA pour le texte normal.";
        } else if (ratio >= 4.5) {
            note.textContent = "Contraste conforme AA pour le texte normal.";
        } else if (ratio >= 3) {
            note.textContent =
                "Contraste suffisant uniquement pour les textes larges ou très épais.";
        } else {
            note.textContent =
                "Contraste insuffisant : évitez cette combinaison pour du texte.";
        }

        els.contrastResult.append(ratioElement, badges, note);
    }

    function updateExports() {
        els.cssOutput.textContent = generateCssVars();
        els.tailwindOutput.textContent = generateTailwindConfig();
    }

    function generateCssVars() {
        if (!state.theme) {
            return "/* Importez une image pour générer des variables CSS. */";
        }

        const t = state.theme;

        return `:root {
  color-scheme: light;

  /* Couleurs dominantes */
${state.colors.map((hex, index) => `  --pp-color-${index + 1}: ${hex};`).join("\n")}

  /* Palette générée */
  --pp-primary: ${t.primary};
  --pp-primary-dark: ${t.primaryDark};
  --pp-primary-light: ${t.primaryLight};
  --pp-accent: ${t.accent};

  /* Thème clair */
  --pp-light-bg: ${t.light.bg};
  --pp-light-surface: ${t.light.surface};
  --pp-light-text: ${t.light.text};
  --pp-light-muted: ${t.light.muted};

  /* Thème sombre */
  --pp-dark-bg: ${t.dark.bg};
  --pp-dark-surface: ${t.dark.surface};
  --pp-dark-text: ${t.dark.text};
  --pp-dark-muted: ${t.dark.muted};

  /* Alias par défaut */
  --pp-bg: var(--pp-light-bg);
  --pp-surface: var(--pp-light-surface);
  --pp-text: var(--pp-light-text);
  --pp-muted: var(--pp-light-muted);
}

.dark {
  color-scheme: dark;
  --pp-bg: var(--pp-dark-bg);
  --pp-surface: var(--pp-dark-surface);
  --pp-text: var(--pp-dark-text);
  --pp-muted: var(--pp-dark-muted);
}
`;
    }

    function generateTailwindConfig() {
        if (!state.theme) {
            return "// Importez une image pour générer une configuration Tailwind.";
        }

        const t = state.theme;

        const paletteEntries = state.colors
            .map((hex, index) => `        ${index + 1}: '${hex}',`)
            .join("\n");

        return `/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        palette: {
${paletteEntries}
        },
        brand: {
          primary: '${t.primary}',
          'primary-dark': '${t.primaryDark}',
          'primary-light': '${t.primaryLight}',
          accent: '${t.accent}'
        },
        lightTheme: {
          bg: '${t.light.bg}',
          surface: '${t.light.surface}',
          text: '${t.light.text}',
          muted: '${t.light.muted}'
        },
        darkTheme: {
          bg: '${t.dark.bg}',
          surface: '${t.dark.surface}',
          text: '${t.dark.text}',
          muted: '${t.dark.muted}'
        }
      }
    }
  }
};
`;
    }

    function medianCut(pixels, maxColors) {
        if (!pixels.length) return [];

        let boxes = [{ pixels }];

        while (boxes.length < maxColors) {
            let targetIndex = -1;
            let bestScore = -1;

            for (let i = 0; i < boxes.length; i += 1) {
                const box = boxes[i];

                if (box.pixels.length < 2) continue;

                const rangeInfo = getPixelRange(box.pixels);
                if (!rangeInfo) continue;

                const score = box.pixels.length * (rangeInfo.range + 1);

                if (score > bestScore) {
                    bestScore = score;
                    targetIndex = i;
                }
            }

            if (targetIndex === -1) break;

            const target = boxes[targetIndex];
            boxes.splice(targetIndex, 1);

            const rangeInfo = getPixelRange(target.pixels);

            if (!rangeInfo) {
                boxes.push(target);
                break;
            }

            target.pixels.sort(
                (a, b) => a[rangeInfo.channel] - b[rangeInfo.channel]
            );

            const mid = Math.floor(target.pixels.length / 2);

            boxes.push(
                { pixels: target.pixels.slice(0, mid) },
                { pixels: target.pixels.slice(mid) }
            );
        }

        return boxes
            .map(box => {
                const count = box.pixels.length;
                const sum = [0, 0, 0];

                box.pixels.forEach(([r, g, b]) => {
                    sum[0] += r;
                    sum[1] += g;
                    sum[2] += b;
                });

                return {
                    rgb: [
                        Math.round(sum[0] / count),
                        Math.round(sum[1] / count),
                        Math.round(sum[2] / count)
                    ],
                    count
                };
            })
            .sort((a, b) => b.count - a.count)
            .map(item => item.rgb);
    }

    function getPixelRange(pixels) {
        const min = [255, 255, 255];
        const max = [0, 0, 0];

        pixels.forEach(([r, g, b]) => {
            if (r < min[0]) min[0] = r;
            if (g < min[1]) min[1] = g;
            if (b < min[2]) min[2] = b;

            if (r > max[0]) max[0] = r;
            if (g > max[1]) max[1] = g;
            if (b > max[2]) max[2] = b;
        });

        const ranges = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
        const channel = ranges.indexOf(Math.max(...ranges));

        if (ranges[channel] <= 0) return null;

        return {
            channel,
            range: ranges[channel]
        };
    }

    function uniqueColors(colors) {
        const unique = [];

        colors.forEach(color => {
            const isDuplicate = unique.some(
                existing => colorDistance(existing, color) < 48
            );

            if (!isDuplicate) {
                unique.push(color);
            }
        });

        return unique.length ? unique : colors.slice(0, 1);
    }

    function colorDistance(a, b) {
        return Math.sqrt(
            (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
        );
    }

    function generateTheme(primaryHex, secondaryHex) {
        const { r, g, b } = hexToRgb(primaryHex);
        const { h, s, l } = rgbToHsl(r, g, b);

        const tint = (lightness, saturation = Math.min(s, 30)) => {
            return rgbToHex(hslToRgb(h, saturation, lightness));
        };

        const accent =
            secondaryHex && isValidHex(secondaryHex)
                ? secondaryHex
                : rgbToHex(
                      hslToRgb(
                          (h + 180) % 360,
                          Math.max(s, 35),
                          Math.max(35, Math.min(65, l))
                      )
                  );

        return {
            primary: primaryHex,
            primaryDark: adjustLightness(primaryHex, -18),
            primaryLight: adjustLightness(primaryHex, 24),
            accent,
            light: {
                bg: tint(97),
                surface: tint(92),
                text: tint(14, 22),
                muted: tint(38, 18)
            },
            dark: {
                bg: tint(10),
                surface: tint(16),
                text: tint(93, 14),
                muted: tint(70, 14)
            }
        };
    }

    function adjustLightness(hex, amount) {
        const { r, g, b } = hexToRgb(hex);
        const { h, s, l } = rgbToHsl(r, g, b);

        return rgbToHex(hslToRgb(h, s, Math.max(0, Math.min(100, l + amount))));
    }

    function contrastRatio(firstColor, secondColor) {
        if (!isValidHex(firstColor) || !isValidHex(secondColor)) return 1;

        const first = relativeLuminance(hexToRgb(firstColor));
        const second = relativeLuminance(hexToRgb(secondColor));

        const lighter = Math.max(first, second);
        const darker = Math.min(first, second);

        return (lighter + 0.05) / (darker + 0.05);
    }

    function bestTextColor(background) {
        const white = "#ffffff";
        const black = "#000000";

        return contrastRatio(background, white) >=
            contrastRatio(background, black)
            ? white
            : black;
    }

    function relativeLuminance({ r, g, b }) {
        const channels = [r, g, b].map(value => {
            value /= 255;

            return value <= 0.03928
                ? value / 12.92
                : ((value + 0.055) / 1.055) ** 2.4;
        });

        return (
            0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
        );
    }

    function rgbToHex([r, g, b]) {
        return `#${[r, g, b]
            .map(value => {
                return Math.max(0, Math.min(255, Math.round(value)))
                    .toString(16)
                    .padStart(2, "0");
            })
            .join("")}`;
    }

    function hexToRgb(hex) {
        if (!isValidHex(hex)) {
            return { r: 0, g: 0, b: 0 };
        }

        let value = hex.replace("#", "").trim();

        if (value.length === 3) {
            value = value
                .split("")
                .map(char => char + char)
                .join("");
        }

        const int = parseInt(value, 16);

        return {
            r: (int >> 16) & 255,
            g: (int >> 8) & 255,
            b: int & 255
        };
    }

    function rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;

        let h = 0;
        let s = 0;

        if (max !== min) {
            const d = max - min;

            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                default:
                    h = (r - g) / d + 4;
            }

            h *= 60;
        }

        return {
            h: Math.round(h),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    function hslToRgb(h, s, l) {
        h = ((h % 360) + 360) % 360;
        s /= 100;
        l /= 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;

        let rgb = [0, 0, 0];

        if (h < 60) rgb = [c, x, 0];
        else if (h < 120) rgb = [x, c, 0];
        else if (h < 180) rgb = [0, c, x];
        else if (h < 240) rgb = [0, x, c];
        else if (h < 300) rgb = [x, 0, c];
        else rgb = [c, 0, x];

        return rgb.map(value => Math.round((value + m) * 255));
    }

    function isValidHex(value) {
        return (
            typeof value === "string" &&
            /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
        );
    }

    function updateHash() {
        if (!state.colors.length) return;

        const payload = {
            v: 1,
            c: state.colors,
            t: state.selectedText,
            b: state.selectedBg
        };

        try {
            const hash = encodePayload(payload);
            history.replaceState(
                null,
                "",
                `${window.location.pathname}${window.location.search}#${hash}`
            );
        } catch (error) {
            console.error(error);
        }
    }

    function loadFromHash() {
        const hash = window.location.hash.slice(1);

        if (!hash) return;

        const payload = decodePayload(hash);

        if (!payload || !Array.isArray(payload.c) || !payload.c.length) return;

        const colors = payload.c
            .filter(isValidHex)
            .map(hex => hex.toLowerCase());

        if (!colors.length) return;

        state.colors = colors;
        state.theme = generateTheme(colors[0], colors[1]);
        state.selectedBg = isValidHex(payload.b)
            ? payload.b.toLowerCase()
            : colors[0];
        state.selectedText = isValidHex(payload.t)
            ? payload.t.toLowerCase()
            : bestTextColor(state.selectedBg);

        renderAll();
    }

    function encodePayload(payload) {
        const json = JSON.stringify(payload);

        return btoa(
            encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (match, p1) => {
                return String.fromCharCode(parseInt(p1, 16));
            })
        )
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    }

    function decodePayload(hash) {
        try {
            const base64 = hash.replace(/-/g, "+").replace(/_/g, "/");
            const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
            const binary = atob(padded);

            const json = decodeURIComponent(
                binary
                    .split("")
                    .map(
                        char =>
                            "%" +
                            ("00" + char.charCodeAt(0).toString(16)).slice(-2)
                    )
                    .join("")
            );

            return JSON.parse(json);
        } catch (error) {
            return null;
        }
    }

    async function copyText(text, successMessage) {
        if (!text) {
            showToast("Rien à copier pour le moment.");
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            showToast(successMessage);
        } catch (error) {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";

            document.body.appendChild(textarea);
            textarea.select();

            try {
                document.execCommand("copy");
                showToast(successMessage);
            } catch (fallbackError) {
                showToast(
                    "La copie automatique est indisponible sur ce navigateur."
                );
            }

            textarea.remove();
        }
    }

    let toastTimeout = null;

    function showToast(message) {
        let toast = document.getElementById("toast");

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "toast";
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add("visible");

        clearTimeout(toastTimeout);

        toastTimeout = setTimeout(() => {
            toast.classList.remove("visible");
        }, 2600);
    }

    init();
})();
