// SmartCubeModule.js - Smart cube (Bluetooth) connection and move handling
// Depends on: cubeconnect.js (connect function)
// Depends on: core/CubeState.js (RubiksCube)
// Depends on: core/AlgorithmUtils.js (simplifyRotation, findPivot, findRotationToFixPivot)
// Depends on: helpers.js (commToMoves)

(function() {
    'use strict';

    // Connection state
    let conn = null;
    let cube = null;

    // Callbacks
    let onMoveApplied = null;
    let onConnectionChanged = null;

    // Holding orientation translation
    let holdingOrientation = '';
    let holdingTranslation = { U: 'U', D: 'D', F: 'F', B: 'B', R: 'R', L: 'L' };

    // Single rotation translations (reported move -> actual move)
    // When holding in orientation X, if cube reports move A, you actually did move B
    //
    // After rotation, physical face P moves to default position D.
    // When you turn physical P, cube reports D. So: reported D -> actual P.
    const SINGLE_ROTATION_TRANSLATIONS = {
        '': { U: 'U', D: 'D', F: 'F', B: 'B', R: 'R', L: 'L' },
        // x rotations (around R-L axis)
        // x: physical U->default F, F->D, D->B, B->U
        'x': { U: 'B', D: 'F', F: 'U', B: 'D', R: 'R', L: 'L' },
        "x'": { U: 'F', D: 'B', F: 'D', B: 'U', R: 'R', L: 'L' },
        'x2': { U: 'D', D: 'U', F: 'B', B: 'F', R: 'R', L: 'L' },
        // y rotations (around U-D axis, clockwise from top)
        // y: physical L->default F, F->R, R->B, B->L
        'y': { U: 'U', D: 'D', F: 'L', B: 'R', R: 'F', L: 'B' },
        "y'": { U: 'U', D: 'D', F: 'R', B: 'L', R: 'B', L: 'F' },
        'y2': { U: 'U', D: 'D', F: 'B', B: 'F', R: 'L', L: 'R' },
        // z rotations (around F-B axis, clockwise from front)
        // z: physical L->default U, U->R, R->D, D->L
        'z': { U: 'R', D: 'L', F: 'F', B: 'B', R: 'D', L: 'U' },
        "z'": { U: 'L', D: 'R', F: 'F', B: 'B', R: 'U', L: 'D' },
        'z2': { U: 'D', D: 'U', F: 'F', B: 'B', R: 'L', L: 'R' }
    };

    /**
     * Compose two translation mappings
     * For orientations applied in sequence (first t1, then t2),
     * we apply t1 first, then t2 to that result
     * @param {Object} t1 - First translation (applied first to cube)
     * @param {Object} t2 - Second translation (applied second to cube)
     * @returns {Object} - Composed translation
     */
    function composeTranslations(t1, t2) {
        const result = {};
        for (const face of ['U', 'D', 'F', 'B', 'R', 'L']) {
            result[face] = t2[t1[face]];
        }
        return result;
    }

    /**
     * Build a translation table from an orientation string
     * @param {string} orientationStr - Space-separated rotation moves (e.g., "x2 y")
     * @returns {Object} - Translation mapping
     */
    function buildTranslation(orientationStr) {
        if (!orientationStr || orientationStr.trim() === '') {
            return { ...SINGLE_ROTATION_TRANSLATIONS[''] };
        }

        const moves = orientationStr.trim().split(/\s+/);
        let result = { ...SINGLE_ROTATION_TRANSLATIONS[''] };

        for (const move of moves) {
            const trans = SINGLE_ROTATION_TRANSLATIONS[move];
            if (trans) {
                result = composeTranslations(result, trans);
            }
        }

        return result;
    }

    /**
     * Translate a reported move to the actual move based on holding orientation
     * @param {string} reportedMove - The move reported by the smart cube (e.g., "D", "D'", "D2")
     * @returns {string} - The actual move performed
     */
    function translateMove(reportedMove) {
        const match = reportedMove.match(/^([UDFRBL])(.*)$/);
        if (!match) return reportedMove;

        const [, face, suffix] = match;
        const actualFace = holdingTranslation[face];
        return actualFace + suffix;
    }

    /**
     * Set the holding orientation
     * @param {string} orientation - Rotation moves from default orientation
     */
    function setHoldingOrientation(orientation) {
        holdingOrientation = orientation || '';
        holdingTranslation = buildTranslation(holdingOrientation);
        localStorage.setItem('smartCubeOrientation', holdingOrientation);
        console.log('Smart cube orientation set to:', holdingOrientation, 'Translation:', holdingTranslation);
    }

    /**
     * Get the current holding orientation
     * @returns {string}
     */
    function getHoldingOrientation() {
        return holdingOrientation;
    }

    /**
     * Setup the orientation input event listener
     */
    function setupOrientationInput() {
        const input = document.getElementById('smartCubeOrientation');
        if (input) {
            input.value = holdingOrientation;
            input.addEventListener('change', function() {
                setHoldingOrientation(this.value);
            });
        }
    }

    /**
     * Initialize smart cube module
     * @param {RubiksCube} cubeInstance - The cube state instance
     */
    function init(cubeInstance) {
        cube = cubeInstance;
        setupButton();

        // Load saved orientation
        const savedOrientation = localStorage.getItem('smartCubeOrientation') || '';
        setHoldingOrientation(savedOrientation);

        // Setup orientation input (may be in modal, so also try on DOMContentLoaded)
        setupOrientationInput();
        document.addEventListener('DOMContentLoaded', setupOrientationInput);
    }

    /**
     * Apply moves from smart cube - translates and passes to callback for processing
     * @param {string} moves - The moves to apply (as reported by smart cube)
     */
    function applyMoves(moves) {
        // 1. Log the raw move reported by smart cube
        console.log('SmartCube [1] Raw move from cube:', moves);

        // 2. Translate the reported move based on holding orientation
        const translatedMove = translateMove(moves);
        console.log('SmartCube [2] After holding orientation translation:', translatedMove,
            holdingOrientation ? `(orientation: ${holdingOrientation})` : '(no orientation set)');

        // Pass the translated move to the callback for processing (including pivot logic)
        if (onMoveApplied) {
            onMoveApplied(translatedMove);
        }
    }

    /**
     * Setup the connect button event listener
     */
    function setupButton() {
        const connectButton = document.getElementById("connectSmartCube");
        if (!connectButton) return;

        connectButton.addEventListener('click', handleConnect);
    }

    /**
     * Handle connect/disconnect button click
     */
    async function handleConnect() {
        const connectButton = document.getElementById("connectSmartCube");
        if (!connectButton) return;

        try {
            if (conn) {
                await disconnect();
            } else {
                await connectSmartCube();
            }
        } catch (e) {
            console.error("Smart cube connection error:", e);
            connectButton.textContent = 'Connect Smart Cube';
        }
    }

    /**
     * Connect to a smart cube
     */
    async function connectSmartCube() {
        const connectButton = document.getElementById("connectSmartCube");

        if (!window.connect) {
            alert("Smart cube support is not available");
            return;
        }

        conn = await window.connect(applyMoves);

        if (!conn) {
            alert("Smart cube is not supported");
            return;
        }

        await conn.initAsync();

        if (connectButton) {
            connectButton.textContent = 'Disconnect Smart Cube';
        }

        alert(`Smart cube ${conn.deviceName} connected`);

        if (onConnectionChanged) {
            onConnectionChanged(true, conn.deviceName);
        }
    }

    /**
     * Disconnect from the smart cube
     */
    async function disconnect() {
        const connectButton = document.getElementById("connectSmartCube");

        if (!conn) return;

        const deviceName = conn.deviceName;
        await conn.disconnect();

        if (connectButton) {
            connectButton.textContent = 'Connect Smart Cube';
        }

        alert(`Smart cube ${deviceName} disconnected`);
        conn = null;

        if (onConnectionChanged) {
            onConnectionChanged(false, deviceName);
        }
    }

    /**
     * Check if connected to a smart cube
     * @returns {boolean}
     */
    function isConnected() {
        return conn !== null;
    }

    /**
     * Get the current connection
     * @returns {Object|null}
     */
    function getConnection() {
        return conn;
    }

    /**
     * Set callback for when moves are applied
     * @param {function} callback
     */
    function setOnMoveApplied(callback) {
        onMoveApplied = callback;
    }

    /**
     * Set callback for connection state changes
     * @param {function} callback
     */
    function setOnConnectionChanged(callback) {
        onConnectionChanged = callback;
    }

    // Export to global scope
    window.SmartCubeModule = {
        init,
        applyMoves,
        connectSmartCube,
        disconnect,
        isConnected,
        getConnection,
        setOnMoveApplied,
        setOnConnectionChanged,
        setHoldingOrientation,
        getHoldingOrientation,
        translateMove
    };

})();
