// AlgorithmList.js - Algorithm list management and validation
// Depends on: helpers.js (isCommutator, commToMoves)
// Depends on: core/AlgorithmUtils.js (averageMovecount)
//
// Subset syntax:
//   # SubsetName   - starts a new subset
//   // comment     - ignored line
//   R U R' U'      - algorithm (belongs to current subset)

(function() {
    'use strict';

    // Current algorithm list
    let algList = [];

    // Parsed subsets: { name: string, algs: string[] }[]
    let parsedSubsets = [];

    // Enabled subset names
    let enabledSubsets = new Set();

    /**
     * Fix algorithm formatting (removes brackets for now)
     * @param {string[]} algorithms - Array of algorithms
     * @returns {string[]} Fixed algorithms
     */
    function fixAlgorithms(algorithms) {
        for (let i = 0; i < algorithms.length; i++) {
            algorithms[i] = algorithms[i].replace(/\[|\]|\)|\(/g, "");
        }
        return algorithms;
    }

    /**
     * Parse input into subsets
     * @param {string} input - Raw input text
     * @returns {{ subsets: {name: string, algs: string[]}[], allAlgs: string[] }}
     */
    function parseSubsets(input) {
        const lines = input.split("\n");
        const subsets = [];
        let currentSubset = { name: "Uncategorized", algs: [] };
        const allAlgs = [];

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith("//")) {
                continue;
            }

            // Check for subset header (# SubsetName)
            if (trimmed.startsWith("#")) {
                // Save current subset if it has algorithms
                if (currentSubset.algs.length > 0) {
                    subsets.push(currentSubset);
                }
                // Start new subset
                const name = trimmed.substring(1).trim();
                currentSubset = { name: name || "Unnamed", algs: [] };
                continue;
            }

            // It's an algorithm line
            currentSubset.algs.push(trimmed);
            allAlgs.push(trimmed);
        }

        // Save last subset
        if (currentSubset.algs.length > 0) {
            subsets.push(currentSubset);
        }

        return { subsets, allAlgs };
    }

    /**
     * Validate and clean user-provided algorithms
     * @param {string[]} userAlgs - Array of user algorithms
     * @returns {string[]} Valid algorithms
     */
    function findMistakesInUserAlgs(userAlgs) {
        let errorMessage = "";
        let newList = [];
        let newListDisplay = []; // contains all valid algs + commented algs

        for (let i = 0; i < userAlgs.length; i++) {
            const trimmed = userAlgs[i].trim();

            // Keep subset headers (# SubsetName)
            if (trimmed.startsWith("#")) {
                newListDisplay.push(userAlgs[i]);
                continue;
            }

            // Keep comments (// comment)
            if (trimmed.startsWith("//")) {
                newListDisplay.push(userAlgs[i]);
                continue;
            }

            // Replace apostrophe-like characters with '
            userAlgs[i] = userAlgs[i].replace(/[\u2018\u0060\u2019\u00B4]/g, "'");
            userAlgs[i] = userAlgs[i].replace(/"/g, "");

            // For multi-alg syntax (alg1 ! alg2 ! ...), only validate the first alg
            const firstAlg = userAlgs[i].split("!")[0].trim();

            if (!isCommutator(firstAlg)) {
                try {
                    if (window.alg && window.alg.cube) {
                        alg.cube.simplify(firstAlg);
                    }
                    if (userAlgs[i].trim() !== "") {
                        newList.push(userAlgs[i]);
                        newListDisplay.push(userAlgs[i]);
                    }
                } catch (err) {
                    errorMessage += "\"" + firstAlg + "\"" + " is an invalid alg and has been removed\n";
                }
            } else {
                // TODO: check valid comms
                newList.push(userAlgs[i]);
                newListDisplay.push(userAlgs[i]);
            }
        }

        if (errorMessage !== "") {
            alert(errorMessage);
        }

        // Update UI
        const textarea = document.getElementById("userDefinedAlgs");
        if (textarea) {
            textarea.value = newListDisplay.join("\n");
        }
        localStorage.setItem("userDefinedAlgs", newListDisplay.join("\n"));

        return newList;
    }

    /**
     * Create algorithm list from user input
     * Filters by enabled subsets if any are defined
     * @returns {string[]} Algorithm list
     */
    function createAlgList() {
        const textarea = document.getElementById("userDefinedAlgs");
        if (!textarea) {
            console.warn("userDefinedAlgs textarea not found");
            return [];
        }

        // First validate all algs
        findMistakesInUserAlgs(textarea.value.split("\n"));

        // Parse subsets from the textarea
        const { subsets, allAlgs } = parseSubsets(textarea.value);
        parsedSubsets = subsets;

        // Load enabled subsets from localStorage
        loadEnabledSubsets();

        // If no subsets defined or all enabled, return all algs
        if (subsets.length === 0 || subsets.length === 1 && subsets[0].name === "Uncategorized") {
            algList = allAlgs;
        } else if (enabledSubsets.size === 0) {
            // No subsets selected = treat as all selected
            algList = allAlgs;
        } else {
            // Filter by enabled subsets
            algList = [];
            for (const subset of subsets) {
                if (enabledSubsets.has(subset.name)) {
                    algList.push(...subset.algs);
                }
            }
        }

        if (algList.length === 0) {
            alert("Please enter some algs into the User Defined Algs box.");
        }

        return algList;
    }

    /**
     * Update subsets from current input and refresh UI
     * Called when "Update Sets" button is clicked
     */
    function updateSubsets() {
        const textarea = document.getElementById("userDefinedAlgs");
        if (!textarea) return;

        const { subsets } = parseSubsets(textarea.value);

        // Snapshot previous state to detect actual changes
        const prevSubsetNames = parsedSubsets.map(s => s.name).join('|');
        const prevEnabled = [...enabledSubsets].sort().join('|');

        parsedSubsets = subsets;

        // Load current enabled state
        loadEnabledSubsets();

        // Get current subset names
        const currentNames = new Set(subsets.map(s => s.name));

        // Remove any enabled subsets that no longer exist
        for (const name of enabledSubsets) {
            if (!currentNames.has(name)) {
                enabledSubsets.delete(name);
            }
        }

        // Don't auto-enable subsets - user prefers nothing selected by default

        saveEnabledSubsets();
        renderSubsetCheckboxes();

        // Only reset indices if subsets actually changed
        const newSubsetNames = subsets.map(s => s.name).join('|');
        const newEnabled = [...enabledSubsets].sort().join('|');
        if (newSubsetNames !== prevSubsetNames || newEnabled !== prevEnabled) {
            if (window.TrainerCore && window.TrainerCore.resetShuffledIndices) {
                window.TrainerCore.resetShuffledIndices();
            }
        }
    }

    /**
     * Render subset checkboxes in the UI
     */
    function renderSubsetCheckboxes() {
        const container = document.getElementById("subsetCheckboxes");
        if (!container) return;

        container.innerHTML = "";

        if (parsedSubsets.length === 0 || (parsedSubsets.length === 1 && parsedSubsets[0].name === "Uncategorized")) {
            container.style.display = "none";
            return;
        }

        container.style.display = "block";

        // Add Select All / Unselect All buttons
        const btnContainer = document.createElement("div");
        btnContainer.className = "mb-2";

        const selectAllBtn = document.createElement("button");
        selectAllBtn.type = "button";
        selectAllBtn.className = "btn btn-outline-secondary btn-sm me-2";
        selectAllBtn.textContent = "Select All";
        selectAllBtn.addEventListener("click", function() {
            parsedSubsets.forEach(s => enabledSubsets.add(s.name));
            saveEnabledSubsets();
            updateCheckboxStates();
            if (window.TrainerCore && window.TrainerCore.resetShuffledIndices) {
                window.TrainerCore.resetShuffledIndices();
            }
        });

        const unselectAllBtn = document.createElement("button");
        unselectAllBtn.type = "button";
        unselectAllBtn.className = "btn btn-outline-secondary btn-sm";
        unselectAllBtn.textContent = "Unselect All";
        unselectAllBtn.addEventListener("click", function() {
            enabledSubsets.clear();
            saveEnabledSubsets();
            updateCheckboxStates();
            if (window.TrainerCore && window.TrainerCore.resetShuffledIndices) {
                window.TrainerCore.resetShuffledIndices();
            }
        });

        btnContainer.appendChild(selectAllBtn);
        btnContainer.appendChild(unselectAllBtn);
        container.appendChild(btnContainer);

        // Checkbox container
        const checkboxContainer = document.createElement("div");
        checkboxContainer.id = "subsetCheckboxList";

        for (const subset of parsedSubsets) {
            const div = document.createElement("div");
            div.className = "form-check form-check-inline";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "form-check-input subset-checkbox";
            checkbox.id = "subset_" + subset.name.replace(/\s+/g, "_");
            checkbox.dataset.subsetName = subset.name;
            checkbox.checked = enabledSubsets.has(subset.name);
            checkbox.addEventListener("change", function() {
                if (this.checked) {
                    enabledSubsets.add(subset.name);
                } else {
                    enabledSubsets.delete(subset.name);
                }
                saveEnabledSubsets();
                // Reset shuffled indices when subset selection changes
                if (window.TrainerCore && window.TrainerCore.resetShuffledIndices) {
                    window.TrainerCore.resetShuffledIndices();
                }
            });

            const label = document.createElement("label");
            label.className = "form-check-label small";
            label.htmlFor = checkbox.id;
            label.textContent = subset.name;

            div.appendChild(checkbox);
            div.appendChild(label);
            checkboxContainer.appendChild(div);
        }

        container.appendChild(checkboxContainer);
    }

    /**
     * Update checkbox states to match enabledSubsets
     */
    function updateCheckboxStates() {
        const checkboxes = document.querySelectorAll(".subset-checkbox");
        checkboxes.forEach(cb => {
            cb.checked = enabledSubsets.has(cb.dataset.subsetName);
        });
    }

    /**
     * Load enabled subsets from localStorage
     */
    function loadEnabledSubsets() {
        const stored = localStorage.getItem("enabledSubsets");
        if (stored) {
            try {
                enabledSubsets = new Set(JSON.parse(stored));
            } catch (e) {
                enabledSubsets = new Set();
            }
        }
    }

    /**
     * Save enabled subsets to localStorage
     */
    function saveEnabledSubsets() {
        localStorage.setItem("enabledSubsets", JSON.stringify([...enabledSubsets]));
    }

    /**
     * Get parsed subsets
     * @returns {{name: string, algs: string[]}[]}
     */
    function getParsedSubsets() {
        return parsedSubsets;
    }

    /**
     * Get enabled subset names
     * @returns {Set<string>}
     */
    function getEnabledSubsets() {
        return enabledSubsets;
    }

    /**
     * Set enabled subsets
     * @param {string[]} names
     */
    function setEnabledSubsets(names) {
        enabledSubsets = new Set(names);
        saveEnabledSubsets();
    }

    /**
     * Clear all enabled subsets
     */
    function clearEnabledSubsets() {
        enabledSubsets = new Set();
        saveEnabledSubsets();
    }

    /**
     * Add an algorithm to the list
     * @param {string[]} list - Current algorithm list
     * @param {string} algorithm - Algorithm to add
     * @returns {string[]} Updated list
     */
    function addAlgToList(list, algorithm) {
        list = fixAlgorithms(list);
        if (!list.includes(algorithm)) {
            return [...list, algorithm];
        }
        return list;
    }

    /**
     * Remove an algorithm from the list
     * @param {string[]} list - Current algorithm list
     * @param {string} algorithm - Algorithm to remove
     * @returns {string[]} Updated list
     */
    function removeAlgFromList(list, algorithm) {
        list = fixAlgorithms(list);
        return list.filter(item => item !== algorithm);
    }

    /**
     * Get a random or sequential algorithm from a set
     * @param {string[]} set - Algorithm set
     * @param {boolean} goInOrder - Whether to go in order
     * @param {number} currentIndex - Current index (for ordered mode)
     * @returns {Object} {algorithm, nextIndex}
     */
    function getAlgFromSet(set, goInOrder = false, currentIndex = 0) {
        if (goInOrder) {
            const algorithm = set[currentIndex % set.length];
            return {
                algorithm,
                nextIndex: currentIndex + 1
            };
        }

        const rand = Math.floor(Math.random() * set.length);
        return {
            algorithm: set[rand],
            nextIndex: currentIndex
        };
    }

    /**
     * Update algorithm set statistics display
     * @param {string[]} list - Algorithm list
     */
    function updateAlgsetStatistics(list) {
        // Requires AlgorithmUtils.averageMovecount
        const averageMovecountFn = window.averageMovecount || (window.AlgorithmUtils && window.AlgorithmUtils.averageMovecount);

        if (!averageMovecountFn) {
            console.warn("averageMovecount function not available");
            return;
        }

        const stats = {
            "STM": averageMovecountFn(list, "btm", false).toFixed(3),
            "SQTM": averageMovecountFn(list, "bqtm", false).toFixed(3),
            "STM (including AUF)": averageMovecountFn(list, "btm", true).toFixed(3),
            "SQTM (including AUF)": averageMovecountFn(list, "bqtm", true).toFixed(3),
            "Number of algs": list.length
        };

        const table = document.getElementById("algsetStatistics");
        if (!table) return;

        table.innerHTML = "";

        const th = document.createElement("th");
        th.appendChild(document.createTextNode("Algset Statistics"));
        table.appendChild(th);

        for (const key in stats) {
            const tr = document.createElement("tr");
            const description = document.createElement("td");
            const value = document.createElement("td");
            description.appendChild(document.createTextNode(key));
            value.appendChild(document.createTextNode(stats[key]));
            tr.appendChild(description);
            tr.appendChild(value);
            table.appendChild(tr);
        }
    }

    /**
     * Add inverses of all algorithms to the list
     * For commutators, expand to moves first, then invert
     * @param {string[]} list - Algorithm list
     * @returns {string[]} List with inverses added (union)
     */
    function addInversesToList(list) {
        if (!list || list.length === 0) {
            return list;
        }

        const result = [...list];
        const existingSet = new Set(list.map(a => a.trim()));

        for (let i = 0; i < list.length; i++) {
            const alg = list[i].trim();
            if (!alg) continue;

            // Expand commutator to moves if needed
            let expandedAlg = alg;
            if (isCommutator(alg)) {
                expandedAlg = commToMoves(alg);
            }

            // Invert the algorithm using alg.cube.invert if available
            let invertedAlg = "";
            if (window.alg && window.alg.cube && window.alg.cube.invert) {
                try {
                    invertedAlg = alg.cube.invert(expandedAlg);
                } catch (e) {
                    // Fallback to simple inversion
                    invertedAlg = invertMoves(expandedAlg);
                }
            } else {
                // Fallback to simple inversion from helpers.js
                invertedAlg = invertMoves(expandedAlg);
            }

            // Add to result if not already present
            if (invertedAlg && !existingSet.has(invertedAlg.trim())) {
                result.push(invertedAlg.trim());
                existingSet.add(invertedAlg.trim());
            }
        }

        return result;
    }

    /**
     * Get current algorithm list
     * @returns {string[]}
     */
    function getAlgList() {
        return algList;
    }

    /**
     * Set algorithm list
     * @param {string[]} list
     */
    function setAlgList(list) {
        algList = list;
    }

    // Export to global scope
    window.AlgorithmList = {
        fixAlgorithms,
        findMistakesInUserAlgs,
        createAlgList,
        addAlgToList,
        removeAlgFromList,
        getAlgFromSet,
        updateAlgsetStatistics,
        addInversesToList,
        getAlgList,
        setAlgList,
        parseSubsets,
        updateSubsets,
        renderSubsetCheckboxes,
        getParsedSubsets,
        getEnabledSubsets,
        setEnabledSubsets,
        clearEnabledSubsets
    };

    // Also export individual functions for backward compatibility
    window.fixAlgorithms = fixAlgorithms;
    window.findMistakesInUserAlgs = findMistakesInUserAlgs;
    window.createAlgList = createAlgList;
    window.addAlgToList = addAlgToList;
    window.removeAlgFromList = removeAlgFromList;
    window.updateAlgsetStatistics = updateAlgsetStatistics;
    window.addInversesToList = addInversesToList;
    window.updateSubsets = updateSubsets;

})();
