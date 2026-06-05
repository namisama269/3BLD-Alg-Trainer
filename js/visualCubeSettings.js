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
        colorF: '#00d800',
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

        // Apply max height CSS to cube container
        const cubeContainer = document.getElementById('cube');
        if (cubeContainer) {
            if (settings.cubeMaxHeight && settings.cubeMaxHeight > 0) {
                cubeContainer.style.maxHeight = settings.cubeMaxHeight + 'px';
            } else {
                cubeContainer.style.maxHeight = '';
            }
        }

        // Redraw the cube
        if (window.updateVirtualCube) {
            updateVirtualCube();
        }
    }

    // Update UI elements to reflect current settings (all duplicates)
    function updateUI(settings) {
        function setAll(id, value, isCheckbox) {
            document.querySelectorAll('#' + CSS.escape(id)).forEach(function(el) {
                if (isCheckbox) el.checked = value; else el.value = value;
            });
        }

        setAll('enablePan', settings.enablePan !== false, true);
        setAll('enableZoom', settings.enableZoom !== false, true);
        setAll('cubeScale', parseFloat((settings.scaleFactor || 1.0).toFixed(2)), false);
        setAll('gapSize', settings.gapSize, false);
        setAll('edgeGapRatio', settings.edgeGapRatio, false);
        setAll('thetaX', settings.thetaX.toFixed(2), false);
        setAll('thetaY', settings.thetaY.toFixed(2), false);
        setAll('thetaZ', settings.thetaZ.toFixed(2), false);
        setAll('baseColor', settings.baseColor, false);
        setAll('showBaseColor', settings.showBaseColor, true);
        setAll('borderColor', settings.borderColor, false);
        setAll('autoBorderColor', settings.autoBorderColor, true);
        setAll('borderShade', settings.borderShade, false);
        setAll('borderWidth', settings.borderWidth || 2.5, false);
        setAll('debugMode', settings.debugMode, true);
        setAll('debugTextColor', settings.debugTextColor || 'dark', false);
        setAll('cubeMaxHeight', settings.cubeMaxHeight || 500, false);

        document.querySelectorAll('#debugTextColorGroup').forEach(function(el) {
            el.style.display = settings.debugMode ? 'block' : 'none';
        });

        var faceKeys = ['U', 'D', 'R', 'L', 'F', 'B'];
        faceKeys.forEach(function(face) {
            if (settings['color' + face]) {
                setAll('color' + face, settings['color' + face], false);
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
    // Uses querySelectorAll to bind ALL duplicates (config screen + settings modal)
    function attachEventListeners(currentSettings) {

        // Helper: bind event to all elements with given ID, sync duplicates on change
        function bindAllVC(id, event, handler) {
            document.querySelectorAll('#' + CSS.escape(id)).forEach(function(el) {
                el.addEventListener(event, handler);
            });
        }
        function syncAllVC(id, value, isCheckbox) {
            document.querySelectorAll('#' + CSS.escape(id)).forEach(function(el) {
                if (isCheckbox) el.checked = value; else el.value = value;
            });
        }

        // Checkboxes (no visual apply needed)
        bindAllVC('enablePan', 'change', function() {
            currentSettings.enablePan = this.checked;
            syncAllVC('enablePan', this.checked, true);
            saveSettings(currentSettings);
        });
        bindAllVC('enableZoom', 'change', function() {
            currentSettings.enableZoom = this.checked;
            syncAllVC('enableZoom', this.checked, true);
            saveSettings(currentSettings);
        });

        // Numeric inputs (apply + save)
        var numericInputs = [
            { id: 'cubeScale', key: 'scaleFactor' },
            { id: 'gapSize', key: 'gapSize' },
            { id: 'edgeGapRatio', key: 'edgeGapRatio' },
            { id: 'thetaX', key: 'thetaX' },
            { id: 'thetaY', key: 'thetaY' },
            { id: 'thetaZ', key: 'thetaZ' },
            { id: 'borderShade', key: 'borderShade' },
            { id: 'borderWidth', key: 'borderWidth' },
            { id: 'cubeMaxHeight', key: 'cubeMaxHeight', parseInt: true }
        ];
        numericInputs.forEach(function(cfg) {
            bindAllVC(cfg.id, 'change', function() {
                var val = cfg.parseInt ? (parseInt(this.value) || 0) : parseFloat(parseFloat(this.value).toFixed(2));
                currentSettings[cfg.key] = val;
                syncAllVC(cfg.id, this.value, false);
                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
        });

        // Checkbox inputs (apply + save)
        var checkboxInputs = [
            { id: 'showBaseColor', key: 'showBaseColor' },
            { id: 'autoBorderColor', key: 'autoBorderColor' }
        ];
        checkboxInputs.forEach(function(cfg) {
            bindAllVC(cfg.id, 'change', function() {
                currentSettings[cfg.key] = this.checked;
                syncAllVC(cfg.id, this.checked, true);
                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
        });

        // Color inputs
        bindAllVC('baseColor', 'input', function() {
            currentSettings.baseColor = this.value;
            syncAllVC('baseColor', this.value, false);
            applySettings(currentSettings);
            saveSettings(currentSettings);
        });
        bindAllVC('borderColor', 'input', function() {
            currentSettings.borderColor = this.value;
            syncAllVC('borderColor', this.value, false);
            if (!currentSettings.autoBorderColor) {
                applySettings(currentSettings);
                saveSettings(currentSettings);
            }
        });

        // Debug Mode
        bindAllVC('debugMode', 'change', function() {
            currentSettings.debugMode = this.checked;
            syncAllVC('debugMode', this.checked, true);
            document.querySelectorAll('#debugTextColorGroup').forEach(function(el) {
                el.style.display = currentSettings.debugMode ? 'block' : 'none';
            });
            applySettings(currentSettings);
            saveSettings(currentSettings);
        });
        bindAllVC('debugTextColor', 'change', function() {
            currentSettings.debugTextColor = this.value;
            syncAllVC('debugTextColor', this.value, false);
            applySettings(currentSettings);
            saveSettings(currentSettings);
        });

        // Face color inputs
        var faceKeys = ['U', 'D', 'R', 'L', 'F', 'B'];
        faceKeys.forEach(function(face) {
            var id = 'color' + face;
            bindAllVC(id, 'input', function() {
                currentSettings[id] = this.value;
                syncAllVC(id, this.value, false);
                applySettings(currentSettings);
                saveSettings(currentSettings);
            });
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
        updateUI,
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
