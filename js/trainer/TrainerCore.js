// TrainerCore.js - Core trainer logic, AlgTest class, and scramble generation
// Depends on: core/CubeState.js (RubiksCube)
// Depends on: core/AlgorithmUtils.js
// Depends on: trainer/AlgorithmList.js
// Depends on: trainer/TimerModule.js
// Depends on: helpers.js (commToMoves)

(function() {
    'use strict';

    // Trainer state
    let algorithmHistory = [];
    let historyIndex = 0;
    let currentAlgIndex = 0;
    let currentPreorientation = "";
    let shuffledIndices = []; // For shuffled order mode
    let lastAlgListHash = null; // For detecting algorithm list changes
    let lastAlgListLength = 0; // Store length for progress indicator
    let lastStatisticsHash = null; // For caching statistics calculations
    let cube = null; // Set by init()
    let trainingStarted = false; // Track if first scramble has been generated
    let cumulativePivotRotation = ""; // Track cumulative pivot rotations for smart cube translation
    let bookmarkFilterActive = false; // Filter to bookmarked algs only
    let consecutiveUMoves = 0; // Track consecutive U moves for 4xU reset

    // Per-case practice tracking
    // Format: { "R U R' U'": { count: 5, times: [1.23, 0.98, ...] }, ... }
    let caseStats = {};

    // Bookmarked algorithms
    // Format: Set of algorithm strings
    let bookmarks = new Set();

    // Callbacks
    let onCubeStateChanged = null;
    let onScrambleGenerated = null;

    // ===== Case Stats & Bookmarks persistence =====

    function loadCaseStats() {
        try {
            var saved = localStorage.getItem('algTrainerCaseStats');
            if (saved) {
                caseStats = JSON.parse(saved);
            }
        } catch (e) {
            caseStats = {};
        }
    }

    function saveCaseStats() {
        localStorage.setItem('algTrainerCaseStats', JSON.stringify(caseStats));
    }

    function loadBookmarks() {
        try {
            var saved = localStorage.getItem('algTrainerBookmarks');
            if (saved) {
                bookmarks = new Set(JSON.parse(saved));
            }
        } catch (e) {
            bookmarks = new Set();
        }
    }

    function saveBookmarks() {
        localStorage.setItem('algTrainerBookmarks', JSON.stringify(Array.from(bookmarks)));
    }

    /**
     * Record a solve for an algorithm
     * @param {string} algKey - The algorithm string
     * @param {number} time - Solve time in seconds
     */
    function recordSolve(algKey, time) {
        if (!algKey) return;
        if (!caseStats[algKey]) {
            caseStats[algKey] = { count: 0, times: [] };
        }
        caseStats[algKey].count++;
        caseStats[algKey].times.push(time);
        saveCaseStats();
    }

    /**
     * Get stats for a specific algorithm
     * @param {string} algKey
     * @returns {Object} { count, times, mean }
     */
    function getCaseStatsFor(algKey) {
        var stats = caseStats[algKey];
        if (!stats || stats.count === 0) {
            return { count: 0, times: [], mean: 0 };
        }
        var sum = 0;
        for (var i = 0; i < stats.times.length; i++) {
            sum += stats.times[i];
        }
        return {
            count: stats.count,
            times: stats.times,
            mean: sum / stats.times.length
        };
    }

    /**
     * Get all case stats
     * @returns {Object}
     */
    function getAllCaseStats() {
        return caseStats;
    }

    /**
     * Clear all case stats
     */
    function clearCaseStats() {
        caseStats = {};
        saveCaseStats();
    }

    /**
     * Toggle bookmark for an algorithm
     * @param {string} algKey
     * @returns {boolean} New bookmark state
     */
    function toggleBookmark(algKey) {
        if (!algKey) return false;
        if (bookmarks.has(algKey)) {
            bookmarks.delete(algKey);
        } else {
            bookmarks.add(algKey);
        }
        saveBookmarks();
        return bookmarks.has(algKey);
    }

    /**
     * Check if an algorithm is bookmarked
     * @param {string} algKey
     * @returns {boolean}
     */
    function isBookmarked(algKey) {
        return bookmarks.has(algKey);
    }

    /**
     * Get all bookmarked algorithms
     * @returns {Set}
     */
    function getBookmarks() {
        return bookmarks;
    }

    /**
     * Get the algorithm key for the current history item
     * @returns {string|null}
     */
    function getCurrentAlgKey() {
        var test = algorithmHistory[historyIndex];
        if (test && test.rawAlgs && test.rawAlgs.length > 0) {
            return test.rawAlgs[0];
        }
        return null;
    }

    function setBookmarkFilter(active) {
        bookmarkFilterActive = active;
    }

    function isBookmarkFilterActive() {
        return bookmarkFilterActive;
    }

    /**
     * AlgTest class - represents a single algorithm test/solve
     */
    class AlgTest {
        constructor(rawAlgs, scramble, solutions, preorientation, solveTime, time, visualCubeView, orientRandPart) {
            this.rawAlgs = rawAlgs;
            this.scramble = scramble;
            this.solutions = solutions;

            // Safely simplify preorientation if alg library is available
            if (window.alg && window.alg.cube) {
                this.preorientation = alg.cube.simplify(preorientation);
            } else {
                this.preorientation = preorientation;
            }

            currentPreorientation = this.preorientation;
            this.solveTime = solveTime;
            this.time = time;
            this.visualCubeView = visualCubeView;
            this.orientRandPart = orientRandPart;
        }
    }

    /**
     * Initialize the trainer with a cube instance
     * @param {RubiksCube} cubeInstance
     */
    function init(cubeInstance) {
        cube = cubeInstance;
        loadCaseStats();
        loadBookmarks();
    }

    /**
     * Find rotation to fix pivot position
     * Uses a temporary cube to avoid corrupting main cube state
     * @param {number} pivotIndex - Index of the pivot sticker
     * @param {Array} cubestateCopy - Deep copy of the cube's cubestate array (includes mask)
     * @returns {string} Rotation to fix the pivot
     */
    function findRotationToFixPivot(pivotIndex, cubestateCopy) {
        const rotations = ["", "x", "x'", "x2", "y", "y'", "y2", "z", "z'", "z2"];
        const testCube = new RubiksCube();

        for (let i = 0; i < rotations.length; ++i) {
            for (let j = 0; j < rotations.length; ++j) {
                let rotation = rotations[i] + ' ' + rotations[j];
                rotation = rotation.trim();

                // Restore the full cubestate (including mask) from the copy
                for (let k = 0; k < 54; k++) {
                    testCube.cubestate[k][0] = cubestateCopy[k][0];
                    testCube.cubestate[k][1] = cubestateCopy[k][1];
                }

                if (rotation) {
                    testCube.doAlgorithm(rotation);
                }

                // Pivot is in place if the origin position matches the pivot index
                if (testCube.cubestate[pivotIndex][1] === pivotIndex) {
                    return rotation;
                }
            }
        }

        return "";
    }

    /**
     * Translate a move based on cumulative pivot rotations
     * @param {string} move - The move to translate (e.g., "R'", "U2")
     * @param {string} rotationStr - Cumulative rotation string (e.g., "z", "x2 y")
     * @returns {string} - Translated move
     */
    function translateMoveForRotation(move, rotationStr) {
        if (!rotationStr || rotationStr.trim() === '') {
            return move;
        }

        // Build translation table for the rotation
        const SINGLE_ROTATION_TRANSLATIONS = {
            '': { U: 'U', D: 'D', F: 'F', B: 'B', R: 'R', L: 'L' },
            'x': { U: 'B', D: 'F', F: 'U', B: 'D', R: 'R', L: 'L' },
            "x'": { U: 'F', D: 'B', F: 'D', B: 'U', R: 'R', L: 'L' },
            'x2': { U: 'D', D: 'U', F: 'B', B: 'F', R: 'R', L: 'L' },
            'y': { U: 'U', D: 'D', F: 'L', B: 'R', R: 'F', L: 'B' },
            "y'": { U: 'U', D: 'D', F: 'R', B: 'L', R: 'B', L: 'F' },
            'y2': { U: 'U', D: 'D', F: 'B', B: 'F', R: 'L', L: 'R' },
            'z': { U: 'R', D: 'L', F: 'F', B: 'B', R: 'D', L: 'U' },
            "z'": { U: 'L', D: 'R', F: 'F', B: 'B', R: 'U', L: 'D' },
            'z2': { U: 'D', D: 'U', F: 'F', B: 'B', R: 'L', L: 'R' }
        };

        function composeTranslations(t1, t2) {
            const result = {};
            for (const face of ['U', 'D', 'F', 'B', 'R', 'L']) {
                result[face] = t2[t1[face]];
            }
            return result;
        }

        const moves = rotationStr.trim().split(/\s+/);
        let translation = { ...SINGLE_ROTATION_TRANSLATIONS[''] };

        for (const m of moves) {
            const trans = SINGLE_ROTATION_TRANSLATIONS[m];
            if (trans) {
                translation = composeTranslations(translation, trans);
            }
        }

        // Apply translation to the move
        const match = move.match(/^([UDFRBL])(.*)$/);
        if (!match) return move;

        const [, face, suffix] = match;
        const translatedFace = translation[face];
        return translatedFace + suffix;
    }

    /**
     * Apply a move from smart cube with pivot tracking
     * @param {string} move - The translated move from smart cube (after holding orientation)
     */
    function applySmartCubeMove(move) {
        if (!cube) {
            console.warn("TrainerCore: cube not available");
            return;
        }

        // First, translate the move to account for cumulative pivot rotations
        const pivotTranslatedMove = translateMoveForRotation(move, cumulativePivotRotation);
        if (cumulativePivotRotation) {
            console.log('SmartCube [2b] After pivot rotation translation:', pivotTranslatedMove,
                `(cumulative pivot: ${cumulativePivotRotation})`);
        }

        // Track consecutive U moves for 4xU reset
        if (pivotTranslatedMove.trim() === "U") {
            consecutiveUMoves++;
            if (consecutiveUMoves >= 8) {
                consecutiveUMoves = 0;
                console.log('SmartCube: 4x U detected — resetting case');
                resetCase();
                nextScramble();
                return;
            }
        } else {
            consecutiveUMoves = 0;
        }

        // Calculate pivot fix rotation (only if pivot tracking is enabled and we have an algorithm)
        let fixPivotRotation = "";
        const usePivotCheckbox = document.getElementById('usePivot');
        const usePivot = usePivotCheckbox ? usePivotCheckbox.checked : false;

        if (usePivot && window.alg && window.alg.cube && algorithmHistory.length > 0) {
            const lastTest = algorithmHistory[algorithmHistory.length - 1];

            if (lastTest && lastTest.solutions && lastTest.solutions.length > 0) {
                // Deep copy the cube's cubestate (including mask positions)
                const cubestateCopy = cube.cubestate.map(arr => [arr[0], arr[1]]);

                // Apply the pivot-translated move to the copy
                const testCube = new RubiksCube();
                for (let k = 0; k < 54; k++) {
                    testCube.cubestate[k][0] = cubestateCopy[k][0];
                    testCube.cubestate[k][1] = cubestateCopy[k][1];
                }
                testCube.doAlgorithm(pivotTranslatedMove);

                // Get the state after the move (with mask)
                const stateAfterMove = testCube.cubestate.map(arr => [arr[0], arr[1]]);

                // Find pivot for the current algorithm
                const findPivotFn = window.AlgorithmUtils ? window.AlgorithmUtils.findPivot : window.findPivot;
                const commToMovesFn = window.commToMoves;

                if (findPivotFn && commToMovesFn) {
                    const expandedAlg = commToMovesFn(lastTest.solutions[0]);
                    const pivotIndex = findPivotFn(expandedAlg);

                    if (pivotIndex !== -1) {
                        // Check if pivot is currently in position (origin matches pivot index)
                        const pivotInPosition = stateAfterMove[pivotIndex][1] === pivotIndex;
                        console.log('SmartCube [3a] Pivot state after move:', {
                            pivotIndex: pivotIndex,
                            currentMaskValue: stateAfterMove[pivotIndex][1],
                            inPosition: pivotInPosition
                        });

                        // Pass the cubestate copy (after move) to find pivot fix
                        fixPivotRotation = findRotationToFixPivot(pivotIndex, stateAfterMove);
                        console.log('SmartCube [3b] Pivot tracking:', {
                            algorithm: lastTest.solutions[0],
                            pivotIndex: pivotIndex,
                            fixRotation: fixPivotRotation || '(none needed)'
                        });

                        // Update cumulative pivot rotation if a fix was applied
                        if (fixPivotRotation) {
                            cumulativePivotRotation = (cumulativePivotRotation + ' ' + fixPivotRotation).trim();
                            // Simplify the rotation if alg library is available
                            if (window.alg && window.alg.cube && window.alg.cube.simplify) {
                                cumulativePivotRotation = window.alg.cube.simplify(cumulativePivotRotation);
                            }
                            console.log('SmartCube [3c] Updated cumulative pivot rotation:', cumulativePivotRotation);
                        }
                    } else {
                        console.log('SmartCube [3] Pivot tracking: no pivot found for algorithm');
                    }
                }
            }
        }

        // Apply the pivot-translated move with pivot fix rotation
        const finalMove = fixPivotRotation ? (pivotTranslatedMove + " " + fixPivotRotation) : pivotTranslatedMove;
        console.log('SmartCube [4] Final move applied:', finalMove.trim());
        doAlg(finalMove.trim(), true);
    }

    /**
     * Execute an algorithm on the cube
     * @param {string} algorithm - Algorithm to execute
     * @param {boolean} checkSolved - Whether to check if solved and handle timer
     */
    function doAlg(algorithm, checkSolved = false) {
        if (!cube) {
            console.warn("TrainerCore: cube not initialized");
            return;
        }

        cube.doAlgorithm(algorithm);

        if (onCubeStateChanged) {
            onCubeStateChanged();
        }

        // Before first scramble, allow free cube manipulation without timer or next case behavior
        if (!trainingStarted) {
            return;
        }

        // Timer integration
        const timerModule = window.TimerModule;
        const isIncludeRecognitionTime = localStorage.getItem("includeRecognitionTime") === "true";

        if (isUsingVirtualCube() && !isIncludeRecognitionTime && checkSolved) {
            if (timerModule && !timerModule.isRunning()) {
                timerModule.startTimer();
            }
        }

        const useMaskCheckbox = document.getElementById('useMask');
        const useMask = useMaskCheckbox ? useMaskCheckbox.checked : true;
        const initialMask = document.getElementById('initialMask');
        const maskValue = (useMask && initialMask) ? initialMask.value : '';

        if (timerModule && timerModule.isRunning() && cube.isSolved(maskValue) && isUsingVirtualCube()) {
            if (checkSolved) {
                timerModule.stopTimer();
                nextScramble();
            } else {
                timerModule.stopTimer();
            }
        }
    }

    /**
     * Check if virtual cube is being used
     * @returns {boolean}
     */
    function isUsingVirtualCube() {
        const cubeCanvas = document.getElementById("cube");
        return cubeCanvas && cubeCanvas.style.display !== 'none';
    }

    /**
     * Shuffle an array in-place using Fisher-Yates algorithm
     * @param {Array} arr - Array to shuffle
     * @returns {Array} The shuffled array
     */
    function shuffleList(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * Compute a simple hash of the algorithm list for change detection
     * @param {string[]} list - Algorithm list
     * @returns {string} Hash string
     */
    function hashAlgList(list) {
        const joined = list.join('|');
        return `${list.length}:${joined.substring(0, 200)}`;
    }

    /**
     * Get an algorithm from a list based on current order setting
     * @param {string[]} set - Algorithm set
     * @returns {string}
     */
    function randomFromList(set) {
        const algOrderElement = document.getElementById("algOrder");
        const algOrder = algOrderElement ? algOrderElement.value : "random";

        // Detect if algorithm list changed - reset indices if so
        const currentHash = hashAlgList(set);
        if (lastAlgListHash !== null && lastAlgListHash !== currentHash) {
            currentAlgIndex = 0;
            shuffledIndices = [];
        }
        lastAlgListHash = currentHash;
        lastAlgListLength = set.length;

        // Also check legacy checkbox for backward compatibility
        const goInOrder = document.getElementById("goInOrder");
        if (goInOrder && goInOrder.checked) {
            return set[currentAlgIndex++ % set.length];
        }

        if (algOrder === "inOrder") {
            return set[currentAlgIndex++ % set.length];
        }

        if (algOrder === "shuffled") {
            // Reshuffle when starting a new cycle
            if (currentAlgIndex % set.length === 0 || shuffledIndices.length !== set.length) {
                shuffledIndices = shuffleList(Array.from(Array(set.length).keys()));
            }
            const index = shuffledIndices[currentAlgIndex % set.length];
            currentAlgIndex++;
            return set[index];
        }

        if (algOrder === "weighted") {
            // 80% random, 20% pick least-practiced algorithm
            if (Math.random() < 0.2) {
                var minCount = Infinity;
                for (var i = 0; i < set.length; i++) {
                    var key = set[i].split("!")[0].trim();
                    var stats = caseStats[key];
                    var count = stats ? stats.count : 0;
                    if (count < minCount) minCount = count;
                }
                var leastPracticed = [];
                for (var j = 0; j < set.length; j++) {
                    var k = set[j].split("!")[0].trim();
                    var s = caseStats[k];
                    var c = s ? s.count : 0;
                    if (c === minCount) leastPracticed.push(set[j]);
                }
                return leastPracticed[Math.floor(Math.random() * leastPracticed.length)];
            }
            return set[Math.floor(Math.random() * set.length)];
        }

        // Default: random
        const rand = Math.floor(Math.random() * set.length);
        return set[rand];
    }

    /**
     * Generate orientation for color neutrality
     * @returns {string[]} [fullOrientation, randomPart]
     */
    function generateOrientation() {
        const cn1Element = document.getElementById("colourneutrality1");
        const cn1 = cn1Element ? cn1Element.value : "";
        const fullCNElement = document.getElementById("fullCN");
        const fullCN = fullCNElement ? fullCNElement.checked : false;

        if (fullCN) {
            const firstRotation = ["", "x", "x'", "x2", "y", "y'"];
            const secondRotation = ["", "z", "z'", "z2"];

            const rand1 = Math.floor(Math.random() * 6);
            const rand2 = Math.floor(Math.random() * 4);
            let randomPart = firstRotation[rand1] + secondRotation[rand2];

            if (randomPart === "x2z2") {
                randomPart = "y2";
            }

            const fullOrientation = cn1 + randomPart;
            return [fullOrientation, randomPart];
        }

        const cn2Element = document.getElementById("colourneutrality2");
        const cn3Element = document.getElementById("colourneutrality3");
        const cn2 = cn2Element ? cn2Element.value : "";
        const cn3 = cn3Element ? cn3Element.value : "";

        // Save to localStorage
        localStorage.setItem("colourneutrality1", cn1);
        localStorage.setItem("colourneutrality2", cn2);
        localStorage.setItem("colourneutrality3", cn3);

        const rand1 = Math.floor(Math.random() * 4);
        const rand2 = Math.floor(Math.random() * 4);

        const randomPart = cn2.repeat(rand1) + cn3.repeat(rand2);
        const fullOrientation = cn1 + randomPart;
        return [fullOrientation, randomPart];
    }

    /**
     * Generate an AlgTest from current settings
     * @returns {AlgTest}
     */
    function generateAlgTest() {
        const realScrambles = document.getElementById("realScrambles");
        const prescramble = document.getElementById("prescramble");
        const randAUF = document.getElementById("randAUF");
        const mirrorMEl = document.getElementById("mirrorM");
        const mirrorSEl = document.getElementById("mirrorS");
        const mirrorM = mirrorMEl ? mirrorMEl.value : "off";
        const mirrorS = mirrorSEl ? mirrorSEl.value : "off";

        const obfuscateAlg = realScrambles ? realScrambles.checked : false;
        const shouldPrescramble = prescramble ? prescramble.checked : false;
        const shouldRandAUF = randAUF ? randAUF.checked : false;

        // Get algorithm list based on input mode
        const createAlgListFn = window.createAlgList || (window.AlgorithmList && window.AlgorithmList.createAlgList);
        const updateAlgsetStatisticsFn = window.updateAlgsetStatistics || (window.AlgorithmList && window.AlgorithmList.updateAlgsetStatistics);
        const fixAlgorithmsFn = window.fixAlgorithms || (window.AlgorithmList && window.AlgorithmList.fixAlgorithms);
        const addInversesToListFn = window.addInversesToList || (window.AlgorithmList && window.AlgorithmList.addInversesToList);
        const mirrorAlgsAcrossAxisFn = window.mirrorAlgsAcrossAxis || (window.AlgorithmUtils && window.AlgorithmUtils.mirrorAlgsAcrossAxis);
        const addAUFsFn = window.addAUFs || (window.AlgorithmUtils && window.AlgorithmUtils.addAUFs);
        const generateAlgScrambleFn = window.generateAlgScramble || (window.AlgorithmUtils && window.AlgorithmUtils.generateAlgScramble);
        const correctRotationFn = window.correctRotation || (window.AlgorithmUtils && window.AlgorithmUtils.correctRotation);

        // Check input mode
        const inputMode = localStorage.getItem("algInputMode") || "custom";
        let algList;

        if (inputMode === "generator" && window.GeneratorParser) {
            // Generator mode: use cached algorithms if available
            const generatorInput = localStorage.getItem("generatorInput") || "";

            if (GeneratorParser.hasCachedGeneration(generatorInput)) {
                // Use cached list for fast scramble generation
                algList = GeneratorParser.getCachedAlgList();
            } else {
                // No cache - prompt user to generate first
                alert("Please click the 'Generate' button first to generate algorithms.");
                return null;
            }

            if (!algList || algList.length === 0) {
                alert("No algorithms generated. Check your generator syntax and click Generate.");
                return null;
            }
        } else {
            // Custom mode: use traditional algorithm list
            algList = createAlgListFn ? createAlgListFn() : [];

            // Apply auto add inverses if enabled (only for custom mode)
            const autoAddInverses = document.getElementById("autoAddInverses");
            if (autoAddInverses && autoAddInverses.checked && addInversesToListFn) {
                algList = addInversesToListFn(algList);
            }
        }

        // Only update statistics if algorithm list changed (expensive operation)
        const currentHash = algList.length + '_' + (algList[0] || '') + '_' + (algList[algList.length - 1] || '');
        if (updateAlgsetStatisticsFn && currentHash !== lastStatisticsHash) {
            lastStatisticsHash = currentHash;
            updateAlgsetStatisticsFn(algList);
        }

        // Filter to bookmarked algs if active
        if (bookmarkFilterActive && bookmarks.size > 0) {
            var filtered = algList.filter(function(a) {
                return bookmarks.has(a.split("!")[0].trim());
            });
            if (filtered.length > 0) {
                algList = filtered;
            } else {
                alert("No bookmarked algorithms found in current list.");
                return null;
            }
        }

        const rawAlgStr = randomFromList(algList);
        let rawAlgs = rawAlgStr ? rawAlgStr.split("!").map(s => s.trim()) : [];

        if (fixAlgorithmsFn) {
            rawAlgs = fixAlgorithmsFn(rawAlgs);
        }

        // Apply mirroring
        if (mirrorAlgsAcrossAxisFn) {
            if (mirrorM === "always") {
                rawAlgs = mirrorAlgsAcrossAxisFn(rawAlgs, "M");
            } else if (mirrorM === "random" && Math.random() > 0.5) {
                rawAlgs = mirrorAlgsAcrossAxisFn(rawAlgs, "M");
            }
            if (mirrorS === "always") {
                rawAlgs = mirrorAlgsAcrossAxisFn(rawAlgs, "S");
            } else if (mirrorS === "random" && Math.random() > 0.5) {
                rawAlgs = mirrorAlgsAcrossAxisFn(rawAlgs, "S");
            }
        }

        let solutions;
        if (shouldRandAUF && addAUFsFn) {
            solutions = addAUFsFn([...rawAlgs]);
        } else {
            solutions = rawAlgs;
        }

        // Generate scramble
        let scramble = "";
        if (solutions.length > 0 && generateAlgScrambleFn && correctRotationFn) {
            const expandedAlg = commToMoves(solutions[0]);
            const correctedAlg = correctRotationFn(expandedAlg);
            scramble = generateAlgScrambleFn(correctedAlg, obfuscateAlg, shouldPrescramble);
        }

        const [preorientation, orientRandPart] = generateOrientation();
        let simplifiedOrientRandPart = orientRandPart;
        if (window.alg && window.alg.cube) {
            simplifiedOrientRandPart = alg.cube.simplify(orientRandPart);
        }

        const solveTime = null;
        const time = Date.now();
        const visualCubeView = "plan";

        return new AlgTest(rawAlgs, scramble, solutions, preorientation, solveTime, time, visualCubeView, simplifiedOrientRandPart);
    }

    /**
     * Test an algorithm (set up the scramble)
     * @param {AlgTest} algTest
     * @param {boolean} addToHistory
     */
    function testAlg(algTest, addToHistory = true) {
        const scrambleElement = document.getElementById("scramble");
        const showScramble = document.getElementById("showScramble");

        if (scrambleElement) {
            if (showScramble && showScramble.checked) {
                scrambleElement.innerHTML = "<span style=\"color: #90f182\">" + algTest.orientRandPart + "</span> " + algTest.scramble;
            } else {
                scrambleElement.innerHTML = "&nbsp;";
            }
        }

        const algdisp = document.getElementById("algdisp");
        if (algdisp) {
            algdisp.innerHTML = "";
        }

        if (cube) {
            cube.resetCube();
            // Apply preorientation from colourneutrality1 setting
            const cn1Element = document.getElementById("colourneutrality1");
            const cn1 = cn1Element ? cn1Element.value : localStorage.getItem("colourneutrality1") || "";
            if (cn1 && cn1.trim()) {
                cube.doAlgorithm(cn1.trim());
            }
            // Apply random orientation rotations (cn2/cn3)
            if (algTest.orientRandPart && algTest.orientRandPart.trim()) {
                cube.doAlgorithm(algTest.orientRandPart.trim());
            }
            // Reset mask AFTER preorientation so origin positions match the preoriented solved state
            // This ensures the initial mask (defined for standard orientation) applies correctly
            // to the visually corresponding stickers after preorientation
            cube.resetMask();

            doAlg(algTest.scramble, false);

            // Save pivot baseline after scramble for pivot tracking
            // This is separate from mask tracking and records colors at each position
            cube.savePivotBaseline();
        }

        if (onCubeStateChanged) {
            onCubeStateChanged();
        }

        if (addToHistory) {
            algorithmHistory.push(algTest);
        }

        if (onScrambleGenerated) {
            onScrambleGenerated(algTest);
        }
    }

    /**
     * Re-test the last algorithm (reset to scramble state)
     */
    function reTestAlg() {
        const lastTest = algorithmHistory[algorithmHistory.length - 1];
        if (!lastTest || !cube) {
            return;
        }

        // Reset cumulative pivot rotation when re-testing
        cumulativePivotRotation = "";

        cube.resetCube();
        // Apply preorientation from colourneutrality1 setting
        const cn1Element = document.getElementById("colourneutrality1");
        const cn1 = cn1Element ? cn1Element.value : localStorage.getItem("colourneutrality1") || "";
        if (cn1 && cn1.trim()) {
            cube.doAlgorithm(cn1.trim());
        }
        // Apply random orientation rotations (cn2/cn3)
        if (lastTest.orientRandPart && lastTest.orientRandPart.trim()) {
            cube.doAlgorithm(lastTest.orientRandPart.trim());
        }
        // Reset mask AFTER preorientation so origin positions match the preoriented solved state
        cube.resetMask();

        doAlg(lastTest.scramble, false);

        // Save pivot baseline after scramble for pivot tracking
        cube.savePivotBaseline();

        if (onCubeStateChanged) {
            onCubeStateChanged();
        }
    }

    /**
     * Update trainer UI elements
     * @param {string} scramble
     * @param {string} solutions
     * @param {string} algorithm
     * @param {string} timer
     */
    function updateTrainer(scramble, solutions, algorithm, timer) {
        if (scramble !== null) {
            const scrambleElement = document.getElementById("scramble");
            if (scrambleElement) {
                scrambleElement.innerHTML = scramble;
                // Trigger font size adjustment
                if (window.adjustScrambleFontSize) {
                    setTimeout(() => window.adjustScrambleFontSize(), 0);
                }
            }
        }

        if (solutions !== null) {
            const algdisp = document.getElementById("algdisp");
            if (algdisp) {
                algdisp.innerHTML = solutions;
                algdisp.style.whiteSpace = "pre-line";
            }
        }

        if (algorithm !== null && cube) {
            cube.resetCube();
            doAlg(algorithm, false);
        }

        if (timer !== null) {
            const timerElement = document.getElementById("timer");
            if (timerElement) {
                timerElement.innerHTML = timer;
            }
        }
    }

    /**
     * Display algorithm from history at given index
     * @param {number} index
     */
    function displayAlgorithmFromHistory(index) {
        const algTest = algorithmHistory[index];
        if (!algTest) return;

        let timerText;
        if (algTest.solveTime === null) {
            timerText = 'n/a';
        } else {
            timerText = algTest.solveTime.toString();
        }

        updateTrainer(
            "<span style=\"color: #90f182\">" + algTest.orientRandPart + "</span> " + algTest.scramble,
            algTest.solutions.join("\n"),
            algTest.preorientation + algTest.scramble,
            timerText
        );

        const scrambleElement = document.getElementById("scramble");
        if (scrambleElement) {
            scrambleElement.style.color = '#e6e6e6';
        }

        if (onCubeStateChanged) {
            onCubeStateChanged();
        }
    }

    /**
     * Display algorithm for the previous/last test
     * @param {boolean} reTest - Whether to reset cube to scramble
     */
    function displayAlgorithmForPreviousTest(reTest = true) {
        const lastTest = algorithmHistory[algorithmHistory.length - 1];
        if (!lastTest) return;

        if (reTest) {
            reTestAlg();
        }

        updateTrainer(
            "<span style=\"color: #90f182\">" + lastTest.orientRandPart + "</span> " + lastTest.scramble,
            lastTest.solutions.join("\n"),
            null,
            null
        );

        const scrambleElement = document.getElementById("scramble");
        if (scrambleElement) {
            scrambleElement.style.color = '#e6e6e6';
        }
    }

    /**
     * Generate next scramble
     * @param {boolean} displayReady - Whether to show "Ready" in timer
     */
    function nextScramble(displayReady = true) {
        // Auto-update subsets before generating scramble
        if (window.AlgorithmList && window.AlgorithmList.updateSubsets) {
            AlgorithmList.updateSubsets();
        }

        // Mark training as started - enables solved detection behavior
        trainingStarted = true;

        // Reset cumulative pivot rotation and U counter for new scramble
        cumulativePivotRotation = "";
        consecutiveUMoves = 0;

        const scrambleElement = document.getElementById("scramble");
        if (scrambleElement) {
            scrambleElement.style.color = "white";
        }

        const timerModule = window.TimerModule;
        if (timerModule) {
            timerModule.stopTimer(false);
        }

        if (displayReady) {
            const timerElement = document.getElementById("timer");
            if (timerElement) {
                timerElement.innerHTML = 'Ready';
            }
        }

        if (isUsingVirtualCube()) {
            testAlg(generateAlgTest());
            const isIncludeRecognitionTime = localStorage.getItem("includeRecognitionTime") === "true";
            if (isIncludeRecognitionTime && timerModule) {
                timerModule.startTimer();
            }
        } else {
            testAlg(generateAlgTest());
        }

        historyIndex = algorithmHistory.length - 1;

        // Update pivot debug display
        updatePivotDebug();
    }

    /**
     * Update pivot debug display with current algorithm's pivot info
     */
    function updatePivotDebug() {
        const pivotDebugElement = document.getElementById('pivotDebug');
        if (!pivotDebugElement) return;

        const lastTest = algorithmHistory[algorithmHistory.length - 1];
        if (!lastTest || !lastTest.solutions || lastTest.solutions.length === 0) {
            pivotDebugElement.textContent = '';
            return;
        }

        const findPivotFn = window.AlgorithmUtils ? window.AlgorithmUtils.findPivot : window.findPivot;
        const commToMovesFn = window.commToMoves;

        if (!findPivotFn || !commToMovesFn) {
            pivotDebugElement.textContent = 'Pivot: functions not available';
            return;
        }

        const expandedAlg = commToMovesFn(lastTest.solutions[0]);
        const pivotIndex = findPivotFn(expandedAlg);

        if (pivotIndex === -1) {
            pivotDebugElement.textContent = 'Pivot: none found';
        } else {
            // Get piece name from pivot index using standard cube notation
            // Sticker positions on each face (0-8):
            //   0 1 2
            //   3 4 5
            //   6 7 8
            const faceIndex = Math.floor(pivotIndex / 9);
            const stickerPos = pivotIndex % 9;

            // Piece names for each face position
            // U face: UBL UB UBR | UL U UR | UFL UF UFR
            // R face: RUF RU RUB | RF R RB | RDF RD RDB
            // F face: FUL FU FUR | FL F FR | FDL FD FDR
            // D face: DFL DF DFR | DL D DR | DBL DB DBR
            // L face: LUB LU LUF | LB L LF | LDB LD LDF
            // B face: BUR BU BUL | BR B BL | BDR BD BDL
            const pieceNames = {
                0: ['UBL', 'UB', 'UBR', 'UL', 'U', 'UR', 'UFL', 'UF', 'UFR'],
                1: ['RUF', 'RU', 'RUB', 'RF', 'R', 'RB', 'RDF', 'RD', 'RDB'],
                2: ['FUL', 'FU', 'FUR', 'FL', 'F', 'FR', 'FDL', 'FD', 'FDR'],
                3: ['DFL', 'DF', 'DFR', 'DL', 'D', 'DR', 'DBL', 'DB', 'DBR'],
                4: ['LUB', 'LU', 'LUF', 'LB', 'L', 'LF', 'LDB', 'LD', 'LDF'],
                5: ['BUR', 'BU', 'BUL', 'BR', 'B', 'BL', 'BDR', 'BD', 'BDL']
            };

            const pieceName = pieceNames[faceIndex][stickerPos];
            pivotDebugElement.textContent = `Pivot: ${pieceName} (index ${pivotIndex}, face pos ${stickerPos})`;
        }
    }

    /**
     * Handle navigation to previous test
     */
    function handleLeftButton() {
        const timerModule = window.TimerModule;
        if (algorithmHistory.length <= 1 || (timerModule && timerModule.isRunning())) {
            return;
        }

        historyIndex--;

        if (historyIndex < 0) {
            alert('Reached end of solve log');
            historyIndex = 0;
        }

        displayAlgorithmFromHistory(historyIndex);
    }

    /**
     * Handle navigation to next test
     */
    function handleRightButton() {
        const timerModule = window.TimerModule;
        if (timerModule && timerModule.isRunning()) {
            return;
        }

        historyIndex++;

        if (historyIndex >= algorithmHistory.length) {
            nextScramble();
            return;
        }

        displayAlgorithmFromHistory(historyIndex);
    }

    /**
     * Reset current case
     */
    function resetCase() {
        if (isUsingVirtualCube()) {
            const timerModule = window.TimerModule;
            if (timerModule) {
                timerModule.stopTimer(false);
            }
        }

        reTestAlg();

        const scrambleElement = document.getElementById("scramble");
        if (scrambleElement) {
            scrambleElement.innerHTML = "&nbsp;";
        }

        const algdisp = document.getElementById("algdisp");
        if (algdisp) {
            algdisp.innerHTML = "";
        }
    }

    /**
     * Notify that an algorithm was removed, adjusting indices to preserve progress
     * @param {number} removedIndex - Index of the removed algorithm in the old list
     * @param {string[]} newList - The algorithm list after removal
     */
    function notifyAlgRemoved(removedIndex, newList) {
        const algOrderElement = document.getElementById("algOrder");
        const order = algOrderElement ? algOrderElement.value : "random";
        const goInOrder = document.getElementById("goInOrder");
        const isOrdered = (goInOrder && goInOrder.checked) || order === "inOrder";
        const isShuffled = order === "shuffled";

        if (isOrdered) {
            // currentAlgIndex is post-increment (points to NEXT index to serve)
            // If removed alg was before current position, shift back to stay in place
            const oldLength = newList.length + 1;
            if (currentAlgIndex > 0 && removedIndex < (currentAlgIndex % oldLength)) {
                currentAlgIndex--;
            }
        } else if (isShuffled) {
            // Find and remove the entry from shuffledIndices
            const posInShuffle = shuffledIndices.indexOf(removedIndex);
            if (posInShuffle !== -1) {
                shuffledIndices.splice(posInShuffle, 1);
                // If we already passed this position in the shuffle, adjust index
                const currentPos = currentAlgIndex % (shuffledIndices.length + 1);
                if (posInShuffle < currentPos) {
                    currentAlgIndex--;
                }
            }
            // Shift down indices that were above the removed index
            shuffledIndices = shuffledIndices.map(i => i > removedIndex ? i - 1 : i);
        }

        // Update hash and length to match new list so randomFromList() won't reset
        lastAlgListHash = hashAlgList(newList);
        lastAlgListLength = newList.length;
    }

    /**
     * Reset shuffled indices (call when algorithm list or order changes)
     */
    function resetShuffledIndices() {
        shuffledIndices = [];
        currentAlgIndex = 0;
        lastAlgListHash = null;
    }

    /**
     * Get progress information for the current algorithm order mode
     * @returns {Object|null} Progress info or null if in random mode
     */
    function getProgressInfo() {
        const algOrderElement = document.getElementById("algOrder");
        const algOrder = algOrderElement ? algOrderElement.value : "random";

        // Also check legacy checkbox
        const goInOrder = document.getElementById("goInOrder");
        const isOrdered = (goInOrder && goInOrder.checked) || algOrder === "inOrder" || algOrder === "shuffled";

        if (!isOrdered || lastAlgListLength === 0) {
            return null;
        }

        // currentAlgIndex is post-increment, so the displayed case is currentAlgIndex
        // (already incremented after selection)
        const currentCase = ((currentAlgIndex - 1) % lastAlgListLength) + 1;

        return {
            current: currentCase,
            total: lastAlgListLength,
            text: `${currentCase} / ${lastAlgListLength}`
        };
    }

    // Getters and setters
    function getAlgorithmHistory() { return algorithmHistory; }
    function getHistoryIndex() { return historyIndex; }
    function setHistoryIndex(index) { historyIndex = index; }
    function getCurrentAlgIndex() { return currentAlgIndex; }
    function setCurrentAlgIndex(index) { currentAlgIndex = index; }
    function getCurrentPreorientation() { return currentPreorientation; }
    function setCurrentPreorientation(preorientation) { currentPreorientation = preorientation; }
    function getCube() { return cube; }
    function hasTrainingStarted() { return trainingStarted; }

    function setOnCubeStateChanged(callback) { onCubeStateChanged = callback; }
    function setOnScrambleGenerated(callback) { onScrambleGenerated = callback; }

    // Export to global scope
    window.TrainerCore = {
        AlgTest,
        init,
        doAlg,
        applySmartCubeMove,
        isUsingVirtualCube,
        shuffleList,
        randomFromList,
        generateOrientation,
        generateAlgTest,
        testAlg,
        reTestAlg,
        updateTrainer,
        displayAlgorithmFromHistory,
        displayAlgorithmForPreviousTest,
        nextScramble,
        handleLeftButton,
        handleRightButton,
        resetCase,
        notifyAlgRemoved,
        resetShuffledIndices,
        getProgressInfo,
        getAlgorithmHistory,
        getHistoryIndex,
        setHistoryIndex,
        getCurrentAlgIndex,
        setCurrentAlgIndex,
        getCurrentPreorientation,
        setCurrentPreorientation,
        getCube,
        hasTrainingStarted,
        setOnCubeStateChanged,
        setOnScrambleGenerated,
        recordSolve,
        getCaseStatsFor,
        getAllCaseStats,
        clearCaseStats,
        toggleBookmark,
        isBookmarked,
        getBookmarks,
        getCurrentAlgKey,
        setBookmarkFilter,
        isBookmarkFilterActive
    };

    // Export individual functions for backward compatibility
    window.AlgTest = AlgTest;
    window.doAlg = doAlg;
    window.isUsingVirtualCube = isUsingVirtualCube;
    window.randomFromList = randomFromList;
    window.generateAlgTest = generateAlgTest;
    window.testAlg = testAlg;
    window.reTestAlg = reTestAlg;
    window.updateTrainer = updateTrainer;
    window.displayAlgorithmFromHistory = displayAlgorithmFromHistory;
    window.displayAlgorithmForPreviousTest = displayAlgorithmForPreviousTest;
    window.nextScramble = nextScramble;
    window.handleLeftButton = handleLeftButton;
    window.handleRightButton = handleRightButton;
    window.resetCase = resetCase;

})();
