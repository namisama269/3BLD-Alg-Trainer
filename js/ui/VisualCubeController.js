// VisualCubeController.js - Visual cube canvas rendering and pan/zoom controls
// Depends on: visualCube.js (VisualCube class)
// Depends on: core/CubeState.js (RubiksCube)
// Depends on: helpers.js (setCharAt)

(function() {
    'use strict';

    // Constants
    const CANVAS_RENDER_SIZE = 1200;
    const BASE_SCALE = 360;
    const SCALE_WHEEL_STEP = 0.05;
    const ROTATE_SPEED = 0.005;
    const SCALE_MIN = 0.2;
    const SCALE_MAX = 3.0;

    // Make BASE_SCALE globally accessible for settings
    window.BASE_SCALE = BASE_SCALE;

    // State
    let canvas = null;
    let ctx = null;
    let vc = null;
    let cube = null;
    let currentPreorientation = "";

    /**
     * Initialize the visual cube controller
     * @param {RubiksCube} cubeInstance - The cube state instance
     */
    function init(cubeInstance) {
        console.log("VisualCubeController.init called with cube:", cubeInstance);
        cube = cubeInstance;

        canvas = document.getElementById("cube");
        if (!canvas) {
            console.warn("VisualCubeController: canvas element not found");
            return;
        }
        console.log("VisualCubeController: canvas found");

        ctx = canvas.getContext("2d");

        // Create VisualCube instance
        if (window.VisualCube) {
            console.log("VisualCubeController: Creating VisualCube instance");
            vc = new VisualCube(CANVAS_RENDER_SIZE, CANVAS_RENDER_SIZE, BASE_SCALE, -0.523598, -0.209439, 0, 3, 0.08);
            window.vc = vc; // Make accessible globally for settings
            console.log("VisualCubeController: vc created:", vc);

            // Apply saved settings immediately (scale, rotation, etc.)
            if (window.VisualCubeSettings) {
                const settings = window.VisualCubeSettings.loadSettings();
                window.VisualCubeSettings.applySettings(settings);
            }
        } else {
            console.warn("VisualCubeController: VisualCube class not found");
        }

        setupCanvasPanControls();
    }

    /**
     * Check if pan is enabled
     * @returns {boolean}
     */
    function isPanEnabled() {
        if (window.VisualCubeSettings) {
            const settings = window.VisualCubeSettings.loadSettings();
            return settings.enablePan !== false;
        }
        return true;
    }

    /**
     * Check if zoom is enabled
     * @returns {boolean}
     */
    function isZoomEnabled() {
        if (window.VisualCubeSettings) {
            const settings = window.VisualCubeSettings.loadSettings();
            return settings.enableZoom !== false;
        }
        return true;
    }

    /**
     * Setup pan and zoom controls for the canvas
     */
    function setupCanvasPanControls() {
        if (!canvas) return;

        let isDragging = false;
        let lastX = 0;
        let lastY = 0;

        // Mouse events
        canvas.addEventListener('mousedown', function(e) {
            if (!isPanEnabled()) return;
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
        });

        canvas.addEventListener('mousemove', function(e) {
            if (!isDragging || !isPanEnabled()) return;

            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;

            vc.thetaY += deltaX * ROTATE_SPEED;
            vc.thetaX -= deltaY * ROTATE_SPEED;

            lastX = e.clientX;
            lastY = e.clientY;

            updateVirtualCube();
            saveRotationToSettings();
        });

        canvas.addEventListener('mouseup', function() {
            isDragging = false;
            canvas.style.cursor = 'grab';
        });

        canvas.addEventListener('mouseleave', function() {
            isDragging = false;
            canvas.style.cursor = 'grab';
        });

        // Touch events for single finger pan
        canvas.addEventListener('touchstart', function(e) {
            if (e.touches.length === 1 && isPanEnabled()) {
                isDragging = true;
                lastX = e.touches[0].clientX;
                lastY = e.touches[0].clientY;
                e.preventDefault();
            }
        });

        canvas.addEventListener('touchmove', function(e) {
            if (!isDragging || e.touches.length !== 1 || !isPanEnabled()) return;

            const deltaX = e.touches[0].clientX - lastX;
            const deltaY = e.touches[0].clientY - lastY;

            vc.thetaY += deltaX * ROTATE_SPEED;
            vc.thetaX -= deltaY * ROTATE_SPEED;

            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;

            updateVirtualCube();
            saveRotationToSettings();
            e.preventDefault();
        });

        canvas.addEventListener('touchend', function() {
            isDragging = false;
        });

        // Mouse wheel for zooming
        canvas.addEventListener('wheel', function(e) {
            if (!isZoomEnabled()) return;
            e.preventDefault();

            let currentScaleFactor;
            if (window.VisualCubeSettings) {
                const settings = window.VisualCubeSettings.loadSettings();
                currentScaleFactor = settings.scaleFactor || 1.0;
            } else {
                currentScaleFactor = vc.scale / BASE_SCALE;
            }

            const direction = e.deltaY > 0 ? -1 : 1;
            let newScaleFactor = currentScaleFactor + (direction * SCALE_WHEEL_STEP);
            newScaleFactor = Math.max(SCALE_MIN, Math.min(SCALE_MAX, newScaleFactor));

            if (newScaleFactor === currentScaleFactor) return;

            vc.scale = BASE_SCALE * newScaleFactor;
            updateVirtualCube();
            saveScaleToSettings(newScaleFactor);
        }, { passive: false });

        // Touch pinch-to-zoom
        let initialPinchDistance = null;
        let initialScaleFactor = null;

        function getTouchDistance(touch1, touch2) {
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }

        canvas.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2 && isZoomEnabled()) {
                e.preventDefault();
                initialPinchDistance = getTouchDistance(e.touches[0], e.touches[1]);

                if (window.VisualCubeSettings) {
                    const settings = window.VisualCubeSettings.loadSettings();
                    initialScaleFactor = settings.scaleFactor || 1.0;
                } else {
                    initialScaleFactor = vc.scale / BASE_SCALE;
                }
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', function(e) {
            if (e.touches.length === 2 && initialPinchDistance && initialScaleFactor && isZoomEnabled()) {
                e.preventDefault();

                const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
                const distanceRatio = currentDistance / initialPinchDistance;

                let newScaleFactor = initialScaleFactor * distanceRatio;
                newScaleFactor = Math.max(SCALE_MIN, Math.min(SCALE_MAX, newScaleFactor));

                vc.scale = BASE_SCALE * newScaleFactor;
                updateVirtualCube();
                saveScaleToSettings(newScaleFactor);
            }
        }, { passive: false });

        canvas.addEventListener('touchend', function(e) {
            if (e.touches.length < 2) {
                initialPinchDistance = null;
                initialScaleFactor = null;
            }
        }, { passive: false });

        // Set initial cursor
        canvas.style.cursor = 'grab';
    }

    /**
     * Save rotation angles to settings
     */
    function saveRotationToSettings() {
        if (!window.VisualCubeSettings) return;

        const settings = window.VisualCubeSettings.loadSettings();
        settings.thetaX = vc.thetaX;
        settings.thetaY = vc.thetaY;
        window.VisualCubeSettings.saveSettings(settings);

        // Update UI inputs
        const thetaXInput = document.getElementById('thetaX');
        const thetaYInput = document.getElementById('thetaY');
        if (thetaXInput) thetaXInput.value = vc.thetaX.toFixed(2);
        if (thetaYInput) thetaYInput.value = vc.thetaY.toFixed(2);
    }

    /**
     * Save scale factor to settings
     * @param {number} scaleFactor
     */
    function saveScaleToSettings(scaleFactor) {
        if (!window.VisualCubeSettings) return;

        const settings = window.VisualCubeSettings.loadSettings();
        settings.scaleFactor = scaleFactor;
        window.VisualCubeSettings.saveSettings(settings);

        // Update UI input
        const scaleInput = document.getElementById('cubeScale');
        if (scaleInput) scaleInput.value = scaleFactor.toFixed(2);
    }

    /**
     * Get rotation map for face colors based on moves
     * @param {string} moves - Rotation moves
     * @returns {Object} Map of face letters
     */
    function getRotationMap(moves) {
        const rotationMap = {};
        const rotationCube = new RubiksCube();

        rotationCube.doAlgorithm(moves);

        const faces = "URFDLB";
        for (let i = 0; i < 6; ++i) {
            rotationMap[faces[i]] = faces[rotationCube.cubestate[9 * i + 5][0] - 1];
        }

        return rotationMap;
    }

    /**
     * Update the virtual cube display
     * @param {string} initialRotations - Unused, kept for backward compatibility
     */
    function updateVirtualCube(initialRotations) {
        if (!vc || !cube || !ctx) {
            console.warn("updateVirtualCube: missing dependencies - vc:", !!vc, "cube:", !!cube, "ctx:", !!ctx);
            return;
        }

        // Display cube state directly - preorientation is already applied to cube state
        vc.cubeString = cube.toString();

        const useMaskCheckbox = document.getElementById('useMask');
        const useMask = useMaskCheckbox ? useMaskCheckbox.checked : true;
        const initialMask = document.getElementById('initialMask');
        const finalMask = document.getElementById('finalMask');

        // Only apply masks if training has started (not on initial load with no algs)
        const hasStarted = window.TrainerCore && window.TrainerCore.hasTrainingStarted();
        if (hasStarted) {
            const initialMaskValue = (useMask && initialMask) ? initialMask.value : '';
            const finalMaskValue = (useMask && finalMask) ? finalMask.value : '';
            const initialMaskedCubeString = cube.toInitialMaskedString(initialMaskValue);

            // Apply masking only (no rotation map needed - preorientation is in cube state)
            for (let k = 0; k < 54; ++k) {
                if (initialMaskedCubeString[k] === 'x' || finalMaskValue[k] === 'x') {
                    vc.cubeString = setCharAt(vc.cubeString, k, 'x');
                }
            }
        }

        vc.drawCube(ctx);
    }

    /**
     * Set current preorientation
     * @param {string} preorientation
     */
    function setCurrentPreorientation(preorientation) {
        currentPreorientation = preorientation;
    }

    /**
     * Get current preorientation
     * @returns {string}
     */
    function getCurrentPreorientation() {
        return currentPreorientation;
    }

    /**
     * Get the VisualCube instance
     * @returns {VisualCube}
     */
    function getVisualCube() {
        return vc;
    }

    /**
     * Get the canvas context
     * @returns {CanvasRenderingContext2D}
     */
    function getContext() {
        return ctx;
    }

    // Export to global scope
    window.VisualCubeController = {
        CANVAS_RENDER_SIZE,
        BASE_SCALE,
        SCALE_WHEEL_STEP,
        ROTATE_SPEED,
        init,
        isPanEnabled,
        isZoomEnabled,
        setupCanvasPanControls,
        getRotationMap,
        updateVirtualCube,
        setCurrentPreorientation,
        getCurrentPreorientation,
        getVisualCube,
        getContext
    };

    // Export for backward compatibility
    window.updateVirtualCube = updateVirtualCube;
    window.getRotationMap = getRotationMap;
    window.isPanEnabled = isPanEnabled;
    window.isZoomEnabled = isZoomEnabled;

})();
