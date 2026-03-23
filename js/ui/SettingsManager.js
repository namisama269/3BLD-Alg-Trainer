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
            const element = document.getElementById(setting);
            if (!element) continue;

            const previousSetting = localStorage.getItem(setting);

            if (typeof DEFAULTS[setting] === "boolean") {
                if (previousSetting === null) {
                    element.checked = DEFAULTS[setting];
                    localStorage.setItem(setting, DEFAULTS[setting]);
                } else {
                    element.checked = previousSetting === "true";
                }
            } else {
                if (previousSetting === null) {
                    element.value = DEFAULTS[setting];
                    localStorage.setItem(setting, DEFAULTS[setting]);
                } else {
                    element.value = previousSetting;
                }
            }
        }
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

        // Use Virtual checkbox
        const useVirtual = document.getElementById("useVirtual");
        if (useVirtual) {
            useVirtual.addEventListener("click", function() {
                setSetting("useVirtual", this.checked);
                if (onUseVirtualChanged) {
                    onUseVirtualChanged(this.checked);
                }
            });
        }

        // Hide Timer checkbox
        const hideTimer = document.getElementById("hideTimer");
        if (hideTimer) {
            hideTimer.addEventListener("click", function() {
                setSetting("hideTimer", this.checked);
                if (onHideTimerChanged) {
                    onHideTimerChanged(!this.checked);
                }
            });
        }

        // Include Recognition Time checkbox
        const includeRecognitionTime = document.getElementById("includeRecognitionTime");
        if (includeRecognitionTime) {
            includeRecognitionTime.addEventListener("click", function() {
                setSetting("includeRecognitionTime", this.checked);
            });
        }

        // Show Scramble checkbox
        const showScramble = document.getElementById("showScramble");
        if (showScramble) {
            showScramble.addEventListener("click", function() {
                setSetting("showScramble", this.checked);
            });
        }

        // Real Scrambles checkbox
        const realScrambles = document.getElementById("realScrambles");
        if (realScrambles) {
            realScrambles.addEventListener("click", function() {
                setSetting("realScrambles", this.checked);
            });
        }

        // Random AUF checkbox
        const randAUF = document.getElementById("randAUF");
        if (randAUF) {
            randAUF.addEventListener("click", function() {
                setSetting("randAUF", this.checked);
            });
        }

        // Prescramble checkbox
        const prescramble = document.getElementById("prescramble");
        if (prescramble) {
            prescramble.addEventListener("click", function() {
                setSetting("prescramble", this.checked);
            });
        }


        // Auto Add Inverses checkbox
        const autoAddInverses = document.getElementById("autoAddInverses");
        if (autoAddInverses) {
            autoAddInverses.addEventListener("click", function() {
                setSetting("autoAddInverses", this.checked);
                // Reset shuffled indices when this setting changes
                if (window.TrainerCore && window.TrainerCore.resetShuffledIndices) {
                    window.TrainerCore.resetShuffledIndices();
                }
            });
        }

        // Use Mask checkbox
        const useMask = document.getElementById("useMask");
        if (useMask) {
            useMask.addEventListener("click", function() {
                setSetting("useMask", this.checked);
            });
        }

        // Use Pivot checkbox
        const usePivot = document.getElementById("usePivot");
        if (usePivot) {
            usePivot.addEventListener("click", function() {
                setSetting("usePivot", this.checked);
            });
        }

        // Go In Order checkbox (legacy support)
        const goInOrder = document.getElementById("goInOrder");
        if (goInOrder) {
            goInOrder.addEventListener("click", function() {
                setSetting("goInOrder", this.checked);
                if (onGoInOrderChanged) {
                    onGoInOrderChanged(this.checked);
                }
            });
        }

        // Algorithm Order dropdown (new)
        const algOrder = document.getElementById("algOrder");
        if (algOrder) {
            algOrder.addEventListener("change", function() {
                setSetting("algOrder", this.value);
                // Reset shuffled indices when order changes
                if (window.TrainerCore && window.TrainerCore.resetShuffledIndices) {
                    window.TrainerCore.resetShuffledIndices();
                }
                if (onGoInOrderChanged) {
                    onGoInOrderChanged(this.value);
                }
            });
        }

        // Go To Next Case checkbox
        const goToNextCase = document.getElementById("goToNextCase");
        if (goToNextCase) {
            goToNextCase.addEventListener("click", function() {
                setSetting("goToNextCase", this.checked);
                if (onGoToNextCaseChanged) {
                    onGoToNextCaseChanged(this.checked);
                }
            });
        }

        // Mirror M dropdown
        const mirrorM = document.getElementById("mirrorM");
        if (mirrorM) {
            mirrorM.addEventListener("change", function() {
                setSetting("mirrorM", this.value);
            });
        }

        // Mirror S dropdown
        const mirrorS = document.getElementById("mirrorS");
        if (mirrorS) {
            mirrorS.addEventListener("change", function() {
                setSetting("mirrorS", this.value);
            });
        }

        // Full CN checkbox
        const fullCN = document.getElementById("fullCN");
        if (fullCN) {
            fullCN.addEventListener("click", function() {
                setSetting("fullCN", this.checked);
            });
        }

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
