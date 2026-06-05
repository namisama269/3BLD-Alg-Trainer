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

        // Initialize algorithm viewer
        if (window.AlgorithmViewer) {
            AlgorithmViewer.init();
        }

        // MaskEditor is now modal-based — no inline init needed

        // Initialize orientation selectors
        if (window.OrientationSelector) {
            OrientationSelector.create('cn1Selector', 'colourneutrality1', { allowCustom: true });
            OrientationSelector.create('scOrientationSelector', 'smartCubeOrientation', { allowCustom: true });
        }

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

        // Show subset checkboxes and statistics on startup
        refreshAlgDisplay();

        // Refresh stats when subset selection changes
        if (window.AlgorithmList && AlgorithmList.setOnSubsetSelectionChanged) {
            AlgorithmList.setOnSubsetSelectionChanged(refreshAlgDisplay);
        }

        console.log("Alg Trainer: Initialization complete");
    }

    /**
     * Open a modal showing all bookmarked (starred) algorithms with cube preview.
     */
    function openBookmarkViewer() {
        if (!window.TrainerCore) return;
        var bookmarks = TrainerCore.getBookmarks();
        if (!bookmarks || bookmarks.size === 0) {
            alert('No bookmarked algorithms yet. Star cases during training to add them here.');
            return;
        }

        // Ensure modal exists
        var modal = document.getElementById('bookmarkViewerModal');
        if (!modal) {
            var html =
                '<div class="modal fade" id="bookmarkViewerModal" tabindex="-1" aria-hidden="true">' +
                '<div class="modal-dialog modal-lg modal-dialog-scrollable">' +
                '<div class="modal-content">' +
                '<div class="modal-header">' +
                '<h5 class="modal-title"><i class="bi bi-star-fill text-warning"></i> Starred Algorithms</h5>' +
                '<button type="button" class="btn-close" data-bs-dismiss="modal"></button>' +
                '</div>' +
                '<div class="modal-body">' +
                '<div class="row g-3">' +
                '<div class="col-md-5"><div id="bookmarkList" style="max-height:500px;overflow-y:auto;"></div></div>' +
                '<div class="col-md-7"><div id="bookmarkPreview" style="max-width:100%;"></div>' +
                '<p id="bookmarkSelectedAlg" class="mt-2 mb-0 fw-medium text-center" style="font-family:\'Roboto Mono\',monospace;font-size:0.9rem;">Select an algorithm to preview</p></div>' +
                '</div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>' +
                '</div></div></div></div>';
            document.body.insertAdjacentHTML('beforeend', html);
            modal = document.getElementById('bookmarkViewerModal');
        }

        // Populate list
        var list = document.getElementById('bookmarkList');
        list.innerHTML = '';
        var listGroup = document.createElement('div');
        listGroup.className = 'list-group';
        var bookmarkArr = Array.from(bookmarks);
        var selectedEl = null;

        // Preview VisualCube (reuse pattern from AlgorithmViewer)
        var previewVC = null;
        var previewCube = new RubiksCube();
        var previewContainer = document.getElementById('bookmarkPreview');

        function syncPreviewVC() {
            var src = window.vc;
            if (!src) return;
            if (!previewVC) {
                previewVC = new VisualCube(src.width, src.height, src.scale,
                    src.thetaX, src.thetaY, src.thetaZ, src.cubeSize, src.gapSize, src.edgeGapRatio);
            } else {
                previewVC.scale = src.scale;
                previewVC.thetaX = src.thetaX;
                previewVC.thetaY = src.thetaY;
                previewVC.thetaZ = src.thetaZ;
                previewVC.gapSize = src.gapSize;
                previewVC.edgeGapRatio = src.edgeGapRatio;
                previewVC.faceStickers = VisualCube.getFaceStickers(src.cubeSize, src.gapSize, src.edgeGapRatio);
            }
            previewVC.showBaseColor = src.showBaseColor;
            previewVC.baseColor = src.baseColor;
            previewVC.stickerBorderColor = src.stickerBorderColor;
            previewVC.stickerBorderShade = src.stickerBorderShade;
            previewVC.stickerBorderWidth = src.stickerBorderWidth;
            previewVC.debugMode = false;
            previewVC.stickerColors = {};
            for (var key in src.stickerColors) previewVC.stickerColors[key] = src.stickerColors[key];
        }

        function showAlgPreview(algString) {
            syncPreviewVC();
            if (!previewVC || !previewCube) return;

            var moves = algString;
            if (window.isCommutator && isCommutator(algString)) moves = commToMoves(algString);
            if (window.alg && window.alg.cube && window.alg.cube.invert) {
                try { moves = alg.cube.invert(moves); } catch (e) { if (window.invertMoves) moves = invertMoves(moves); }
            } else if (window.invertMoves) { moves = invertMoves(moves); }

            previewCube.resetCube();
            var cn1El = document.getElementById('colourneutrality1');
            var cn1 = cn1El ? cn1El.value : (localStorage.getItem('colourneutrality1') || '');
            if (cn1 && cn1.trim()) previewCube.doAlgorithm(cn1.trim());
            previewCube.resetMask();
            previewCube.doAlgorithm(moves);

            var useMaskEl = document.getElementById('useMask');
            var useMask = useMaskEl ? useMaskEl.checked : true;
            var initialMaskEl = document.getElementById('initialMask');
            var initialMask = (useMask && initialMaskEl) ? initialMaskEl.value : '';
            var cubeStr = (initialMask && initialMask.length === 54) ? previewCube.toInitialMaskedString(initialMask) : previewCube.toString();
            var finalMaskEl = document.getElementById('finalMask');
            var finalMask = (useMask && finalMaskEl) ? finalMaskEl.value : '';
            if (finalMask && finalMask.length === 54) {
                for (var k = 0; k < 54; k++) {
                    if (finalMask[k] === 'x') cubeStr = cubeStr.substring(0, k) + 'x' + cubeStr.substring(k + 1);
                }
            }

            previewVC.cubeString = cubeStr;
            previewVC.drawSVG(previewContainer);
            var label = document.getElementById('bookmarkSelectedAlg');
            if (label) label.textContent = algString;
        }

        bookmarkArr.forEach(function(algStr, idx) {
            var item = document.createElement('div');
            item.className = 'list-group-item list-group-item-action';
            item.style.cssText = 'cursor:pointer; font-family:"Roboto Mono",monospace; font-size:0.82rem; display:flex; align-items:center; gap:8px; padding:6px 10px;';

            var num = document.createElement('span');
            num.textContent = (idx + 1) + '.';
            num.style.cssText = 'opacity:0.45; min-width:2.2em; text-align:right; font-size:0.78rem; flex-shrink:0;';

            var text = document.createElement('span');
            text.textContent = algStr;
            text.style.cssText = 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;';

            var unstarBtn = document.createElement('button');
            unstarBtn.className = 'btn btn-link text-warning p-0';
            unstarBtn.innerHTML = '<i class="bi bi-star-fill"></i>';
            unstarBtn.title = 'Remove bookmark';
            unstarBtn.style.cssText = 'font-size:0.85rem; flex-shrink:0;';

            (function(alg, el, idx) {
                el.addEventListener('click', function() {
                    if (selectedEl) selectedEl.classList.remove('active');
                    el.classList.add('active');
                    selectedEl = el;
                    showAlgPreview(alg);
                });
                unstarBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (!confirm('Remove bookmark for this algorithm?')) return;
                    TrainerCore.toggleBookmark(alg);
                    el.remove();
                    if (selectedEl === el) {
                        previewContainer.innerHTML = '';
                        var lbl = document.getElementById('bookmarkSelectedAlg');
                        if (lbl) lbl.textContent = 'Select an algorithm to preview';
                        selectedEl = null;
                    }
                    var remaining = document.querySelectorAll('#bookmarkList .list-group-item');
                    if (remaining.length === 0) {
                        list.innerHTML = '<p class="text-muted text-center py-3">No bookmarked algorithms.</p>';
                    }
                });
            })(algStr, item, idx);

            item.appendChild(num);
            item.appendChild(text);
            item.appendChild(unstarBtn);
            listGroup.appendChild(item);
        });

        list.appendChild(listGroup);

        // Show modal
        var bsModal = bootstrap.Modal.getOrCreateInstance(modal);
        bsModal.show();
    }

    /**
     * Refresh subset checkboxes and algorithm statistics from the current textarea content.
     */
    var _statsTimer = null;
    function refreshAlgDisplay() {
        if (!window.AlgorithmList) return;
        AlgorithmList.updateSubsets();
        // Debounce the expensive statistics computation
        clearTimeout(_statsTimer);
        _statsTimer = setTimeout(refreshAlgStatistics, 50);
    }

    var _statsVersion = 0;
    function refreshAlgStatistics() {
        if (!window.AlgorithmList) return;
        var textarea = document.getElementById("userDefinedAlgs");
        if (!textarea) return;

        var parsed = AlgorithmList.parseSubsets(textarea.value);
        var enabled = AlgorithmList.getEnabledSubsets();
        var hasSubsets = parsed.subsets.length > 1 || (parsed.subsets.length === 1 && parsed.subsets[0].name !== "Uncategorized");
        var algs;
        if (hasSubsets) {
            algs = [];
            parsed.subsets.forEach(function(s) {
                if (enabled.has(s.name)) {
                    algs = algs.concat(s.algs);
                }
            });
        } else {
            algs = parsed.allAlgs;
        }

        // Compute movecounts async so UI stays responsive
        // Keep the old table visible until the new one is ready
        var version = ++_statsVersion;
        var capturedAlgs = algs;
        setTimeout(function() {
            if (version !== _statsVersion) return; // stale
            AlgorithmList.updateAlgsetStatistics(capturedAlgs);
        }, 10);
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
                    // Save solve time to the current history entry
                    var history = TrainerCore.getAlgorithmHistory();
                    var idx = TrainerCore.getHistoryIndex();
                    if (history && history[idx]) {
                        history[idx].solveTime = solveTime;
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
                // Convert Google Sheets format (quoted multi-line cells) to native ! syntax
                var textarea = document.getElementById("userDefinedAlgs");
                if (textarea && window.AlgorithmList && AlgorithmList.convertGoogleSheetsFormat) {
                    var converted = AlgorithmList.convertGoogleSheetsFormat(textarea.value);
                    if (converted !== textarea.value) {
                        textarea.value = converted;
                        localStorage.setItem("userDefinedAlgs", converted);
                    }
                }
                refreshAlgDisplay();
            });
        }

        // Reload settings into modal when it opens (syncs config screen → modal)
        const settingsModal = document.getElementById("settingsModal");
        if (settingsModal) {
            settingsModal.addEventListener("shown.bs.modal", function() {
                if (window.SettingsManager) {
                    SettingsManager.loadAllSettings();
                }
                if (window.VisualCubeSettings) {
                    var vcSettings = VisualCubeSettings.loadSettings();
                    VisualCubeSettings.updateUI(vcSettings);
                }
                // Init modal orientation selectors on first open
                if (window.OrientationSelector) {
                    OrientationSelector.create('mCn1Selector', 'colourneutrality1', { allowCustom: true });
                    OrientationSelector.create('mScOrientationSelector', 'smartCubeOrientation', { allowCustom: true });
                }
            });
        }

        // Auto-update sets when Algorithms modal closes
        const algorithmsModal = document.getElementById("algorithmsModal");
        if (algorithmsModal) {
            algorithmsModal.addEventListener("hidden.bs.modal", function() {
                refreshAlgDisplay();
            });
        }

        // Keep subsets and stats live while editing
        const userAlgsTextarea = document.getElementById("userDefinedAlgs");
        if (userAlgsTextarea) {
            let debounceTimer = null;
            userAlgsTextarea.addEventListener("input", function() {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(refreshAlgDisplay, 400);
            });
        }

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

        // Bookmark viewer button — opens a modal showing all starred algorithms
        const bookmarkFilterBtn = document.getElementById("bookmarkFilterBtn");
        if (bookmarkFilterBtn) {
            bookmarkFilterBtn.addEventListener("click", function() {
                openBookmarkViewer();
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
