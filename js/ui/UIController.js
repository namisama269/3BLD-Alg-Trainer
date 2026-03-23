// UIController.js - UI display control and DOM manipulation

(function() {
    'use strict';

    /**
     * Toggle virtual cube visibility
     */
    function toggleVirtualCube() {
        const sim = document.getElementById("simcube");
        if (!sim) return;

        if (sim.style.display === 'none') {
            sim.style.display = 'block';
        } else {
            sim.style.display = 'none';
        }
    }

    /**
     * Set virtual cube visibility
     * @param {boolean} visible - Whether to show the cube
     */
    function setVirtualCube(visible) {
        const sim = document.getElementById("simcube");
        if (!sim) return;

        if (visible) {
            sim.style.display = 'block';
        } else {
            sim.style.display = 'none';
            // Timer has to be shown when simulator cube is not used
            const timer = document.getElementById("timer");
            if (timer) {
                timer.style.display = 'block';
            }
            const hideTimer = document.getElementById("hideTimer");
            if (hideTimer) {
                hideTimer.checked = false;
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
     * Set timer display visibility
     * @param {boolean} visible - Whether to show the timer
     */
    function setTimerDisplay(visible) {
        const timer = document.getElementById("timer");
        const timerDiv = document.getElementById("timer_div");

        if (!isUsingVirtualCube()) {
            alert("The timer can only be hidden when using the simulator cube.");
            const hideTimer = document.getElementById("hideTimer");
            if (hideTimer) {
                hideTimer.checked = false;
            }
            return;
        }

        if (visible) {
            if (timer) timer.style.display = 'block';
            if (timerDiv) timerDiv.style.display = 'block';
        } else {
            if (timer) timer.style.display = 'none';
            if (timerDiv) timerDiv.style.display = 'none';
        }
    }

    /**
     * Adjust scramble font size to fit container
     */
    function adjustScrambleFontSize() {
        const scrambleElement = document.getElementById("scramble");
        if (!scrambleElement) return;

        const container = scrambleElement.parentElement;
        if (!container) return;

        // Reset to default first
        scrambleElement.style.fontSize = '20px';
        scrambleElement.style.whiteSpace = 'nowrap';

        // Use requestAnimationFrame to ensure DOM has rendered
        requestAnimationFrame(() => {
            const maxWidth = container.offsetWidth - 32; // Account for padding
            let fontSize = 20; // 1.25rem = 20px (fs-6)

            // Reduce font size until it fits
            while (scrambleElement.scrollWidth > maxWidth && fontSize > 12) {
                fontSize -= 0.5;
                scrambleElement.style.fontSize = fontSize + 'px';
            }
        });
    }

    /**
     * Show loading indicator
     */
    function showLoader() {
        const loader = document.getElementById("loader");
        if (loader) {
            loader.style.display = "block";
        }
    }

    /**
     * Hide loading indicator and show page
     */
    function hideLoader() {
        const loader = document.getElementById("loader");
        if (loader) {
            loader.style.display = "none";
        }

        const page = document.getElementById("page");
        if (page) {
            if (page.classList && page.classList.contains("d-none")) {
                page.classList.remove("d-none");
            }
            page.style.display = "block";
        }
    }

    /**
     * Set scramble text
     * @param {string} text - Scramble text (can include HTML)
     */
    function setScramble(text) {
        const scrambleElement = document.getElementById("scramble");
        if (scrambleElement) {
            scrambleElement.innerHTML = text;
            setTimeout(() => adjustScrambleFontSize(), 0);
        }
    }

    /**
     * Set algorithm display
     * @param {string} text - Algorithm text (can include HTML)
     */
    function setAlgDisplay(text) {
        const algdisp = document.getElementById("algdisp");
        if (algdisp) {
            algdisp.innerHTML = text;
        }
    }

    /**
     * Set timer text
     * @param {string} text
     */
    function setTimerText(text) {
        const timer = document.getElementById("timer");
        if (timer) {
            timer.innerHTML = text;
        }
    }

    /**
     * Set scramble color
     * @param {string} color - CSS color value
     */
    function setScrambleColor(color) {
        const scramble = document.getElementById("scramble");
        if (scramble) {
            scramble.style.color = color;
        }
    }

    /**
     * Initialize mask input persistence
     */
    function initMaskInputs() {
        // Initial Mask
        const initialMask = document.getElementById('initialMask');
        if (initialMask) {
            const savedValue = localStorage.getItem('initialMask');
            if (savedValue !== null) {
                initialMask.value = savedValue;
            }
            initialMask.addEventListener('input', function() {
                localStorage.setItem('initialMask', initialMask.value);
            });
        }

        // Final Mask
        const finalMask = document.getElementById('finalMask');
        if (finalMask) {
            const savedValue = localStorage.getItem('finalMask');
            if (savedValue !== null) {
                finalMask.value = savedValue;
            }
            finalMask.addEventListener('input', function() {
                localStorage.setItem('finalMask', finalMask.value);
            });
        }
    }

    /**
     * Initialize user defined algs textarea persistence
     */
    function initUserDefinedAlgs() {
        const textarea = document.getElementById("userDefinedAlgs");
        if (textarea) {
            textarea.style.display = "block";

            const saved = localStorage.getItem("userDefinedAlgs");
            if (saved) {
                textarea.value = saved;
            }

            textarea.addEventListener('input', function() {
                localStorage.setItem("userDefinedAlgs", this.value);
            });
        }
    }

    /**
     * Check if a text color is valid
     * @param {string} stringToTest
     * @returns {boolean}
     */
    function validTextColour(stringToTest) {
        if (stringToTest === "") return false;
        if (stringToTest === "inherit") return false;
        if (stringToTest === "transparent") return false;

        const visualCubeColoursArray = ['black', 'dgrey', 'grey', 'silver', 'white', 'yellow',
            'red', 'orange', 'blue', 'green', 'purple', 'pink'];

        if (stringToTest[0] !== '#') {
            return visualCubeColoursArray.indexOf(stringToTest) > -1;
        } else {
            return /^#[0-9A-F]{6}$/i.test(stringToTest);
        }
    }

    /**
     * Strip leading hashtag from color string
     * @param {string} colour
     * @returns {string}
     */
    function stripLeadingHashtag(colour) {
        if (colour[0] === '#') {
            return colour.substring(1);
        }
        return colour;
    }

    /**
     * Update the algorithm progress indicator
     */
    function updateProgressIndicator() {
        const progressEl = document.getElementById("algProgress");
        if (!progressEl) return;

        if (window.TrainerCore && window.TrainerCore.getProgressInfo) {
            const progress = window.TrainerCore.getProgressInfo();
            if (progress) {
                progressEl.textContent = progress.text;
                progressEl.style.display = "inline";
            } else {
                progressEl.style.display = "none";
            }
        } else {
            progressEl.style.display = "none";
        }
    }

    // Track which screen is active
    let currentScreen = 'config';

    /**
     * Show the config screen, hide the trainer screen
     */
    function showConfigScreen() {
        var config = document.getElementById('screen-config');
        var trainer = document.getElementById('screen-trainer');
        if (config) config.classList.remove('d-none');
        if (trainer) trainer.classList.add('d-none');
        currentScreen = 'config';
    }

    /**
     * Show the trainer screen, hide the config screen
     */
    function showTrainerScreen() {
        var config = document.getElementById('screen-config');
        var trainer = document.getElementById('screen-trainer');
        if (config) config.classList.add('d-none');
        if (trainer) trainer.classList.remove('d-none');
        currentScreen = 'trainer';
    }

    /**
     * Check if the trainer screen is currently active
     * @returns {boolean}
     */
    function isTrainerScreen() {
        return currentScreen === 'trainer';
    }


    /**
     * Initialize UI components
     */
    function init() {
        initMaskInputs();
        initUserDefinedAlgs();

        // Hide loader after short delay
        setTimeout(hideLoader, 1);
    }

    // Export to global scope
    window.UIController = {
        toggleVirtualCube,
        setVirtualCube,
        isUsingVirtualCube,
        setTimerDisplay,
        adjustScrambleFontSize,
        showLoader,
        hideLoader,
        setScramble,
        setAlgDisplay,
        setTimerText,
        setScrambleColor,
        initMaskInputs,
        initUserDefinedAlgs,
        validTextColour,
        stripLeadingHashtag,
        updateProgressIndicator,
        showConfigScreen,
        showTrainerScreen,
        isTrainerScreen,
        init
    };

    // Export individual functions for backward compatibility
    window.toggleVirtualCube = toggleVirtualCube;
    window.setVirtualCube = setVirtualCube;
    window.setTimerDisplay = setTimerDisplay;
    window.adjustScrambleFontSize = adjustScrambleFontSize;
    window.validTextColour = validTextColour;
    window.stripLeadingHashtag = stripLeadingHashtag;

})();
