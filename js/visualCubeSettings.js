// VisualCube Settings Manager
// Handles UI controls for configuring the VisualCube instance

(function() {
    'use strict';

    const DEFAULT_SETTINGS = {
        enablePan: true,
        enableZoom: true,
        scaleFactor: 1.0,  // Multiplier for BASE_SCALE (0.2 to 3.0)
        gapSize: 0.08,
        edgeGapRatio: 0.65,
        thetaX: -0.4,
        thetaY: -0.6,
        thetaZ: 0,
        baseColor: '#000000',
        showBaseColor: true,
        borderColor: '#000000',
        autoBorderColor: true,
        borderShade: 0.85,
        borderWidth: 2.5,
        debugMode: false,
        debugTextColor: 'dark',
        cubeMaxHeight: 500,  // Max display height in pixels (0 = no limit)
        // Sticker colors
        colorU: '#ffffff',
        colorD: '#f0ff00',
        colorR: '#e8120a',
        colorL: '#fb8c00',
        colorF: '#66ff33',
        colorB: '#2055ff'
    };

    const STORAGE_KEY = 'visualCubeSettings';
    const PRESETS_STORAGE_KEY = 'visualCubePresets';
    const CURRENT_PRESET_KEY = 'currentCubePreset';

    // Built-in presets (read-only)
    const BUILT_IN_PRESETS = {
        'default': {
            name: 'Default',
            settings: { ...DEFAULT_SETTINGS }
        }
    };

    // Convert degrees to radians
    function degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Convert radians to degrees
    function radiansToDegrees(radians) {
        return radians * (180 / Math.PI);
    }

    // Load settings from localStorage
    function loadSettings() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            } catch (e) {
                console.error('Failed to parse stored settings:', e);
                return { ...DEFAULT_SETTINGS };
            }
        }
        return { ...DEFAULT_SETTINGS };
    }

    // Save settings to localStorage
    function saveSettings(settings) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    // Apply settings to the VisualCube instance
    function applySettings(settings) {
        if (!window.vc) {
            console.warn('VisualCube instance not found');
            return;
        }

        // Update VisualCube properties
        // Calculate actual scale from scaleFactor (BASE_SCALE is defined in RubiksCube.js)
        const BASE_SCALE = window.BASE_SCALE || 360;
        vc.scale = BASE_SCALE * (settings.scaleFactor || 1.0);
        vc.gapSize = settings.gapSize;
        vc.edgeGapRatio = settings.edgeGapRatio;
        vc.thetaX = settings.thetaX;
        vc.thetaY = settings.thetaY;
        vc.thetaZ = settings.thetaZ;
        vc.baseColor = settings.baseColor;
        vc.showBaseColor = settings.showBaseColor;
        vc.stickerBorderColor = settings.autoBorderColor ? null : settings.borderColor;
        vc.stickerBorderShade = settings.borderShade;
        vc.stickerBorderWidth = settings.borderWidth || 2.5;
        vc.debugMode = settings.debugMode;
        vc.debugTextColor = settings.debugTextColor || 'dark';

        // Update base color in sticker colors
        if (vc.stickerColors) {
            vc.stickerColors[VisualCube.BASE_COLOR_KEY] = settings.baseColor;

            // Update face colors
            const faceKeys = ['U', 'D', 'R', 'L', 'F', 'B'];
            faceKeys.forEach(face => {
                const colorKey = 'color' + face;
                if (settings[colorKey]) {
                    vc.stickerColors[face] = settings[colorKey];
                }
            });
        }

        // Recalculate face stickers with new gap settings
        vc.faceStickers = VisualCube.getFaceStickers(vc.cubeSize, vc.gapSize, vc.edgeGapRatio);

        // Apply max height CSS to canvas element
        const canvas = document.getElementById('cube');
        if (canvas) {
            if (settings.cubeMaxHeight && settings.cubeMaxHeight > 0) {
                canvas.style.maxHeight = settings.cubeMaxHeight + 'px';
                canvas.style.width = 'auto';
            } else {
                canvas.style.maxHeight = '';
                canvas.style.width = '';
            }
        }

        // Redraw the cube
        if (window.updateVirtualCube) {
            updateVirtualCube();
        }
    }

    // Update UI elements to reflect current settings
    function updateUI(settings) {
        // Pan/Zoom toggles
        const enablePanInput = document.getElementById('enablePan');
        if (enablePanInput) {
            enablePanInput.checked = settings.enablePan !== false;
        }

        const enableZoomInput = document.getElementById('enableZoom');
        if (enableZoomInput) {
            enableZoomInput.checked = settings.enableZoom !== false;
        }

        // Scale Factor
        const scaleInput = document.getElementById('cubeScale');
        if (scaleInput) {
            scaleInput.value = settings.scaleFactor || 1.0;
        }

        // Gap Size
        const gapSizeInput = document.getElementById('gapSize');
        if (gapSizeInput) {
            gapSizeInput.value = settings.gapSize;
        }

        // Edge Gap Ratio
        const edgeGapRatioInput = document.getElementById('edgeGapRatio');
        if (edgeGapRatioInput) {
            edgeGapRatioInput.value = settings.edgeGapRatio;
        }

        // Rotation angles (in radians)
        const thetaXInput = document.getElementById('thetaX');
        if (thetaXInput) {
            thetaXInput.value = settings.thetaX.toFixed(2);
        }

        const thetaYInput = document.getElementById('thetaY');
        if (thetaYInput) {
            thetaYInput.value = settings.thetaY.toFixed(2);
        }

        const thetaZInput = document.getElementById('thetaZ');
        if (thetaZInput) {
            thetaZInput.value = settings.thetaZ.toFixed(2);
        }

        // Colors and checkboxes
        const baseColorInput = document.getElementById('baseColor');
        if (baseColorInput) baseColorInput.value = settings.baseColor;

        const showBaseColorInput = document.getElementById('showBaseColor');
        if (showBaseColorInput) showBaseColorInput.checked = settings.showBaseColor;

        const borderColorInput = document.getElementById('borderColor');
        if (borderColorInput) borderColorInput.value = settings.borderColor;

        const autoBorderColorInput = document.getElementById('autoBorderColor');
        if (autoBorderColorInput) autoBorderColorInput.checked = settings.autoBorderColor;

        const borderShadeInput = document.getElementById('borderShade');
        if (borderShadeInput) {
            borderShadeInput.value = settings.borderShade;
        }

        const borderWidthInput = document.getElementById('borderWidth');
        if (borderWidthInput) {
            borderWidthInput.value = settings.borderWidth || 2.5;
        }

        const debugModeInput = document.getElementById('debugMode');
        if (debugModeInput) debugModeInput.checked = settings.debugMode;

        // Debug text color
        const debugTextColorSelect = document.getElementById('debugTextColor');
        if (debugTextColorSelect) debugTextColorSelect.value = settings.debugTextColor || 'dark';

        // Debug text color group visibility
        const debugTextColorGroup = document.getElementById('debugTextColorGroup');
        if (debugTextColorGroup) {
            debugTextColorGroup.style.display = settings.debugMode ? 'block' : 'none';
        }

        // Cube Max Height
        const cubeMaxHeightInput = document.getElementById('cubeMaxHeight');
        if (cubeMaxHeightInput) {
            cubeMaxHeightInput.value = settings.cubeMaxHeight || 500;
        }

        // Face colors
        const faceKeys = ['U', 'D', 'R', 'L', 'F', 'B'];
        faceKeys.forEach(face => {
            const colorInput = document.getElementById('color' + face);
            const colorKey = 'color' + face;
            if (colorInput && settings[colorKey]) {
                colorInput.value = settings[colorKey];
            }
        });
    }

    // ========== PRESET MANAGEMENT ==========

    // Load user presets from localStorage
    function loadUserPresets() {
        const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse stored presets:', e);
                return {};
            }
        }
        return {};
    }

    // Save user presets to localStorage
    function saveUserPresets(presets) {
        try {
            localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
        } catch (e) {
            console.error('Failed to save presets:', e);
        }
    }

    // Get all presets (built-in + user)
    function getAllPresets() {
        return {
            ...BUILT_IN_PRESETS,
            ...loadUserPresets()
        };
    }

    // Apply a preset by key
    function applyPreset(presetKey) {
        const allPresets = getAllPresets();
        const preset = allPresets[presetKey];
        if (preset) {
            const settings = { ...preset.settings };
            applySettings(settings);
            updateUI(settings);
            saveSettings(settings);
            localStorage.setItem(CURRENT_PRESET_KEY, presetKey);
        }
    }

    // Save current settings as a new preset
    function saveCurrentAsPreset(name) {
        const key = 'user-' + Date.now();
        const currentSettings = loadSettings();
        const userPresets = loadUserPresets();
        userPresets[key] = {
            name: name,
            settings: { ...currentSettings }
        };
        saveUserPresets(userPresets);
        return key;
    }

    // Delete a user preset
    function deletePreset(presetKey) {
        if (!BUILT_IN_PRESETS[presetKey]) {
            const userPresets = loadUserPresets();
            delete userPresets[presetKey];
            saveUserPresets(userPresets);
            return true;
        }
        return false;
    }

    // Populate preset dropdown
    function populatePresetDropdown() {
        const select = document.getElementById('cubePreset');
        const customGroup = document.getElementById('customPresetsGroup');
        if (!select || !customGroup) return;

        // Clear custom group
        customGroup.innerHTML = '';

        // Add user presets
        const userPresets = loadUserPresets();
        Object.entries(userPresets).forEach(([key, preset]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = preset.name;
            customGroup.appendChild(option);
        });

        // Set current preset
        const currentPreset = localStorage.getItem(CURRENT_PRESET_KEY) || 'default';
        if (select.querySelector(`option[value="${currentPreset}"]`)) {
            select.value = currentPreset;
        } else {
            select.value = 'default';
        }

        updateDeleteButtonVisibility(select.value);
    }

    // Show/hide delete button based on preset type
    function updateDeleteButtonVisibility(presetKey) {
        const deleteBtn = document.getElementById('deletePresetBtn');
        if (deleteBtn) {
            deleteBtn.style.display = (presetKey && !BUILT_IN_PRESETS[presetKey]) ? 'inline-block' : 'none';
        }
    }

    // ========== END PRESET MANAGEMENT ==========

    // Initialize settings UI
    function initializeSettings() {
        const settings = loadSettings();

        // Apply settings to VisualCube
        applySettings(settings);

        // Update UI to reflect settings
        updateUI(settings);

        // Populate preset dropdown
        populatePresetDropdown();

        // Attach event listeners
        attachEventListeners(settings);
    }

    // Attach event listeners to all controls
    function attachEventListeners(currentSettings) {
        // Enable Pan checkbox
        const enablePanInput = document.getElementById('enablePan');
        if (enablePanInput) {
            enablePanInput.addEventListener('change', function() {
                currentSettings.enablePan = this.checked;
                saveSettings(currentSettings);
            });
        }

        // Enable Zoom checkbox
        const enableZoomInput = document.getElementById('enableZoom');
        if (enableZoomInput) {
            enableZoomInput.addEventListener('change', function() {
                currentSettings.enableZoom = this.checked;
                saveSettings(currentSettings);
            });
        }

        // Scale Factor input
        const scaleInput = document.getElementById('cubeScale');
        if (scaleInput) {
            scaleInput.addEventListener('change', function() {
                currentSettings.scaleFactor = parseFloat(this.value);
                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
        }

        // Gap Size input
        const gapSizeInput = document.getElementById('gapSize');
        if (gapSizeInput) {
            gapSizeInput.addEventListener('change', function() {
                currentSettings.gapSize = parseFloat(this.value);
                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
        }

        // Edge Gap Ratio input
        const edgeGapRatioInput = document.getElementById('edgeGapRatio');
        if (edgeGapRatioInput) {
            edgeGapRatioInput.addEventListener('change', function() {
                currentSettings.edgeGapRatio = parseFloat(this.value);
                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
        }

        // Rotation X input (radians)
        const thetaXInput = document.getElementById('thetaX');
        if (thetaXInput) {
            thetaXInput.addEventListener('change', function() {
                currentSettings.thetaX = parseFloat(this.value);
                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
        }

        // Rotation Y input (radians)
        const thetaYInput = document.getElementById('thetaY');
        if (thetaYInput) {
            thetaYInput.addEventListener('change', function() {
                currentSettings.thetaY = parseFloat(this.value);
                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
        }

        // Rotation Z input (radians)
        const thetaZInput = document.getElementById('thetaZ');
        if (thetaZInput) {
            thetaZInput.addEventListener('change', function() {
                currentSettings.thetaZ = parseFloat(this.value);
                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
        }

        // Base Color
        const baseColorInput = document.getElementById('baseColor');
        if (baseColorInput) {
            baseColorInput.addEventListener('input', function() {
                currentSettings.baseColor = this.value;
                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
        }

        // Show Base Color checkbox
        const showBaseColorInput = document.getElementById('showBaseColor');
        if (showBaseColorInput) {
            showBaseColorInput.addEventListener('change', function() {
                currentSettings.showBaseColor = this.checked;
                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
        }

        // Border Color
        const borderColorInput = document.getElementById('borderColor');
        if (borderColorInput) {
            borderColorInput.addEventListener('input', function() {
                currentSettings.borderColor = this.value;
                if (!currentSettings.autoBorderColor) {
                    applySettings(currentSettings);
                    saveSettings(currentSettings);
                }
            });
        }

        // Auto Border Color checkbox
        const autoBorderColorInput = document.getElementById('autoBorderColor');
        if (autoBorderColorInput) {
            autoBorderColorInput.addEventListener('change', function() {
                currentSettings.autoBorderColor = this.checked;
                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
        }

        // Border Shade input
        const borderShadeInput = document.getElementById('borderShade');
        if (borderShadeInput) {
            borderShadeInput.addEventListener('change', function() {
                currentSettings.borderShade = parseFloat(this.value);
                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
        }

        // Border Width input
        const borderWidthInput = document.getElementById('borderWidth');
        if (borderWidthInput) {
            borderWidthInput.addEventListener('change', function() {
                currentSettings.borderWidth = parseFloat(this.value);
                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
        }

        // Debug Mode checkbox
        const debugModeInput = document.getElementById('debugMode');
        if (debugModeInput) {
            debugModeInput.addEventListener('change', function() {
                currentSettings.debugMode = this.checked;

                // Show/hide debug text color select
                const debugTextColorGroup = document.getElementById('debugTextColorGroup');
                if (debugTextColorGroup) {
                    debugTextColorGroup.style.display = this.checked ? 'block' : 'none';
                }

                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
        }

        // Debug Text Color select
        const debugTextColorSelect = document.getElementById('debugTextColor');
        if (debugTextColorSelect) {
            debugTextColorSelect.addEventListener('change', function() {
                currentSettings.debugTextColor = this.value;
                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
        }

        // Cube Max Height input
        const cubeMaxHeightInput = document.getElementById('cubeMaxHeight');
        if (cubeMaxHeightInput) {
            cubeMaxHeightInput.addEventListener('change', function() {
                currentSettings.cubeMaxHeight = parseInt(this.value) || 0;
                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
        }

        // Face color inputs
        const faceKeys = ['U', 'D', 'R', 'L', 'F', 'B'];
        faceKeys.forEach(face => {
            const colorInput = document.getElementById('color' + face);
            if (colorInput) {
                colorInput.addEventListener('input', function() {
                    currentSettings['color' + face] = this.value;
                    applySettings(currentSettings);
                    saveSettings(currentSettings);
                });
            }
        });

        // Reset button
        const resetButton = document.getElementById('resetCubeSettings');
        if (resetButton) {
            resetButton.addEventListener('click', function() {
                const defaults = { ...DEFAULT_SETTINGS };
                Object.assign(currentSettings, defaults);
                updateUI(currentSettings);
                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
        }

        // Export JSON button
        const exportButton = document.getElementById('exportCubeSettings');
        if (exportButton) {
            exportButton.addEventListener('click', function() {
                exportSettingsJSON();
            });
        }

        // ========== PRESET EVENT LISTENERS ==========

        // Preset select change
        const presetSelect = document.getElementById('cubePreset');
        if (presetSelect) {
            presetSelect.addEventListener('change', function() {
                applyPreset(this.value);
                // Reload currentSettings reference
                Object.assign(currentSettings, loadSettings());
                updateDeleteButtonVisibility(this.value);
            });
        }

        // Save As button
        const savePresetBtn = document.getElementById('savePresetBtn');
        if (savePresetBtn) {
            savePresetBtn.addEventListener('click', function() {
                const name = prompt('Enter preset name:');
                if (name && name.trim()) {
                    const key = saveCurrentAsPreset(name.trim());
                    populatePresetDropdown();
                    document.getElementById('cubePreset').value = key;
                    localStorage.setItem(CURRENT_PRESET_KEY, key);
                    updateDeleteButtonVisibility(key);
                }
            });
        }

        // Delete preset button
        const deletePresetBtn = document.getElementById('deletePresetBtn');
        if (deletePresetBtn) {
            deletePresetBtn.addEventListener('click', function() {
                const presetKey = document.getElementById('cubePreset').value;
                if (confirm('Delete this preset?')) {
                    deletePreset(presetKey);
                    localStorage.setItem(CURRENT_PRESET_KEY, 'default');
                    populatePresetDropdown();
                    applyPreset('default');
                    Object.assign(currentSettings, loadSettings());
                }
            });
        }
    }

    // Export current settings as JSON in a new window
    function exportSettingsJSON() {
        const settings = loadSettings();

        // Add canvas size from the actual canvas element
        const canvas = document.getElementById('cube');
        if (canvas) {
            settings.canvasWidth = canvas.width;
            settings.canvasHeight = canvas.height;
        }

        const jsonStr = JSON.stringify(settings, null, 2);

        const newWindow = window.open('', '_blank', 'width=500,height=600');
        if (newWindow) {
            newWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
    <title>VisualCube Settings JSON</title>
    <style>
        body { font-family: monospace; margin: 20px; background: #1e1e1e; color: #d4d4d4; }
        pre { white-space: pre-wrap; word-wrap: break-word; background: #2d2d2d; padding: 15px; border-radius: 8px; }
        h3 { color: #fff; margin-bottom: 10px; }
        button { margin-top: 10px; padding: 8px 16px; cursor: pointer; background: #0d6efd; color: white; border: none; border-radius: 4px; }
        button:hover { background: #0b5ed7; }
    </style>
</head>
<body>
    <h3>VisualCube Settings</h3>
    <pre>${jsonStr}</pre>
    <button onclick="navigator.clipboard.writeText(document.querySelector('pre').textContent).then(() => alert('Copied!'))">Copy to Clipboard</button>
</body>
</html>`);
            newWindow.document.close();
        }
    }

    // Initialize when DOM is ready and VisualCube is available
    function tryInitialize() {
        if (window.vc) {
            initializeSettings();
        } else {
            // Retry after a short delay if vc isn't ready yet
            setTimeout(tryInitialize, 50);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInitialize);
    } else {
        tryInitialize();
    }

    // Export for use in other scripts if needed
    window.VisualCubeSettings = {
        loadSettings,
        saveSettings,
        applySettings,
        exportSettingsJSON,
        DEFAULT_SETTINGS,
        BUILT_IN_PRESETS,
        loadUserPresets,
        saveUserPresets,
        applyPreset,
        saveCurrentAsPreset,
        deletePreset,
        populatePresetDropdown
    };
})();
