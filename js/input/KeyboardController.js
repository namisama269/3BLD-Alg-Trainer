// KeyboardController.js - Keyboard and touch input handling
// Depends on: keymaps.js (getKeyMaps, Listener, KeyCombo)
// Depends on: trainer/TrainerCore.js
// Depends on: trainer/TimerModule.js

(function() {
    'use strict';

    // State
    let listener = null;
    let lastKeyMap = null;
    let doNothingNextTimeSpaceIsPressed = true;
    let updateInterval = null;

    // Callbacks
    let onMove = null;
    let onCubeStateChanged = null;

    /**
     * Initialize the keyboard controller
     */
    function init() {
        console.log("KeyboardController.init called");
        console.log("Listener class available:", !!window.Listener);
        console.log("KeyCombo class available:", !!window.KeyCombo);
        console.log("getKeyMaps available:", !!window.getKeyMaps);

        // Create listener if Listener class exists
        if (window.Listener) {
            listener = new Listener();
            console.log("KeyboardController: Listener created");
        } else {
            console.warn("KeyboardController: Listener class not found");
        }

        // Setup keyboard events
        document.onkeyup = handleKeyUp;
        document.onkeydown = handleKeyDown;

        // Setup touch events for mobile
        const touchStartArea = document.getElementById("touchStartArea");
        if (touchStartArea) {
            touchStartArea.addEventListener("touchend", handleKeyUp);
            touchStartArea.addEventListener("touchstart", handleKeyDown);
        }

        // Start control update interval
        startControlUpdateInterval();

        // Force initial update
        updateControls();
        console.log("KeyboardController: Initial controls updated");
    }

    /**
     * Update keyboard controls based on current keymaps
     * @returns {boolean} Whether controls were updated
     */
    function updateControls() {
        if (!window.getKeyMaps || !listener) {
            console.log("updateControls: missing - getKeyMaps:", !!window.getKeyMaps, "listener:", !!listener);
            return false;
        }

        const keymaps = getKeyMaps();
        console.log("updateControls: got keymaps:", keymaps.length, "entries");

        if (JSON.stringify(keymaps) === JSON.stringify(lastKeyMap)) {
            return false;
        }

        lastKeyMap = keymaps;
        listener.reset();

        const trainerCore = window.TrainerCore;
        const doAlgFn = trainerCore ? trainerCore.doAlg : window.doAlg;
        const updateVirtualCubeFn = window.updateVirtualCube;

        keymaps.forEach(function(keymap) {
            listener.register(keymap[0], function() {
                if (doAlgFn) {
                    doAlgFn(keymap[1], true);
                }
                if (updateVirtualCubeFn) {
                    updateVirtualCubeFn();
                }
                if (onMove) {
                    onMove(keymap[1]);
                }
            });
        });

        // Register special keys
        if (window.KeyCombo) {
            const displayAlgorithmForPreviousTestFn = trainerCore ?
                trainerCore.displayAlgorithmForPreviousTest : window.displayAlgorithmForPreviousTest;
            const resetCaseFn = trainerCore ? trainerCore.resetCase : window.resetCase;
            const nextScrambleFn = trainerCore ? trainerCore.nextScramble : window.nextScramble;
            const handleLeftButtonFn = trainerCore ? trainerCore.handleLeftButton : window.handleLeftButton;
            const handleRightButtonFn = trainerCore ? trainerCore.handleRightButton : window.handleRightButton;

            listener.register(new KeyCombo("Backspace"), function() {
                if (displayAlgorithmForPreviousTestFn) displayAlgorithmForPreviousTestFn();
            });

            listener.register(new KeyCombo("Escape"), function() {
                if (resetCaseFn) resetCaseFn();
            });

            listener.register(new KeyCombo("Enter"), function() {
                if (nextScrambleFn) nextScrambleFn();
                doNothingNextTimeSpaceIsPressed = false;
            });

            listener.register(new KeyCombo("Tab"), function() {
                if (nextScrambleFn) nextScrambleFn();
                doNothingNextTimeSpaceIsPressed = false;
            });

            listener.register(new KeyCombo("ArrowLeft"), function() {
                if (handleLeftButtonFn) handleLeftButtonFn();
            });

            listener.register(new KeyCombo("ArrowRight"), function() {
                if (handleRightButtonFn) handleRightButtonFn();
            });
        }

        return true;
    }

    /**
     * Start the control update interval
     */
    function startControlUpdateInterval() {
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        updateInterval = setInterval(updateControls, 300);
    }

    /**
     * Stop the control update interval
     */
    function stopControlUpdateInterval() {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
    }

    /**
     * Check if active element is a text input
     * @returns {boolean}
     */
    function isTextInputFocused() {
        const activeType = document.activeElement?.type;
        return activeType === "text" || activeType === "textarea";
    }

    /**
     * Handle key up event
     * @param {Event} event
     */
    function handleKeyUp(event) {
        if (event.key !== " " && event.type !== "touchend") {
            return;
        }

        // Only handle keys on trainer screen
        if (window.UIController && !window.UIController.isTrainerScreen()) {
            return;
        }

        if (isTextInputFocused()) {
            return;
        }

        const timerElement = document.getElementById("timer");
        if (timerElement) {
            timerElement.style.color = "white";
        }

        const isUsingVirtualCubeFn = window.UIController ?
            window.UIController.isUsingVirtualCube : window.isUsingVirtualCube;

        if (isUsingVirtualCubeFn && !isUsingVirtualCubeFn()) {
            const algdisp = document.getElementById("algdisp");
            if (algdisp && algdisp.innerHTML === "") {
                if (doNothingNextTimeSpaceIsPressed) {
                    doNothingNextTimeSpaceIsPressed = false;
                } else {
                    const startTimerFn = window.TimerModule ?
                        window.TimerModule.startTimer : window.startTimer;
                    if (startTimerFn) startTimerFn();
                }
            }
        }
    }

    /**
     * Handle key down event
     * @param {Event} event
     */
    function handleKeyDown(event) {
        if (event.key !== " " && event.type !== "touchstart") {
            return;
        }

        // Only handle keys on trainer screen
        if (window.UIController && !window.UIController.isTrainerScreen()) {
            return;
        }

        if (isTextInputFocused()) {
            return;
        }

        event.preventDefault();

        if (event.repeat) {
            return;
        }

        const timerModule = window.TimerModule;
        const trainerCore = window.TrainerCore;
        const isUsingVirtualCubeFn = window.UIController ?
            window.UIController.isUsingVirtualCube : window.isUsingVirtualCube;
        const timerIsRunning = timerModule ? timerModule.isRunning() : window.timerIsRunning;

        if (isUsingVirtualCubeFn && isUsingVirtualCubeFn()) {
            // Using virtual cube
            if (timerIsRunning) {
                const stopTimerFn = timerModule ? timerModule.stopTimer : window.stopTimer;
                if (stopTimerFn) stopTimerFn();

                const displayAlgorithmForPreviousTestFn = trainerCore ?
                    trainerCore.displayAlgorithmForPreviousTest : window.displayAlgorithmForPreviousTest;
                if (displayAlgorithmForPreviousTestFn) displayAlgorithmForPreviousTestFn();
            } else {
                const displayAlgorithmForPreviousTestFn = trainerCore ?
                    trainerCore.displayAlgorithmForPreviousTest : window.displayAlgorithmForPreviousTest;
                if (displayAlgorithmForPreviousTestFn) displayAlgorithmForPreviousTestFn();
            }
        } else {
            // Not using virtual cube
            if (timerIsRunning) {
                const stopTimerFn = timerModule ? timerModule.stopTimer : window.stopTimer;
                const time = stopTimerFn ? stopTimerFn() : null;
                doNothingNextTimeSpaceIsPressed = true;

                const goToNextCase = document.getElementById("goToNextCase");
                if (goToNextCase && goToNextCase.checked) {
                    const nextScrambleFn = trainerCore ? trainerCore.nextScramble : window.nextScramble;
                    if (nextScrambleFn) nextScrambleFn(false);
                } else {
                    const displayAlgorithmForPreviousTestFn = trainerCore ?
                        trainerCore.displayAlgorithmForPreviousTest : window.displayAlgorithmForPreviousTest;
                    if (displayAlgorithmForPreviousTestFn) displayAlgorithmForPreviousTestFn();
                }
            } else {
                const algdisp = document.getElementById("algdisp");
                const timerElement = document.getElementById("timer");

                if (algdisp && algdisp.innerHTML !== "") {
                    const nextScrambleFn = trainerCore ? trainerCore.nextScramble : window.nextScramble;
                    if (nextScrambleFn) nextScrambleFn();
                    doNothingNextTimeSpaceIsPressed = true;
                } else if (timerElement && timerElement.innerHTML === "Ready") {
                    timerElement.style.color = "green";
                }
            }
        }
    }

    /**
     * Set callback for when a move is made
     * @param {function} callback
     */
    function setOnMove(callback) {
        onMove = callback;
    }

    /**
     * Set flag for space handling
     * @param {boolean} value
     */
    function setDoNothingNextTimeSpaceIsPressed(value) {
        doNothingNextTimeSpaceIsPressed = value;
    }

    /**
     * Get the listener instance
     * @returns {Listener}
     */
    function getListener() {
        return listener;
    }

    // Export to global scope
    window.KeyboardController = {
        init,
        updateControls,
        startControlUpdateInterval,
        stopControlUpdateInterval,
        handleKeyUp,
        handleKeyDown,
        setOnMove,
        setDoNothingNextTimeSpaceIsPressed,
        getListener
    };

    // Export for backward compatibility
    window.updateControls = updateControls;

})();
