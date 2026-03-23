// PresetsManager.js - Manage built-in and user algorithm presets
//
// Built-in presets are loaded from external files in /presets/ folder.
// User presets are stored in localStorage.

(function() {
    'use strict';

    // Built-in preset metadata (name -> file path)
    const BUILTIN_PRESET_FILES = {
        "2CO - 2-twists (James)": "presets/2co-2-twists-james.txt",
        "3CO - UFR 3-twists (James)": "presets/3co-ufr-3-twists-james.txt",
        "2EO - 2-flips (Elliott)": "presets/2eo-2-flips-elliott.txt",
        "Floating Parity (any pseudoswap)": "presets/floating-parity-any-pseudoswap.txt",
        "UF-UFR Full Parity (Charlie)": "presets/uf-ufr-full-parity-charlie.txt",
        "LTCT (Andy Wong)": "presets/ltct-andy-wong.txt",
        "LTCT (James)": "presets/ltct-james.txt",
        "LTEF (Letter Pairs Only)": "presets/ltef-letter-pairs-only.txt",
        "T2C (Zeph-Elliott)": "presets/t2c-zeph-elliott.txt",
        "F2E (James)": "presets/f2e-james.txt",
        "UF-UR 2E2E (James)": "presets/uf-ur-2e2e-james.txt",
        "UF-UR 2C (Zeph)": "presets/uf-ur-2c-zeph.txt",
        "ZBLL": "presets/zbll.txt",
        "1LLL": "presets/1lll.txt"
    };

    // Cache for loaded presets
    let presetCache = {};

    // LocalStorage key for user presets
    const USER_PRESETS_KEY = 'algTrainerUserPresets';

    /**
     * Load a preset file asynchronously
     * @param {string} filePath - Path to preset file
     * @returns {Promise<string>} Preset content
     */
    async function loadPresetFile(filePath) {
        if (presetCache[filePath]) {
            return presetCache[filePath];
        }

        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load ${filePath}: ${response.status}`);
            }
            const content = await response.text();
            presetCache[filePath] = content;
            return content;
        } catch (error) {
            console.error('[PresetsManager] Error loading preset:', error);
            return null;
        }
    }

    /**
     * Get list of built-in preset names
     * @returns {string[]} Array of preset names
     */
    function getBuiltinPresetNames() {
        return Object.keys(BUILTIN_PRESET_FILES);
    }

    /**
     * Get all user presets from localStorage
     * @returns {Object} Map of preset name -> raw text
     */
    function getUserPresets() {
        const stored = localStorage.getItem(USER_PRESETS_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('[PresetsManager] Failed to parse user presets:', e);
                return {};
            }
        }
        return {};
    }

    /**
     * Save a user preset
     * @param {string} name - Preset name
     * @param {string} rawText - Raw algorithm text
     */
    function saveUserPreset(name, rawText) {
        const presets = getUserPresets();
        presets[name] = rawText;
        localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(presets));
    }

    /**
     * Delete a user preset
     * @param {string} name - Preset name to delete
     */
    function deleteUserPreset(name) {
        const presets = getUserPresets();
        delete presets[name];
        localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(presets));
    }

    /**
     * Load a preset into the algorithm textarea
     * @param {string} rawText - Raw algorithm text
     */
    function loadPreset(rawText) {
        const textarea = document.getElementById('userDefinedAlgs');
        if (textarea) {
            textarea.value = rawText;
            localStorage.setItem('userDefinedAlgs', rawText);

            // Clear enabled subsets so nothing is selected by default
            if (window.AlgorithmList && window.AlgorithmList.clearEnabledSubsets) {
                AlgorithmList.clearEnabledSubsets();
            }

            // Trigger subset update
            if (window.AlgorithmList && window.AlgorithmList.updateSubsets) {
                AlgorithmList.updateSubsets();
            }
        }
    }

    /**
     * Get current algorithm text from textarea
     * @returns {string} Current raw text
     */
    function getCurrentAlgText() {
        const textarea = document.getElementById('userDefinedAlgs');
        return textarea ? textarea.value : '';
    }

    /**
     * Render the presets list in the modal
     */
    function renderPresetsList() {
        const builtinList = document.getElementById('builtinPresetsList');
        const userList = document.getElementById('userPresetsList');

        if (!builtinList || !userList) return;

        // Clear existing
        builtinList.innerHTML = '';
        userList.innerHTML = '';

        // Render built-in presets
        const builtinNames = getBuiltinPresetNames();
        for (const name of builtinNames) {
            const item = createPresetItem(name, BUILTIN_PRESET_FILES[name], false, true);
            builtinList.appendChild(item);
        }

        // Render user presets
        const userPresets = getUserPresets();
        const userNames = Object.keys(userPresets);

        if (userNames.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'text-muted small p-2';
            emptyMsg.textContent = 'No saved presets yet.';
            userList.appendChild(emptyMsg);
        } else {
            for (const name of userNames) {
                const item = createPresetItem(name, userPresets[name], true, false);
                userList.appendChild(item);
            }
        }
    }

    /**
     * Create a preset list item element
     * @param {string} name - Preset name
     * @param {string} rawTextOrPath - Raw algorithm text or file path
     * @param {boolean} isUserPreset - Whether this is a user preset (can be deleted)
     * @param {boolean} isFilePath - Whether rawTextOrPath is a file path to load
     * @returns {HTMLElement} List item element
     */
    function createPresetItem(name, rawTextOrPath, isUserPreset, isFilePath) {
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex justify-content-between align-items-center';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        nameSpan.className = 'preset-name';
        item.appendChild(nameSpan);

        const btnGroup = document.createElement('div');
        btnGroup.className = 'btn-group btn-group-sm';

        // Load button
        const loadBtn = document.createElement('button');
        loadBtn.type = 'button';
        loadBtn.className = 'btn btn-outline-primary';
        loadBtn.textContent = 'Load';
        loadBtn.addEventListener('click', async function() {
            let content = rawTextOrPath;

            if (isFilePath) {
                loadBtn.textContent = 'Loading...';
                loadBtn.disabled = true;
                content = await loadPresetFile(rawTextOrPath);
                loadBtn.textContent = 'Load';
                loadBtn.disabled = false;

                if (!content) {
                    alert('Failed to load preset. Please try again.');
                    return;
                }
            }

            loadPreset(content);
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('presetsModal'));
            if (modal) modal.hide();
        });
        btnGroup.appendChild(loadBtn);

        // Delete button (only for user presets)
        if (isUserPreset) {
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn btn-outline-danger';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', function() {
                if (confirm('Delete preset "' + name + '"?')) {
                    deleteUserPreset(name);
                    renderPresetsList();
                }
            });
            btnGroup.appendChild(deleteBtn);
        }

        item.appendChild(btnGroup);
        return item;
    }

    /**
     * Show save preset dialog
     */
    function showSaveDialog() {
        const name = prompt('Enter a name for this preset:');
        if (name && name.trim()) {
            const trimmedName = name.trim();

            // Check if name conflicts with built-in
            if (BUILTIN_PRESET_FILES[trimmedName]) {
                alert('Cannot use a built-in preset name. Please choose a different name.');
                return;
            }

            const currentText = getCurrentAlgText();
            if (!currentText.trim()) {
                alert('No algorithms to save. Please add some algorithms first.');
                return;
            }

            saveUserPreset(trimmedName, currentText);
            renderPresetsList();
            alert('Preset "' + trimmedName + '" saved!');
        }
    }

    /**
     * Initialize the presets modal
     */
    function initModal() {
        // Render presets when modal is shown
        const modal = document.getElementById('presetsModal');
        if (modal) {
            modal.addEventListener('show.bs.modal', function() {
                renderPresetsList();
            });
        }

        // Save button handler
        const saveBtn = document.getElementById('savePresetBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', showSaveDialog);
        }
    }

    // Export to global scope
    window.PresetsManager = {
        getBuiltinPresetNames,
        getUserPresets,
        saveUserPreset,
        deleteUserPreset,
        loadPreset,
        loadPresetFile,
        getCurrentAlgText,
        renderPresetsList,
        showSaveDialog,
        initModal
    };

})();
