// SettingsManager.js - Settings management and localStorage persistence

(function() {
    'use strict';

    // Default settings
    const DEFAULTS = {
        "useVirtual": true,
        "hideTimer": true,
        "includeRecognitionTime": false,
        "showScramble": true,
        "realScrambles": true,
        "randAUF": false,
        "prescramble": false,
        "goInOrder": false, // Legacy - kept for backward compatibility
        "algOrder": "random", // New: "random", "inOrder", or "shuffled"
        "goToNextCase": false,
        "mirrorM": "off",
        "mirrorS": "off",
        "colourneutrality1": "",
        "colourneutrality2": "",
        "colourneutrality3": "",
        "userDefinedAlgs": "",
        "fullCN": false,
        "visualCubeView": "plan",
        "autoAddInverses": false,
        "useMask": true,
        "usePivot": true,
        "colorizeAlgs": false,
        "algInputMode": "custom", // "custom" or "generator"
        "generatorInput": ""
    };

    // Callbacks
    let onSettingChanged = null;

    /**
     * Get a setting value
     * @param {string} key - Setting key
     * @returns {*} Setting value
     */
    function getSetting(key) {
        const stored = localStorage.getItem(key);

        if (stored === null) {
            return DEFAULTS[key];
        }

        // Handle boolean conversion
        if (typeof DEFAULTS[key] === "boolean") {
            return stored === "true";
        }

        return stored;
    }

    /**
     * Set a setting value
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     */
    function setSetting(key, value) {
        localStorage.setItem(key, value);

        if (onSettingChanged) {
            onSettingChanged(key, value);
        }
    }

    /**
     * Load and apply all settings from localStorage
     */
    function loadAllSettings() {
        // Migrate legacy goInOrder setting to new algOrder
        const legacyGoInOrder = localStorage.getItem("goInOrder");
        const algOrderStored = localStorage.getItem("algOrder");
        if (legacyGoInOrder === "true" && algOrderStored === null) {
            localStorage.setItem("algOrder", "inOrder");
        }

        for (const setting in DEFAULTS) {
            const elements = document.querySelectorAll('#' + CSS.escape(setting));
            const previousSetting = localStorage.getItem(setting);

            elements.forEach(function(element) {
                if (typeof DEFAULTS[setting] === "boolean") {
                    if (previousSetting === null) {
                        element.checked = DEFAULTS[setting];
                    } else {
                        element.checked = previousSetting === "true";
                    }
                } else {
                    if (previousSetting === null) {
                        element.value = DEFAULTS[setting];
                    } else {
                        element.value = previousSetting;
                    }
                }
            });

            // Save default if not yet stored
            if (previousSetting === null) {
                localStorage.setItem(setting, DEFAULTS[setting]);
            }
        }
    }

    /**
     * Sync all duplicate elements with the same ID to match the given value.
     * Called after any setting change so config screen and modal stay in sync.
     */
    function syncDuplicateElements(id, value, isCheckbox) {
        var elements = document.querySelectorAll('#' + CSS.escape(id));
        elements.forEach(function(el) {
            if (isCheckbox) {
                el.checked = value;
            } else {
                el.value = value;
            }
        });
    }

    /**
     * Bind a click/change listener to ALL elements with the given ID.
     * Returns the first element (for backward compat with callbacks).
     */
    function bindAll(id, event, handler) {
        var elements = document.querySelectorAll('#' + CSS.escape(id));
        elements.forEach(function(el) {
            el.addEventListener(event, handler);
        });
        return elements.length > 0 ? elements[0] : null;
    }

    /**
     * Attach event listeners to settings elements
     * @param {Object} callbacks - Callback functions for various events
     */
    function attachSettingsListeners(callbacks = {}) {
        const {
            onUseVirtualChanged,
            onHideTimerChanged,
            onGoInOrderChanged,
            onGoToNextCaseChanged
        } = callbacks;

        // Simple checkbox settings — bind all duplicates and keep in sync
        var simpleCheckboxes = [
            "includeRecognitionTime", "showScramble", "realScrambles",
            "randAUF", "prescramble", "useMask", "usePivot", "fullCN", "colorizeAlgs"
        ];
        simpleCheckboxes.forEach(function(id) {
            bindAll(id, "click", function() {
                setSetting(id, this.checked);
                syncDuplicateElements(id, this.checked, true);
            });
        });

        // Checkboxes with callbacks
        bindAll("useVirtual", "click", function() {
            setSetting("useVirtual", this.checked);
            syncDuplicateElements("useVirtual", this.checked, true);
            if (onUseVirtualChanged) onUseVirtualChanged(this.checked);
        });

        bindAll("hideTimer", "click", function() {
            setSetting("hideTimer", this.checked);
            syncDuplicateElements("hideTimer", this.checked, true);
            if (onHideTimerChanged) onHideTimerChanged(!this.checked);
        });

        bindAll("autoAddInverses", "click", function() {
            setSetting("autoAddInverses", this.checked);
            syncDuplicateElements("autoAddInverses", this.checked, true);
            if (window.TrainerCore && window.TrainerCore.resetShuffledIndices) {
                window.TrainerCore.resetShuffledIndices();
            }
        });

        bindAll("goToNextCase", "click", function() {
            setSetting("goToNextCase", this.checked);
            syncDuplicateElements("goToNextCase", this.checked, true);
            if (onGoToNextCaseChanged) onGoToNextCaseChanged(this.checked);
        });

        // Legacy go in order checkbox
        bindAll("goInOrder", "click", function() {
            setSetting("goInOrder", this.checked);
            syncDuplicateElements("goInOrder", this.checked, true);
            if (onGoInOrderChanged) onGoInOrderChanged(this.checked);
        });

        // Dropdowns
        bindAll("algOrder", "change", function() {
            setSetting("algOrder", this.value);
            syncDuplicateElements("algOrder", this.value, false);
            if (window.TrainerCore && window.TrainerCore.resetShuffledIndices) {
                window.TrainerCore.resetShuffledIndices();
            }
            if (onGoInOrderChanged) onGoInOrderChanged(this.value);
        });

        bindAll("mirrorM", "change", function() {
            setSetting("mirrorM", this.value);
            syncDuplicateElements("mirrorM", this.value, false);
        });

        bindAll("mirrorS", "change", function() {
            setSetting("mirrorS", this.value);
            syncDuplicateElements("mirrorS", this.value, false);
        });

        // Text inputs that may have duplicates — sync on change
        var syncTextInputs = [
            "colourneutrality1", "colourneutrality2", "colourneutrality3",
            "initialMask", "finalMask"
        ];
        syncTextInputs.forEach(function(id) {
            bindAll(id, "input", function() {
                localStorage.setItem(id, this.value);
                syncDuplicateElements(id, this.value, false);
            });
        });

        // Visual Cube view toggle
        const visualCube = document.getElementById("visualcube");
        if (visualCube) {
            visualCube.addEventListener("click", function() {
                const currentView = getSetting("visualCubeView");
                const newView = currentView === "" ? "plan" : "";
                setSetting("visualCubeView", newView);
            });
        }

        // Algorithm Input Mode dropdown
        const algInputMode = document.getElementById("algInputMode");
        const customModeContainer = document.getElementById("customModeContainer");
        const generatorModeContainer = document.getElementById("generatorModeContainer");

        function updateInputModeDisplay(mode) {
            if (customModeContainer && generatorModeContainer) {
                if (mode === "generator") {
                    customModeContainer.style.display = "none";
                    generatorModeContainer.style.display = "block";
                    updateGeneratorCaseCount();
                } else {
                    customModeContainer.style.display = "block";
                    generatorModeContainer.style.display = "none";
                }
            }
        }

        function updateGeneratorCaseCount() {
            const generatorInput = document.getElementById("generatorInput");
            const caseCountEl = document.getElementById("generatorCaseCount");
            if (generatorInput && caseCountEl && window.GeneratorParser) {
                const input = generatorInput.value.trim();
                if (input) {
                    const count = GeneratorParser.estimateCaseCount(input);
                    caseCountEl.textContent = count > 0 ? `~${count} cases will be generated` : "";
                } else {
                    caseCountEl.textContent = "";
                }
            }
        }

        if (algInputMode) {
            // Load saved mode
            const savedMode = localStorage.getItem("algInputMode") || "custom";
            algInputMode.value = savedMode;
            updateInputModeDisplay(savedMode);

            algInputMode.addEventListener("change", function() {
                setSetting("algInputMode", this.value);
                updateInputModeDisplay(this.value);
                // Reset shuffled indices when mode changes
                if (window.TrainerCore && window.TrainerCore.resetShuffledIndices) {
                    window.TrainerCore.resetShuffledIndices();
                }
            });
        }

        // Generator input
        const generatorInput = document.getElementById("generatorInput");
        if (generatorInput) {
            // Load saved generator input
            const savedInput = localStorage.getItem("generatorInput") || "";
            generatorInput.value = savedInput;

            generatorInput.addEventListener("input", function() {
                setSetting("generatorInput", this.value);
                updateGeneratorCaseCount();
            });

            generatorInput.addEventListener("change", function() {
                // Reset shuffled indices when generator changes
                if (window.TrainerCore && window.TrainerCore.resetShuffledIndices) {
                    window.TrainerCore.resetShuffledIndices();
                }
            });
        }
    }

    /**
     * Set callback for setting changes
     * @param {function} callback
     */
    function setOnSettingChanged(callback) {
        onSettingChanged = callback;
    }

    /**
     * Reset all settings to defaults
     */
    function resetToDefaults() {
        for (const setting in DEFAULTS) {
            localStorage.setItem(setting, DEFAULTS[setting]);

            const element = document.getElementById(setting);
            if (!element) continue;

            if (typeof DEFAULTS[setting] === "boolean") {
                element.checked = DEFAULTS[setting];
            } else {
                element.value = DEFAULTS[setting];
            }
        }
    }

    /**
     * Get all current settings
     * @returns {Object}
     */
    function getAllSettings() {
        const settings = {};
        for (const key in DEFAULTS) {
            settings[key] = getSetting(key);
        }
        return settings;
    }

    // Export to global scope
    window.SettingsManager = {
        DEFAULTS,
        getSetting,
        setSetting,
        loadAllSettings,
        attachSettingsListeners,
        setOnSettingChanged,
        resetToDefaults,
        getAllSettings
    };

})();
