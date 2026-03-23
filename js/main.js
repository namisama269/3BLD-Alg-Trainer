// main.js - Application entry point and module orchestration
//
// Module Load Order:
// 1. External libraries (alg.cubing.net, cubejs)
// 2. helpers.js
// 3. core/CubeState.js
// 4. core/AlgorithmUtils.js
// 5. visualCube.js
// 6. trainer/TimerModule.js
// 7. trainer/AlgorithmList.js
// 8. trainer/TrainerCore.js
// 9. ui/SettingsManager.js
// 10. ui/UIController.js
// 11. ui/VisualCubeController.js
// 12. keymaps.js
// 13. input/KeyboardController.js
// 14. cubeconnect.js (optional)
// 15. input/SmartCubeModule.js
// 16. visualCubeSettings.js
// 17. main.js (this file)

(function() {
    'use strict';

    // Main cube instance
    let cube = null;

    /**
     * Initialize the application
     */
    function init() {
        console.log("Alg Trainer: Initializing...");

        // Create main cube instance
        cube = new RubiksCube();
        window.cube = cube; // Make globally accessible for backward compatibility

        // Initialize cube solver
        if (window.Cube && window.Cube.initSolver) {
            Cube.initSolver();
        }

        // Initialize modules in order
        initVisualCube();
        initTrainer();
        initUI();
        initInputHandlers();
        initSmartCube();

        // Setup event handlers
        setupEventHandlers();

        // Initialize keymap editor
        initKeymapEditor();

        // Initial render
        if (cube) {
            cube.resetCube();

            // Apply initial preorientation from colourneutrality1 setting
            const cn1Element = document.getElementById("colourneutrality1");
            const cn1 = cn1Element ? cn1Element.value : localStorage.getItem("colourneutrality1") || "";
            console.log("Initial cube state (before preorientation):", cube.toString());
            if (cn1 && cn1.trim()) {
                // Apply preorientation directly to cube state
                cube.doAlgorithm(cn1.trim());
                console.log("After preorientation (" + cn1.trim() + "):", cube.toString());
            }
        }

        if (window.updateVirtualCube) {
            updateVirtualCube();
        }

        console.log("Alg Trainer: Initialization complete");
    }

    /**
     * Initialize visual cube controller
     */
    function initVisualCube() {
        if (window.VisualCubeController) {
            VisualCubeController.init(cube);
        }
    }

    /**
     * Initialize trainer core
     */
    function initTrainer() {
        if (window.TrainerCore) {
            TrainerCore.init(cube);

            // Set up callbacks
            TrainerCore.setOnCubeStateChanged(function() {
                // Sync preorientation from TrainerCore to VisualCubeController
                if (window.VisualCubeController && window.TrainerCore) {
                    const preorientation = TrainerCore.getCurrentPreorientation();
                    VisualCubeController.setCurrentPreorientation(preorientation);
                }
                if (window.updateVirtualCube) {
                    updateVirtualCube();
                }
            });

            TrainerCore.setOnScrambleGenerated(function() {
                // Update progress indicator after each scramble
                if (window.UIController && window.UIController.updateProgressIndicator) {
                    UIController.updateProgressIndicator();
                }
                // Update case count and bookmark display
                updateCaseInfoDisplay();
            });
        }

        // Hook into timer to record per-case solve data
        if (window.TimerModule) {
            TimerModule.setOnTimeStopped(function(solveTime) {
                if (window.TrainerCore) {
                    var algKey = TrainerCore.getCurrentAlgKey();
                    if (algKey) {
                        TrainerCore.recordSolve(algKey, solveTime.timeValue());
                        updateCaseInfoDisplay();
                    }
                }
            });
        }
    }

    /**
     * Initialize UI components
     */
    function initUI() {
        // Initialize UI controller
        if (window.UIController) {
            UIController.init();
        }

        // Load settings
        if (window.SettingsManager) {
            SettingsManager.loadAllSettings();
            SettingsManager.attachSettingsListeners({
                onUseVirtualChanged: function(checked) {
                    if (window.setVirtualCube) setVirtualCube(checked);
                    if (window.TimerModule) {
                        TimerModule.stopTimer(false);
                        TimerModule.setTimerText("0.00");
                    }
                },
                onHideTimerChanged: function(show) {
                    if (window.setTimerDisplay) setTimerDisplay(show);
                    if (window.TimerModule) {
                        TimerModule.stopTimer(false);
                        TimerModule.setTimerText("0.00");
                    }
                },
                onGoInOrderChanged: function(value) {
                    // Called for both legacy checkbox and new dropdown
                    // value can be boolean (legacy) or string (new dropdown)
                    if (window.TrainerCore) {
                        TrainerCore.resetShuffledIndices();
                    }
                    // Update progress indicator visibility
                    if (window.UIController && window.UIController.updateProgressIndicator) {
                        UIController.updateProgressIndicator();
                    }
                },
                onGoToNextCaseChanged: function(checked) {
                    if (window.isUsingVirtualCube && isUsingVirtualCube()) {
                        alert("Note: This option has no effect when using the virtual cube.");
                    }
                }
            });
        }

        // Apply initial settings
        const hideTimerElement = document.getElementById("hideTimer");
        if (hideTimerElement && window.setTimerDisplay) {
            setTimerDisplay(!hideTimerElement.checked);
        }

        const useVirtualElement = document.getElementById("useVirtual");
        if (useVirtualElement && window.setVirtualCube) {
            setVirtualCube(useVirtualElement.checked);
        }

        // User defined algs display
        const userDefinedAlgs = document.getElementById("userDefinedAlgs");
        if (userDefinedAlgs) {
            userDefinedAlgs.style.display = "block";
        }
    }

    /**
     * Initialize input handlers
     */
    function initInputHandlers() {
        console.log("initInputHandlers: KeyboardController available:", !!window.KeyboardController);
        console.log("initInputHandlers: Listener available:", !!window.Listener);
        if (window.KeyboardController) {
            KeyboardController.init();
        } else {
            console.warn("KeyboardController not found!");
        }
    }

    /**
     * Initialize smart cube module
     */
    function initSmartCube() {
        if (window.SmartCubeModule) {
            SmartCubeModule.init(cube);
            // Wire up move callback to TrainerCore for pivot handling
            SmartCubeModule.setOnMoveApplied(function(move) {
                if (window.TrainerCore && window.TrainerCore.applySmartCubeMove) {
                    TrainerCore.applySmartCubeMove(move);
                }
            });
        }
    }

    /**
     * Update the case info display (solve count + bookmark star)
     */
    function updateCaseInfoDisplay() {
        var countEl = document.getElementById("caseCount");
        var starEl = document.getElementById("starBtn");
        if (!window.TrainerCore) return;

        var algKey = TrainerCore.getCurrentAlgKey();
        if (countEl) {
            if (algKey) {
                var stats = TrainerCore.getCaseStatsFor(algKey);
                countEl.textContent = stats.count > 0 ? stats.count + "x" : "";
            } else {
                countEl.textContent = "";
            }
        }
        if (starEl) {
            if (algKey && TrainerCore.isBookmarked(algKey)) {
                starEl.innerHTML = '<i class="bi bi-star-fill"></i>';
                starEl.classList.add("text-warning");
                starEl.classList.remove("text-muted");
            } else {
                starEl.innerHTML = '<i class="bi bi-star"></i>';
                starEl.classList.remove("text-warning");
                starEl.classList.add("text-muted");
            }
        }
    }

    /**
     * Setup event handlers for buttons and UI elements
     */
    function setupEventHandlers() {
        // Clear times button
        const clearTimes = document.getElementById("clearTimes");
        if (clearTimes) {
            clearTimes.addEventListener("click", function() {
                if (window.TimerModule) {
                    TimerModule.clearTimes();
                }
            });
        }

        // On-screen navigation buttons
        const onscreenLeft = document.getElementById("onscreenLeft");
        if (onscreenLeft) {
            onscreenLeft.addEventListener("click", function() {
                if (window.TrainerCore) {
                    TrainerCore.handleLeftButton();
                } else if (window.handleLeftButton) {
                    handleLeftButton();
                }
            });
        }

        const onscreenRight = document.getElementById("onscreenRight");
        if (onscreenRight) {
            onscreenRight.addEventListener("click", function() {
                if (window.TrainerCore) {
                    TrainerCore.handleRightButton();
                } else if (window.handleRightButton) {
                    handleRightButton();
                }
            });
        }

        // Next scramble button
        const nextScrambleButton = document.querySelector('button[name="nextScrambleButton"]');
        if (nextScrambleButton) {
            nextScrambleButton.addEventListener('click', function() {
                if (window.TrainerCore) {
                    TrainerCore.nextScramble();
                } else if (window.nextScramble) {
                    nextScramble();
                }
            });
        }

        // Show solution button
        const showSolutionButton = document.querySelector('button[name="showSolutionButton"]');
        if (showSolutionButton) {
            showSolutionButton.addEventListener('click', function() {
                if (window.TrainerCore) {
                    TrainerCore.displayAlgorithmForPreviousTest();
                } else if (window.displayAlgorithmForPreviousTest) {
                    displayAlgorithmForPreviousTest();
                }
            });
        }

        // Add algorithm button
        const addAlgBtn = document.getElementById("addAlgBtn");
        if (addAlgBtn) {
            addAlgBtn.addEventListener("click", function() {
                const algorithmHistory = window.TrainerCore ?
                    TrainerCore.getAlgorithmHistory() : window.algorithmHistory || [];
                const historyIndex = window.TrainerCore ?
                    TrainerCore.getHistoryIndex() : window.historyIndex || 0;

                if (algorithmHistory.length === 0 || !algorithmHistory[historyIndex]) {
                    console.warn("No algorithm to add.");
                    return;
                }

                const algToAdd = algorithmHistory[historyIndex].rawAlgs[0];
                console.log("algToAdd", algToAdd);

                if (!algToAdd) {
                    console.warn("No algorithm to add.");
                    return;
                }

                let algList = window.AlgorithmList ?
                    AlgorithmList.getAlgList() : window.algList || [];

                if (window.addAlgToList) {
                    algList = addAlgToList(algList, algToAdd);
                }

                console.log("Updated list:", algList);

                const textarea = document.getElementById("userDefinedAlgs");
                if (textarea) {
                    textarea.value = algList.join('\n');
                }

                if (window.AlgorithmList) {
                    AlgorithmList.setAlgList(algList);
                }
            });
        }

        // Remove algorithm button
        const removeAlgBtn = document.getElementById("removeAlgBtn");
        if (removeAlgBtn) {
            removeAlgBtn.addEventListener("click", function() {
                const algorithmHistory = window.TrainerCore ?
                    TrainerCore.getAlgorithmHistory() : window.algorithmHistory || [];
                const historyIndex = window.TrainerCore ?
                    TrainerCore.getHistoryIndex() : window.historyIndex || 0;

                if (algorithmHistory.length === 0 || !algorithmHistory[historyIndex]) {
                    console.warn("No algorithm to remove.");
                    return;
                }

                const algToRemove = algorithmHistory[historyIndex].rawAlgs[0];
                console.log("algToRemove", algToRemove);

                if (!algToRemove) {
                    console.warn("No algorithm to remove.");
                    return;
                }

                let algList = window.AlgorithmList ?
                    AlgorithmList.getAlgList() : window.algList || [];

                const removedIndex = algList.indexOf(algToRemove);

                if (window.removeAlgFromList) {
                    algList = removeAlgFromList(algList, algToRemove);
                }

                // Adjust ordered/shuffled indices to preserve progress
                if (removedIndex !== -1 && window.TrainerCore && TrainerCore.notifyAlgRemoved) {
                    TrainerCore.notifyAlgRemoved(removedIndex, algList);
                }

                console.log("Updated list:", algList);

                const textarea = document.getElementById("userDefinedAlgs");
                if (textarea) {
                    textarea.value = algList.join('\n');
                }

                if (window.AlgorithmList) {
                    AlgorithmList.setAlgList(algList);
                }
            });
        }

        // Update Sets button
        const updateSetsBtn = document.getElementById("updateSetsBtn");
        if (updateSetsBtn) {
            updateSetsBtn.addEventListener("click", function() {
                if (window.AlgorithmList && window.AlgorithmList.updateSubsets) {
                    AlgorithmList.updateSubsets();
                }
            });
        }

        // Start Training button
        // Start Training button
        const startTrainingBtn = document.getElementById("startTrainingBtn");
        if (startTrainingBtn) {
            startTrainingBtn.addEventListener("click", function() {
                if (window.UIController) {
                    UIController.showTrainerScreen();
                }
                if (window.TrainerCore) {
                    TrainerCore.nextScramble();
                }
            });
        }

        // Back to Config button (full reset - goes back to setup)
        const backToConfigBtn = document.getElementById("backToConfigBtn");
        if (backToConfigBtn) {
            backToConfigBtn.addEventListener("click", function() {
                if (window.UIController) {
                    UIController.showConfigScreen();
                }
                if (window.TimerModule) {
                    TimerModule.stopTimer(false);
                }
            });
        }

        // Star/bookmark button
        const starBtn = document.getElementById("starBtn");
        if (starBtn) {
            starBtn.addEventListener("click", function() {
                if (window.TrainerCore) {
                    TrainerCore.toggleBookmark(TrainerCore.getCurrentAlgKey());
                    updateCaseInfoDisplay();
                }
            });
        }

        // Update case info when navigating history
        const origLeft = document.getElementById("onscreenLeft");
        const origRight = document.getElementById("onscreenRight");
        if (origLeft) {
            origLeft.addEventListener("click", function() {
                setTimeout(updateCaseInfoDisplay, 0);
            });
        }
        if (origRight) {
            origRight.addEventListener("click", function() {
                setTimeout(updateCaseInfoDisplay, 0);
            });
        }

        // Bookmark filter toggle
        const bookmarkFilterBtn = document.getElementById("bookmarkFilterBtn");
        if (bookmarkFilterBtn) {
            bookmarkFilterBtn.addEventListener("click", function() {
                if (window.TrainerCore) {
                    var active = !TrainerCore.isBookmarkFilterActive();
                    TrainerCore.setBookmarkFilter(active);
                    if (active) {
                        bookmarkFilterBtn.classList.remove("btn-outline-secondary");
                        bookmarkFilterBtn.classList.add("btn-warning");
                        bookmarkFilterBtn.innerHTML = '<i class="bi bi-star-fill"></i>';
                    } else {
                        bookmarkFilterBtn.classList.remove("btn-warning");
                        bookmarkFilterBtn.classList.add("btn-outline-secondary");
                        bookmarkFilterBtn.innerHTML = '<i class="bi bi-star"></i>';
                    }
                }
            });
        }

        // Initialize Presets Manager modal
        if (window.PresetsManager) {
            PresetsManager.initModal();
        }

        // Generator Generate button
        const generateBtn = document.getElementById("generateBtn");
        if (generateBtn) {
            generateBtn.addEventListener("click", handleGenerateClick);
        }

        // Clear generator cache when input changes
        const generatorInput = document.getElementById("generatorInput");
        if (generatorInput) {
            generatorInput.addEventListener("input", function() {
                // Update status to indicate regeneration needed
                const statusEl = document.getElementById("generatorStatus");
                if (statusEl) {
                    const input = generatorInput.value.trim();
                    if (input && window.GeneratorParser && !GeneratorParser.hasCachedGeneration(input)) {
                        statusEl.textContent = "Click 'Generate' to create algorithm list";
                        statusEl.className = "text-warning small mb-3";
                    } else {
                        statusEl.textContent = "";
                    }
                }
            });
        }
    }

    /**
     * Handle Generate button click
     */
    async function handleGenerateClick() {
        const generateBtn = document.getElementById("generateBtn");
        const generatorInput = document.getElementById("generatorInput");
        const statusEl = document.getElementById("generatorStatus");
        const caseCountEl = document.getElementById("generatorCaseCount");

        if (!generatorInput || !window.GeneratorParser) {
            return;
        }

        const input = generatorInput.value.trim();
        if (!input) {
            if (statusEl) {
                statusEl.textContent = "Please enter a generator expression";
                statusEl.className = "text-warning small mb-3";
            }
            return;
        }

        // Validate syntax first
        const validation = GeneratorParser.validateSyntax(input);
        if (!validation.valid) {
            if (statusEl) {
                statusEl.textContent = "Syntax error: " + validation.error;
                statusEl.className = "text-danger small mb-3";
            }
            return;
        }

        // Show progress modal
        const progressModal = new bootstrap.Modal(document.getElementById("generatorProgressModal"));
        const progressText = document.getElementById("generatorProgressText");
        const progressBar = document.getElementById("generatorProgressBar");
        const progressDetail = document.getElementById("generatorProgressDetail");

        progressModal.show();
        generateBtn.disabled = true;

        try {
            // Generate with progress updates
            const algList = await GeneratorParser.generateAsync(input, function(progress) {
                if (progressText) {
                    progressText.textContent = progress.phase;
                }
                if (progressBar) {
                    progressBar.style.width = progress.percent + "%";
                }
                if (progressDetail) {
                    progressDetail.textContent = progress.detail;
                }
            });

            // Update UI with results
            if (caseCountEl) {
                caseCountEl.textContent = algList.length + " algorithms generated";
            }
            if (statusEl) {
                statusEl.textContent = "Ready! Click 'Next Scramble' to start training.";
                statusEl.className = "text-success small mb-3";
            }

            // Save to localStorage
            localStorage.setItem("generatorInput", input);

        } catch (error) {
            console.error("Generation error:", error);
            if (statusEl) {
                statusEl.textContent = "Error: " + error.message;
                statusEl.className = "text-danger small mb-3";
            }
        } finally {
            progressModal.hide();
            generateBtn.disabled = false;
        }
    }

    /**
     * Get the main cube instance
     * @returns {RubiksCube}
     */
    function getCube() {
        return cube;
    }

    // ===== Inline Keymap Editor =====

    var keymapEditing = -1;
    var keymapData = null;

    function initKeymapEditor() {
        keymapData = window.getKeyMaps ? getKeyMaps() : [];
        renderKeymapTable();

        var addBtn = document.getElementById("addKeymapBtn");
        if (addBtn) {
            addBtn.addEventListener("click", function() {
                keymapData.push([new KeyCombo(""), ""]);
                renderKeymapTable();
                startKeymapEdit(keymapData.length - 1);
            });
        }

        var resetBtn = document.getElementById("resetKeymapBtn");
        if (resetBtn) {
            resetBtn.addEventListener("click", function() {
                if (window.defaultKeymaps) {
                    keymapData = JSON.parse(JSON.stringify(defaultKeymaps));
                    // Restore KeyCombo objects
                    for (var i = 0; i < keymapData.length; i++) {
                        var kc = new KeyCombo("");
                        Object.assign(kc, keymapData[i][0]);
                        keymapData[i][0] = kc;
                    }
                    saveKeymaps();
                    renderKeymapTable();
                }
            });
        }
    }

    function saveKeymaps() {
        localStorage.setItem("keymaps", JSON.stringify(keymapData));
    }

    function renderKeymapTable() {
        var tbody = document.getElementById("keymapTableBody");
        if (!tbody) return;
        tbody.innerHTML = "";
        keymapEditing = -1;

        for (var i = 0; i < keymapData.length; i++) {
            (function(idx) {
                var entry = keymapData[idx];
                var tr = document.createElement("tr");
                tr.style.cursor = "pointer";

                var tdKey = document.createElement("td");
                tdKey.textContent = entry[0].toString();
                var tdMove = document.createElement("td");
                tdMove.textContent = entry[1];
                var tdActions = document.createElement("td");
                tdActions.className = "text-end";

                tr.appendChild(tdKey);
                tr.appendChild(tdMove);
                tr.appendChild(tdActions);

                tr.addEventListener("click", function() {
                    startKeymapEdit(idx);
                });

                tbody.appendChild(tr);
            })(i);
        }
    }

    function startKeymapEdit(idx) {
        if (keymapEditing === idx) return;
        renderKeymapTable(); // reset any open editor

        keymapEditing = idx;
        var tbody = document.getElementById("keymapTableBody");
        if (!tbody || !tbody.children[idx]) return;

        var tr = tbody.children[idx];
        var entry = keymapData[idx];
        var newKc = entry[0];

        // Key input
        var tdKey = tr.children[0];
        tdKey.innerHTML = "";
        var keyInput = document.createElement("input");
        keyInput.type = "text";
        keyInput.className = "form-control form-control-sm";
        keyInput.value = entry[0].toString();
        keyInput.addEventListener("keydown", function(e) {
            e.preventDefault();
            e.stopPropagation();
            var kc = window.keyEventToKeyCombo(e, true);
            newKc = window.keyEventToKeyCombo(e, false) || newKc;
            keyInput.value = kc.toString();
        });
        tdKey.appendChild(keyInput);

        // Move input
        var tdMove = tr.children[1];
        tdMove.innerHTML = "";
        var moveInput = document.createElement("input");
        moveInput.type = "text";
        moveInput.className = "form-control form-control-sm";
        moveInput.value = entry[1];
        tdMove.appendChild(moveInput);

        // Action buttons
        var tdActions = tr.children[2];
        tdActions.innerHTML = "";

        var saveBtn = document.createElement("button");
        saveBtn.className = "btn btn-outline-primary btn-sm me-1";
        saveBtn.innerHTML = '<i class="bi bi-check"></i>';
        saveBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            keymapData[idx] = [newKc, moveInput.value];
            saveKeymaps();
            renderKeymapTable();
        });

        var delBtn = document.createElement("button");
        delBtn.className = "btn btn-outline-danger btn-sm";
        delBtn.innerHTML = '<i class="bi bi-trash"></i>';
        delBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            keymapData.splice(idx, 1);
            saveKeymaps();
            renderKeymapTable();
        });

        tdActions.appendChild(saveBtn);
        tdActions.appendChild(delBtn);

        tr.onclick = null;
        keyInput.focus();
    }

    // Export to global scope
    window.AlgTrainer = {
        init,
        getCube
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
