const CANVAS_SIZE = 1200;
const BASE_SCALE = 360;
const SCALE_WHEEL_STEP = 0.05;
const ROTATE_SPEED = 0.005;
const DEFAULT_BODY_COLOR = "#000000";
const DEFAULT_FACE_COLORS = {
    U: "#ffffff",
    D: "#f0ff00",
    R: "#e8120a",
    L: "#fb8c00",
    F: "#66ff33",
    B: "#2055ff",
};

const SIZE_RANGE = { min: 2, max: 11, step: 1 };
const GAP_RANGE = { min: 0.005, max: 0.2, step: 0.005 };
const SCALE_RANGE = { min: 0.2, max: 3.0, step: 0.05 };

const FACE_KEYS = ["U", "D", "R", "L", "F", "B"];
const MOVE_TOKEN_PATTERN = /^(\d+)?([URFDLBurfdlbmesMESxyzXYZ])([wW])?((\d+)?'?)?$/;
const SETTINGS_STORAGE_KEY = "visualcube_settings_v1";
const SETTINGS_FILE_NAME = "visualcube-settings.json";

const INITIAL_STATE = {
    cubeSize: 3,
    stickerGap: 0.08,
    scaleFactor: 1,
    borderRatio: 0.65,
    autoBorderColor: true,
    borderColor: "#000000",
    borderShade: 0.85,
    baseColor: DEFAULT_BODY_COLOR,
    showBaseColor: true,
    pannable: true,
    zoomable: true,
    debugTextColor: "dark",
    maskLibrary: {},
    mode: "setupMoves",
    cubeStringInput: "",
    customStickerColors: {},
    backgroundColor: "#040406",
    backgroundTransparent: true,
    debugMode: false,
    theme: "dark",
    initialMask: "",
    rotation: {
        x: -0.4,
        y: -0.6,
        z: 0,
    },
};

let vc;
let nxCube;
let ctx;

let cubeSizeInput;
let stickerGapInput;
let stickerGapCustomInput;
let sizeScaleInput;
let stickerGapValue;
let borderRatioValue;
let borderShadeValue;
let sizeScaleValue;
let angleXValue;
let angleYValue;
let angleZValue;
let cubeStringInput;
let cubeStringStatus;
let cubeStringWrapper;
let cubeStringColorSection;
let cubeStringColors;
let clearCubeStringButton;
let resetButton;
let resetColorsButton;
let canvas;
let borderRatioInput;
let borderShadeInput;
let modeSelect;
let setupMovesWrapper;
const colorInputs = {};
const state = clone(INITIAL_STATE);
state.colors = {};
state.renderedFaces = createDefaultRenderState();
let baseColorInput;
let baseColorToggle;
let backgroundInput;
let resetBackgroundButton;
let backgroundTransparentToggle;
let pannableToggle;
let zoomableToggle;
let borderAutoToggle;
let borderColorInput;
let debugToggle;
let themeToggle;
let debugTextColorSelect;
let saveSettingsButton;
let loadSettingsButton;
let loadSettingsFileInput;
let debugCubeStringButton;
let setupInput;
let resetSetupButton;
let setupStatus;
let setupStatusText;
let movesInput;
let resetMovesButton;
let movesStatus;
let movesStatusText;
let currentMoveHighlight;
let openAlgButton;
let initialMaskInput;
let resetInitialMaskButton;
let initialMaskStatus;
const renderFaceInputs = {};
const sequenceState = {
    setup: { status: "idle", moves: [] },
    moves: { status: "idle", moves: [] },
};
let isRestoringSettings = false;
let saveSettingsTimer = null;

let isDragging = false;
let lastPointer = null;

document.addEventListener("DOMContentLoaded", () => {
    restoreModePreference();
    cacheDom();
    loadSettingsFromStorage();
    applyTheme();
    if (!canvas) {
        console.error("cubeCanvas element not found.");
        return;
    }

    setupScene();
    attachEvents();
    syncControls();
    rebuildGeometry();
    renderCube();
});

function cacheDom() {
    cubeSizeInput = document.getElementById("cubeSize");
    stickerGapInput = document.getElementById("stickerGap");
    stickerGapCustomInput = document.getElementById("stickerGapCustom");
    borderRatioInput = document.getElementById("borderRatio");
    borderShadeInput = document.getElementById("borderShade");
    sizeScaleInput = document.getElementById("sizeScale");
    cubeStringInput = document.getElementById("cubeStringInput");
    cubeStringStatus = document.getElementById("cubeStringStatus");
    cubeStringWrapper = document.getElementById("cubeStringWrapper");
    cubeStringColorSection = document.getElementById("cubeStringColorSection");
    cubeStringColors = document.getElementById("cubeStringColors");
    clearCubeStringButton = document.getElementById("clearCubeString");
    modeSelect = document.getElementById("modeSelect");
    setupMovesWrapper = document.getElementById("setupMovesWrapper");
    stickerGapValue = document.getElementById("stickerGapValue");
    borderRatioValue = document.getElementById("borderRatioValue");
    borderShadeValue = document.getElementById("borderShadeValue");
    sizeScaleValue = document.getElementById("sizeScaleValue");
    angleXValue = document.getElementById("angleX");
    angleYValue = document.getElementById("angleY");
    angleZValue = document.getElementById("angleZ");
    resetButton = document.getElementById("resetRotation");
    resetColorsButton = document.getElementById("resetColors");
    canvas = document.getElementById("cubeCanvas");
    baseColorInput = document.getElementById("baseColor");
    baseColorToggle = document.getElementById("baseColorToggle");
    backgroundInput = document.getElementById("bgColor");
    resetBackgroundButton = document.getElementById("resetBg");
    backgroundTransparentToggle = document.getElementById("bgTransparent");
    pannableToggle = document.getElementById("pannableToggle");
    zoomableToggle = document.getElementById("zoomableToggle");
    borderAutoToggle = document.getElementById("borderAuto");
    borderColorInput = document.getElementById("borderColor");
    debugToggle = document.getElementById("debugToggle");
    debugTextColorSelect = document.getElementById("debugTextColor");
    debugTextColorGroup = document.getElementById("debugTextColorGroup");
    themeToggle = document.getElementById("themeToggle");
    saveSettingsButton = document.getElementById("saveSettings");
    loadSettingsButton = document.getElementById("loadSettings");
    loadSettingsFileInput = document.getElementById("loadSettingsFile");
    debugCubeStringButton = document.getElementById("debugCubeString");
    setupInput = document.getElementById("setupInput");
    resetSetupButton = document.getElementById("resetSetup");
    setupStatus = document.getElementById("setupStatus");
    setupStatusText = document.getElementById("setupStatusText");
    movesInput = document.getElementById("movesInput");
    resetMovesButton = document.getElementById("resetMoves");
    movesStatus = document.getElementById("movesStatus");
    movesStatusText = document.getElementById("movesStatusText");
    currentMoveHighlight = document.getElementById("currentMoveHighlight");
    openAlgButton = document.getElementById("openAlgButton");
    initialMaskInput = document.getElementById("initialMaskInput");
    resetInitialMaskButton = document.getElementById("resetInitialMask");
    initialMaskStatus = document.getElementById("initialMaskStatus");
    FACE_KEYS.forEach((face) => {
        colorInputs[face] = document.getElementById(`color${face}`);
        renderFaceInputs[face] = document.getElementById(`render${face}`);
    });
    if (modeSelect) {
        modeSelect.value = state.mode === "cubeString" ? "cubeString" : "setupMoves";
    }
    updateModeVisibility();
    updateSequenceStatus("setup", "idle");
    updateSequenceStatus("moves", "idle");
    autoResizeSequenceFields();
}

function setupScene() {
    loadMaskForCurrentCubeSize();
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    ctx = canvas.getContext("2d");

    nxCube = new RubiksCubeNxN(state.cubeSize);
    vc = new VisualCube(
        CANVAS_SIZE,
        CANVAS_SIZE,
        BASE_SCALE * state.scaleFactor,
        state.rotation.x,
        state.rotation.y,
        state.rotation.z,
        state.cubeSize,
        state.stickerGap,
        state.borderRatio
    );
    vc.debugMode = state.debugMode;
    vc.debugTextColor = state.debugTextColor;
    vc.cubeString = nxCube.toCubeString(getRenderedMask());
    syncInitialMask();
    ensureColorState();
    applyColors();
    applyBackground();
    applyBorderStyle(false);
}

function attachEvents() {
    cubeSizeInput?.addEventListener("change", () => {
        state.cubeSize = clamp(parseInt(cubeSizeInput.value, 10) || INITIAL_STATE.cubeSize, SIZE_RANGE.min, SIZE_RANGE.max);
        loadMaskForCurrentCubeSize();
        rebuildGeometry();
        renderCube();
        scheduleSettingsSave();
    });

    stickerGapInput?.addEventListener("input", () => {
        const raw = parseFloat(stickerGapInput.value);
        if (Number.isFinite(raw)) {
            applyStickerGap(raw);
            scheduleSettingsSave();
        }
    });

    stickerGapCustomInput?.addEventListener("input", () => {
        const raw = parseFloat(stickerGapCustomInput.value);
        if (Number.isFinite(raw)) {
            applyStickerGap(raw);
            scheduleSettingsSave();
        }
    });

    borderAutoToggle?.addEventListener("change", () => {
        state.autoBorderColor = Boolean(borderAutoToggle.checked);
        if (borderColorInput) {
            borderColorInput.disabled = state.autoBorderColor;
        }
        applyBorderStyle();
        scheduleSettingsSave();
    });

    openAlgButton?.addEventListener("click", () => {
        handleAlgCubingExport();
    });

    borderColorInput?.addEventListener("input", () => {
        if (!state.autoBorderColor) {
            state.borderColor = borderColorInput.value || "#000000";
            applyBorderStyle();
            scheduleSettingsSave();
        }
    });

    borderShadeInput?.addEventListener("input", () => {
        const raw = parseFloat(borderShadeInput.value);
        if (Number.isFinite(raw)) {
            state.borderShade = clamp(raw, 0.2, 1);
            updateBorderShadeLabel();
            applyBorderStyle();
            scheduleSettingsSave();
        }
    });

    sizeScaleInput?.addEventListener("input", () => {
        state.scaleFactor = clamp(parseFloat(sizeScaleInput.value) || INITIAL_STATE.scaleFactor, SCALE_RANGE.min, SCALE_RANGE.max);
        updateScaleLabel();
        updateScale();
        renderCube();
        scheduleSettingsSave();
    });

    borderRatioInput?.addEventListener("input", () => {
        state.borderRatio = clamp(parseFloat(borderRatioInput.value) || INITIAL_STATE.borderRatio, 0, 1);
        updateBorderRatioLabel();
        rebuildGeometry();
        renderCube();
        scheduleSettingsSave();
    });

    resetButton?.addEventListener("click", () => {
        Object.assign(state.rotation, INITIAL_STATE.rotation);
        updateAngleLabels();
        renderCube();
        scheduleSettingsSave();
    });

    resetColorsButton?.addEventListener("click", () => {
        resetColorsState();
        applyColors();
        syncControls();
        renderCube();
        scheduleSettingsSave();
    });

    baseColorInput?.addEventListener("input", () => {
        state.baseColor = normalizeColor(baseColorInput.value || state.baseColor || DEFAULT_BODY_COLOR);
        applyColors();
        renderCube();
        scheduleSettingsSave();
    });

    baseColorToggle?.addEventListener("change", () => {
        state.showBaseColor = Boolean(baseColorToggle.checked);
        applyColors();
        renderCube();
        scheduleSettingsSave();
    });

    pannableToggle?.addEventListener("change", () => {
        state.pannable = Boolean(pannableToggle.checked);
        scheduleSettingsSave();
    });

    zoomableToggle?.addEventListener("change", () => {
        state.zoomable = Boolean(zoomableToggle.checked);
        scheduleSettingsSave();
    });

    backgroundInput?.addEventListener("input", () => {
        const value = backgroundInput.value || INITIAL_STATE.backgroundColor;
        state.backgroundColor = normalizeColor(value) || INITIAL_STATE.backgroundColor;
        state.backgroundTransparent = false;
        if (backgroundTransparentToggle) {
            backgroundTransparentToggle.checked = false;
        }
        applyBackground();
        scheduleSettingsSave();
    });

    resetBackgroundButton?.addEventListener("click", () => {
        state.backgroundColor = INITIAL_STATE.backgroundColor;
        state.backgroundTransparent = INITIAL_STATE.backgroundTransparent;
        applyBackground();
        if (backgroundInput) backgroundInput.value = state.backgroundColor;
        if (backgroundTransparentToggle) backgroundTransparentToggle.checked = state.backgroundTransparent;
        scheduleSettingsSave();
    });

    backgroundTransparentToggle?.addEventListener("change", () => {
        state.backgroundTransparent = Boolean(backgroundTransparentToggle.checked);
        applyBackground();
        scheduleSettingsSave();
    });

    debugToggle?.addEventListener("change", () => {
        state.debugMode = Boolean(debugToggle.checked);
        if (vc) {
            vc.debugMode = state.debugMode;
        }
        renderCube();
        scheduleSettingsSave();
        if (debugTextColorGroup) {
            debugTextColorGroup.hidden = !state.debugMode;
        }
    });

    themeToggle?.addEventListener("change", () => {
        state.theme = themeToggle.checked ? "dark" : "light";
        applyTheme();
        scheduleSettingsSave();
    });

    const bindAngleInput = (input, axis) => {
        input?.addEventListener("change", () => {
            const value = parseFloat(input.value);
            if (!Number.isFinite(value)) {
                updateAngleLabels();
                return;
            }
            state.rotation[axis] = value;
            renderCube();
            scheduleSettingsSave();
        });
    };
    bindAngleInput(angleXValue, "x");
    bindAngleInput(angleYValue, "y");
    bindAngleInput(angleZValue, "z");

    modeSelect?.addEventListener("change", () => {
        const nextMode = modeSelect.value === "cubeString" ? "cubeString" : "setupMoves";
        if (state.mode !== nextMode) {
            state.mode = nextMode;
            persistModeSetting();
            updateModeVisibility();
            updateCubeFromSequences();
            renderCube();
            scheduleSettingsSave();
        }
    });

    debugTextColorSelect?.addEventListener("change", () => {
        const value = debugTextColorSelect.value === "light" ? "light" : "dark";
        state.debugTextColor = value;
        if (vc) {
            vc.debugTextColor = value;
        }
        scheduleSettingsSave();
        renderCube();
    });

    resetSetupButton?.addEventListener("click", () => {
        resetSequenceField("setup");
    });

    attachSequenceFieldListeners(setupInput, "setup", { allowBacktrack: false });
    resetMovesButton?.addEventListener("click", () => {
        resetSequenceField("moves");
    });
    attachSequenceFieldListeners(movesInput, "moves", { allowBacktrack: true });
    attachCubeStringListeners(cubeStringInput);

    initialMaskInput?.addEventListener("input", () => {
        if (initialMaskInput.classList.contains("is-invalid")) {
            initialMaskInput.classList.remove("is-invalid");
            updateInitialMaskStatus();
        }
    });
    initialMaskInput?.addEventListener("change", () => {
        applyInitialMaskFromInput(initialMaskInput.value);
    });
    resetInitialMaskButton?.addEventListener("click", () => {
        resetInitialMask();
        renderCube();
        scheduleSettingsSave();
    });

    saveSettingsButton?.addEventListener("click", handleSettingsDownload);
    loadSettingsButton?.addEventListener("click", () => loadSettingsFileInput?.click());
    loadSettingsFileInput?.addEventListener("change", handleSettingsFileSelected);
    debugCubeStringButton?.addEventListener("click", () => {
        const current = vc?.cubeString || "";
        alert(current || "No cube string available");
    });

    FACE_KEYS.forEach((face) => {
        const input = colorInputs[face];
        if (!input) return;
        input.addEventListener("input", () => {
            const value = normalizeColor(input.value || state.colors[face]);
            state.colors[face] = value;
            applyColors();
            renderCube();
            scheduleSettingsSave();
        });
    });

    FACE_KEYS.forEach((face) => {
        const checkbox = renderFaceInputs[face];
        if (!checkbox) return;
        checkbox.addEventListener("change", () => {
            if (!state.renderedFaces) {
                state.renderedFaces = createDefaultRenderState();
            }
            state.renderedFaces[face] = Boolean(checkbox.checked);
            renderCube();
            scheduleSettingsSave();
        });
    });

    canvas?.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointermove", handlePointerMove);
    canvas?.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("resize", () => updateCurrentMoveIndicator());

    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            Object.assign(state.rotation, INITIAL_STATE.rotation);
            updateAngleLabels();
            renderCube();
            scheduleSettingsSave();
        }
    });
}

function syncControls() {
    if (cubeSizeInput) cubeSizeInput.value = state.cubeSize;
    updateStickerGapUI();
    if (borderRatioInput) borderRatioInput.value = state.borderRatio;
    if (sizeScaleInput) sizeScaleInput.value = state.scaleFactor;
    updateBorderRatioLabel();
    updateScaleLabel();
    updateAngleLabels();
    if (baseColorInput) {
        baseColorInput.value = state.baseColor ?? DEFAULT_BODY_COLOR;
    }
    if (baseColorToggle) {
        baseColorToggle.checked = state.showBaseColor;
    }
    if (backgroundInput) {
        backgroundInput.value = state.backgroundColor;
    }
    if (backgroundTransparentToggle) {
        backgroundTransparentToggle.checked = state.backgroundTransparent;
    }
    if (pannableToggle) {
        pannableToggle.checked = state.pannable;
    }
    if (zoomableToggle) {
        zoomableToggle.checked = state.zoomable;
    }
    if (debugToggle) {
        debugToggle.checked = state.debugMode;
    }
    if (debugTextColorSelect) {
        debugTextColorSelect.value = state.debugTextColor === "light" ? "light" : "dark";
    }
    if (debugTextColorGroup) {
        debugTextColorGroup.hidden = !state.debugMode;
    }
    if (themeToggle) {
        themeToggle.checked = state.theme !== "light";
    }
    if (borderAutoToggle) {
        borderAutoToggle.checked = state.autoBorderColor;
    }
    if (borderColorInput) {
        borderColorInput.disabled = state.autoBorderColor;
        borderColorInput.value = state.borderColor ?? "#000000";
    }
    if (borderShadeInput) {
        borderShadeInput.value = state.borderShade;
    }
    updateBorderShadeLabel();
    updateBorderControls();
    FACE_KEYS.forEach((face) => {
        const checkbox = renderFaceInputs[face];
        if (checkbox) {
            const shouldRender = state.renderedFaces ? state.renderedFaces[face] !== false : true;
            checkbox.checked = shouldRender;
        }
    });
    FACE_KEYS.forEach((face) => {
        const input = colorInputs[face];
        if (input) {
            input.value = state.colors[face] ?? "#ffffff";
        }
    });
    if (cubeStringInput) {
        cubeStringInput.value = state.mode === "cubeString" ? state.cubeStringInput : (state.cubeStringInput || "");
    }
    syncInitialMask();
    updateModeVisibility();
}

function rebuildGeometry() {
    if (!vc) return;
    vc.cubeSize = state.cubeSize;
    vc.gapSize = state.stickerGap;
    vc.edgeGapRatio = state.borderRatio;
    vc.faceStickers = VisualCube.getFaceStickers(state.cubeSize, state.stickerGap, state.borderRatio);
    nxCube = new RubiksCubeNxN(state.cubeSize);
    vc.cubeString = nxCube.toCubeString(getRenderedMask());
    syncInitialMask();
    updateCubeFromSequences();
}

function updateScale() {
    if (!vc) return;
    vc.scale = BASE_SCALE * state.scaleFactor;
}

function renderCube() {
    if (!vc || !ctx) return;
    vc.thetaX = state.rotation.x;
    vc.thetaY = state.rotation.y;
    vc.thetaZ = state.rotation.z;
    vc.showBaseColor = state.showBaseColor;
    vc.debugMode = state.debugMode;
    vc.renderedFaces = state.renderedFaces;
    vc.drawCube(ctx);
    updateAngleLabels();
}

function updateAngleLabels() {
    if (!angleXValue || !angleYValue || !angleZValue) return;
    angleXValue.value = state.rotation.x.toFixed(4);
    angleYValue.value = state.rotation.y.toFixed(4);
    angleZValue.value = state.rotation.z.toFixed(4);
}

function updateScaleLabel() {
    if (!sizeScaleValue) return;
    sizeScaleValue.textContent = `${state.scaleFactor.toFixed(2)}×`;
}

function updateBorderRatioLabel() {
    if (!borderRatioValue) return;
    borderRatioValue.textContent = state.borderRatio.toFixed(2);
}

function applyColors() {
    if (!vc || !vc.stickerColors) return;
    const baseKey = (typeof VisualCube !== "undefined" && VisualCube.BASE_COLOR_KEY) ? VisualCube.BASE_COLOR_KEY : "_";
    FACE_KEYS.forEach((face) => {
        if (state.colors[face]) {
            vc.stickerColors[face] = state.colors[face];
        }
    });
    vc.baseColor = state.baseColor ?? DEFAULT_BODY_COLOR;
    vc.stickerColors[baseKey] = vc.baseColor;
    vc.showBaseColor = state.showBaseColor;
    ensureCustomColorState();
    if (typeof vc.setCustomColors === "function") {
        vc.setCustomColors(state.customStickerColors);
    } else {
        Object.entries(state.customStickerColors).forEach(([char, color]) => {
            if (char) {
                vc.stickerColors[char] = normalizeColor(color);
            }
        });
    }
}

function updateModeVisibility() {
    const showSetup = state.mode !== "cubeString";
    if (setupMovesWrapper) {
        setupMovesWrapper.hidden = !showSetup;
    }
    if (cubeStringWrapper) {
        cubeStringWrapper.hidden = showSetup;
    }
}

function updateBorderControls() {
    if (borderColorInput) {
        borderColorInput.disabled = state.autoBorderColor;
    }
}

function updateBorderShadeLabel() {
    if (borderShadeValue) {
        borderShadeValue.textContent = state.borderShade.toFixed(2);
    }
}

function updateStickerGapUI() {
    if (stickerGapValue) {
        stickerGapValue.textContent = state.stickerGap.toFixed(3);
    }
    if (stickerGapInput) {
        stickerGapInput.value = state.stickerGap;
    }
    if (stickerGapCustomInput) {
        stickerGapCustomInput.value = state.stickerGap.toFixed(3);
    }
}

function applyStickerGap(value) {
    const next = clamp(value, GAP_RANGE.min, GAP_RANGE.max);
    if (Number.isNaN(next)) {
        return;
    }
    state.stickerGap = next;
    updateStickerGapUI();
    rebuildGeometry();
    renderCube();
}

function applyBorderStyle(shouldRender = true) {
    if (!vc) return;
    vc.stickerBorderShade = clamp(state.borderShade ?? 0.85, 0.2, 1);
    vc.stickerBorderColor = state.autoBorderColor ? null : (state.borderColor || "#000000");
    updateBorderControls();
    if (shouldRender) {
        renderCube();
    }
}

function applyBackground() {
    if (canvas) {
        canvas.style.background = state.backgroundTransparent ? "transparent" : state.backgroundColor;
    }
}

function applyTheme() {
    const nextTheme = state.theme === "light" ? "light" : "dark";
    if (document.body) {
        document.body.dataset.theme = nextTheme;
        document.body.classList.toggle("text-dark", nextTheme === "light");
        document.body.classList.toggle("text-light", nextTheme === "dark");
    }
}

function applyMovesSequence(setupMoves, moveMoves) {
    try {
        nxCube = new RubiksCubeNxN(state.cubeSize);
        const maskCube = new RubiksCubeNxN(state.cubeSize);
        const mask = getRenderedMask();
        const setupString = setupMoves && setupMoves.length ? setupMoves.join(" ") : "";
        if (setupString) {
            nxCube.applyMoves(setupString);
            maskCube.applyMoves(setupString);
            maskCube.resetMaskIndices();
        }
        const moveString = moveMoves && moveMoves.length ? moveMoves.join(" ") : "";
        if (moveString) {
            nxCube.applyMoves(moveString);
            maskCube.applyMoves(moveString);
        }

        const baseString = nxCube.toCubeString();
        const maskString = maskCube.toCubeString(mask);
        const cubeString = applyMaskToCubeString(baseString, maskString);
        vc.cubeString = cubeString;
        syncInitialMask();
        renderCube();
    } catch (error) {
        console.error("Failed to apply moves", error);
    }
}

function handleSequenceInputChange(kind, options = {}) {
    const { input } = getSequenceElements(kind);
    if (!input) return;
    const allowBacktrack = kind === "moves" && options.allowBacktrack;
    const raw = kind === "moves"
        ? getSequenceTextBeforeCursor(input, { allowBacktrack })
        : input.value || "";
    autoResizeTextarea(input);
    const parsed = parseSequenceInput(raw);
    applySequenceResult(kind, parsed);
    if (kind === "moves") {
        updateCurrentMoveIndicator();
    }
}

function applySequenceResult(kind, result) {
    const { input } = getSequenceElements(kind);
    if (!input) return;
    if (result.status === "invalid") {
        input.classList.add("is-invalid");
    } else {
        input.classList.remove("is-invalid");
    }
    sequenceState[kind] = { status: result.status, moves: result.moves };
    updateSequenceStatus(kind, result.status, result.message);
    updateCubeFromSequences();
    scheduleSettingsSave();
}

function parseSequenceInput(raw) {
    if (!raw || !raw.trim()) {
        return { status: "idle", moves: [], message: "Waiting for input" };
    }
    const tokens = [];
    let depth = 0;
    let invalidMessage = null;
    raw.split(/\r?\n/).forEach((line) => {
        if (invalidMessage) return;
        const commentIndex = line.indexOf("//");
        const withoutComment = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
        if (!withoutComment.trim()) return;
        const sanitizedChars = [];
        for (const ch of withoutComment) {
            if (ch === "(") {
                depth += 1;
                sanitizedChars.push(" ");
                continue;
            }
            if (ch === ")") {
                depth -= 1;
                if (depth < 0) {
                    invalidMessage = "Unmatched closing parenthesis";
                    return;
                }
                sanitizedChars.push(" ");
                continue;
            }
            sanitizedChars.push(ch);
        }
        const sanitizedLine = sanitizedChars.join("").trim();
        if (!sanitizedLine) return;
        sanitizedLine
            .split(/\s+/)
            .filter(Boolean)
            .forEach((token) => tokens.push(token));
    });

    if (invalidMessage) {
        return { status: "invalid", moves: [], message: invalidMessage };
    }
    if (depth !== 0) {
        return { status: "invalid", moves: [], message: "Unmatched opening parenthesis" };
    }

    if (tokens.length === 0) {
        return { status: "idle", moves: [], message: "Waiting for input" };
    }

    for (const token of tokens) {
        if (!MOVE_TOKEN_PATTERN.test(token)) {
            return {
                status: "invalid",
                moves: [],
                message: `Invalid token "${token}"`,
            };
        }
    }

    const moveCount = tokens.length;
    return {
        status: "valid",
        moves: tokens,
        message: `Applied ${moveCount} move${moveCount === 1 ? "" : "s"}`,
    };
}

function autoResizeTextarea(element) {
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
}

function autoResizeSequenceFields() {
    autoResizeTextarea(setupInput);
    autoResizeTextarea(movesInput);
    updateCurrentMoveIndicator();
}

function attachSequenceFieldListeners(input, kind, options = {}) {
    if (!input) return;
    const handler = () => handleSequenceInputChange(kind, options);
    ["input", "click", "keyup", "mouseup", "scroll"].forEach((eventName) => {
        input.addEventListener(eventName, handler);
    });
}

function attachCubeStringListeners(input) {
    if (!input) return;
    const handler = () => handleCubeStringInputChange(input.value);
    ["input", "click", "keyup", "mouseup", "scroll"].forEach((eventName) => {
        input.addEventListener(eventName, handler);
    });
}

function updateCurrentMoveIndicator() {
    if (!currentMoveHighlight || !movesInput) return;
    const info = getCurrentMoveTokenInfo(movesInput);
    if (!(info && info.token)) {
        currentMoveHighlight.classList.add("is-empty");
        currentMoveHighlight.style.opacity = "0";
        return;
    }
    const startCoords = getCaretCoordinates(movesInput, info.start);
    const endCoords = getCaretCoordinates(movesInput, info.end);
    if (!startCoords || !endCoords) {
        currentMoveHighlight.classList.add("is-empty");
        currentMoveHighlight.style.opacity = "0";
        return;
    }
    const width = Math.max(4, endCoords.left - startCoords.left);
    const height = startCoords.height;
    const offsetTop = movesInput.offsetTop || 0;
    const offsetLeft = movesInput.offsetLeft || 0;
    currentMoveHighlight.style.top = `${offsetTop + startCoords.top}px`;
    currentMoveHighlight.style.left = `${offsetLeft + startCoords.left}px`;
    currentMoveHighlight.style.width = `${width}px`;
    currentMoveHighlight.style.height = `${height}px`;
    currentMoveHighlight.classList.remove("is-empty");
    currentMoveHighlight.style.opacity = "1";
}

function getSequenceTextBeforeCursor(input, { allowBacktrack = false } = {}) {
    if (!input) return "";
    const value = input.value || "";
    if (document.activeElement === input && typeof input.selectionStart === "number") {
        const cursor = Math.min(Math.max(input.selectionStart, 0), value.length);
        let candidate = value.slice(0, cursor);
        let adjustedCursor = cursor;
        if (allowBacktrack) {
            let parsed = parseSequenceInput(candidate);
            while (parsed.status === "invalid" && adjustedCursor > 0) {
                adjustedCursor -= 1;
                candidate = value.slice(0, adjustedCursor);
                parsed = parseSequenceInput(candidate);
            }
            // if (adjustedCursor !== cursor) {
            //     input.selectionStart = adjustedCursor;
            //     input.selectionEnd = adjustedCursor;
            // }
        }
        return candidate;
    }
    return value;
}

function getCurrentMoveTokenInfo(input) {
    if (!input) return null;
    const value = input.value || "";
    if (!value) return null;
    const cursor = typeof input.selectionStart === "number"
        ? Math.min(Math.max(input.selectionStart, 0), value.length)
        : value.length;

    const isValidToken = (text) => MOVE_TOKEN_PATTERN.test(text.trim());
    const scanToken = (position) => {
        let start = position;
        while (start > 0 && !/\s/.test(value[start - 1])) {
            start -= 1;
        }
        let end = position;
        while (end < value.length && !/\s/.test(value[end])) {
            end += 1;
        }
        const token = value.slice(start, end).trim();
        return { token, start, end };
    };

    const currentChar = value[cursor];
    if (currentChar && !/\s/.test(currentChar)) {
        const forwardInfo = scanToken(cursor);
        if (forwardInfo.token && isValidToken(forwardInfo.token)) {
            return forwardInfo;
        }
    }

    let backCursor = cursor;
    while (backCursor > 0) {
        const info = scanToken(backCursor);
        if (info.token && isValidToken(info.token)) {
            return info;
        }
        backCursor = info.start - 1;
    }
    return null;
}


function getCaretCoordinates(textarea, positionOverride) {
    if (!textarea) {
        return null;
    }
    const value = textarea.value || "";
    const position = typeof positionOverride === "number"
        ? Math.min(Math.max(positionOverride, 0), value.length)
        : (typeof textarea.selectionStart === "number"
            ? Math.min(Math.max(textarea.selectionStart, 0), value.length)
            : value.length);
    const computed = window.getComputedStyle(textarea);
    const mirror = document.createElement("div");
    const propertiesToCopy = [
        "boxSizing",
        "width",
        "height",
        "fontSize",
        "fontFamily",
        "fontWeight",
        "fontStyle",
        "letterSpacing",
        "textTransform",
        "textAlign",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        "borderTopWidth",
        "borderRightWidth",
        "borderBottomWidth",
        "borderLeftWidth",
        "lineHeight",
        "whiteSpace",
    ];
    propertiesToCopy.forEach((prop) => {
        mirror.style[prop] = computed[prop];
    });
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.pointerEvents = "none";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordWrap = "break-word";
    mirror.style.overflow = "hidden";
    mirror.style.width = `${textarea.clientWidth}px`;
    mirror.textContent = value.substring(0, position);
    const marker = document.createElement("span");
    marker.textContent = value.charAt(position) || "\u200b";
    mirror.appendChild(marker);
    document.body.appendChild(mirror);
    const markerRect = marker.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();
    document.body.removeChild(mirror);
    const top = markerRect.top - mirrorRect.top - textarea.scrollTop;
    const left = markerRect.left - mirrorRect.left - textarea.scrollLeft;
    const lineHeight = parseFloat(computed.lineHeight);
    const height = Number.isFinite(lineHeight)
        ? lineHeight
        : markerRect.height || parseFloat(computed.fontSize) || 16;
    return {
        top,
        left,
        height,
    };
}

function buildAlgCubingURL({ puzzleSize, title, setup, moves, type } = {}) {
    if (!Number.isInteger(puzzleSize) || puzzleSize < 2) {
        throw new Error("puzzleSize must be an integer ≥ 2");
    }
    const puzzle = `${puzzleSize}x${puzzleSize}x${puzzleSize}`;

    const normalize = (text) =>
        String(text || "")
            .split(/\r?\n/)
            .map((line) => line.trim().replace(/\s+/g, " "))
            .join("\n");

    const encodeAlgField = (text) => {
        const withUnderscores = text.replace(/ /g, "_");
        const withHyphenEntities = withUnderscores.replace(/-/g, "&#45;");
        return encodeURIComponent(withHyphenEntities);
    };

    const normTitle = "";
    const normSetup = normalize(setup);
    const normMoves = normalize(moves);

    const params = [];
    params.push(`puzzle=${encodeURIComponent(puzzle)}`);
    if (type) params.push(`type=${encodeURIComponent(type)}`);
    params.push(`setup=${encodeAlgField(normSetup)}`);
    params.push(`alg=${encodeAlgField(normMoves)}`);

    return `https://alg.cubing.net/?${params.join("&")}`;
}

function handleAlgCubingExport() {
    if (sequenceState.setup.status === "invalid" || sequenceState.moves.status === "invalid") {
        alert("Please fix setup and moves before exporting.");
        return;
    }
    const url = buildAlgCubingURL({
        puzzleSize: state.cubeSize,
        setup: setupInput?.value || "",
        moves: movesInput?.value || "",
    });
    console.log("Opening alg.cubing.net URL:", url);
    window.open(url, "_blank", "noopener");
}

function updateSequenceStatus(kind, stateKey, message) {
    const { statusEl, statusTextEl } = getSequenceElements(kind);
    if (!statusEl || !statusTextEl) return;
    const friendly = kind === "setup" ? "Setup" : "Moves";
    statusEl.classList.remove("is-valid", "is-invalid");
    if (stateKey === "valid") {
        statusEl.classList.add("is-valid");
        statusTextEl.textContent = message || `${friendly} applied`;
    } else if (stateKey === "invalid") {
        statusEl.classList.add("is-invalid");
        statusTextEl.textContent = message || `Invalid ${friendly.toLowerCase()}`;
    } else {
        statusTextEl.textContent = message || `Waiting for ${friendly.toLowerCase()}`;
    }
}

function setCubeBlankState() {
    if (!vc) return;
    const baseKey = (typeof VisualCube !== "undefined" && VisualCube.BASE_COLOR_KEY) ? VisualCube.BASE_COLOR_KEY : "_";
    const stickersPerFace = state.cubeSize * state.cubeSize;
    const blankFace = baseKey.repeat(stickersPerFace);
    vc.cubeString = blankFace.repeat(FACE_KEYS.length);
    syncInitialMask();
    renderCube();
}

function updateCubeFromSequences() {
    if (!vc) return;
    if (state.mode === "cubeString") {
        applyCubeStringState();
        return;
    }
    if (sequenceState.setup.status === "invalid" || sequenceState.moves.status === "invalid") {
        setCubeBlankState();
        return;
    }
    applyMovesSequence(sequenceState.setup.moves, sequenceState.moves.moves);
}

function resetSequenceField(kind) {
    const { input } = getSequenceElements(kind);
    if (!input) return;
    input.value = "";
    input.classList.remove("is-invalid");
    sequenceState[kind] = { status: "idle", moves: [] };
    updateSequenceStatus(kind, "idle");
    updateCubeFromSequences();
    scheduleSettingsSave();
    if (kind === "moves") {
        updateCurrentMoveIndicator();
    }
}

function getSequenceElements(kind) {
    if (kind === "setup") {
        return {
            input: setupInput,
            statusEl: setupStatus,
            statusTextEl: setupStatusText,
        };
    }
    return {
        input: movesInput,
        statusEl: movesStatus,
        statusTextEl: movesStatusText,
    };
}

function buildSettingsSnapshot() {
    syncInitialMask();
    return {
        version: 1,
        state: clone(state),
        sequences: {
            setup: setupInput?.value || "",
            moves: movesInput?.value || "",
        },
    };
}

function saveSettingsToStorage() {
    if (typeof localStorage === "undefined") return;
    try {
        const snapshot = buildSettingsSnapshot();
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
        console.error("Failed to save settings", error);
    }
}

function scheduleSettingsSave() {
    if (isRestoringSettings || typeof window === "undefined") return;
    if (saveSettingsTimer) {
        window.clearTimeout(saveSettingsTimer);
    }
    saveSettingsTimer = window.setTimeout(() => {
        saveSettingsTimer = null;
        saveSettingsToStorage();
    }, 300);
}

function loadSettingsFromStorage() {
    if (typeof localStorage === "undefined") return;
    try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!raw) return;
        isRestoringSettings = true;
        const snapshot = JSON.parse(raw);
        applySettingsSnapshot(snapshot);
    } catch (error) {
        console.error("Failed to parse saved settings", error);
    } finally {
        isRestoringSettings = false;
    }
}

function applySettingsSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return;
    if (snapshot.state && typeof snapshot.state === "object") {
        hydrateStateFromSnapshot(snapshot.state);
    }
    const sequences = snapshot.sequences || {};
    const setupValue = typeof sequences.setup === "string"
        ? sequences.setup
        : (typeof snapshot.setup === "string" ? snapshot.setup : null);
    if (setupInput && typeof setupValue === "string") {
        setupInput.value = setupValue;
        handleSequenceInputChange("setup");
    }
    const movesValue = typeof sequences.moves === "string"
        ? sequences.moves
        : (typeof sequences.algorithm === "string"
            ? sequences.algorithm
            : (typeof snapshot.algorithm === "string" ? snapshot.algorithm : null));
    if (movesInput && typeof movesValue === "string") {
        movesInput.value = movesValue;
        handleSequenceInputChange("moves");
    }
}

function hydrateStateFromSnapshot(savedState) {
    if (!savedState || typeof savedState !== "object") return;
    if ("cubeSize" in savedState) {
        state.cubeSize = clamp(parseInt(savedState.cubeSize, 10) || state.cubeSize, SIZE_RANGE.min, SIZE_RANGE.max);
    }
    if ("stickerGap" in savedState) {
        state.stickerGap = clamp(parseFloat(savedState.stickerGap) || state.stickerGap, GAP_RANGE.min, GAP_RANGE.max);
    }
    if ("scaleFactor" in savedState) {
        state.scaleFactor = clamp(parseFloat(savedState.scaleFactor) || state.scaleFactor, SCALE_RANGE.min, SCALE_RANGE.max);
    }
    if ("borderRatio" in savedState) {
        state.borderRatio = clamp(parseFloat(savedState.borderRatio) || state.borderRatio, 0, 1);
    }
    if ("autoBorderColor" in savedState) {
        state.autoBorderColor = Boolean(savedState.autoBorderColor);
    }
    if ("borderShade" in savedState) {
        state.borderShade = clamp(parseFloat(savedState.borderShade) || state.borderShade, 0.2, 1);
    }
    if ("borderColor" in savedState && savedState.borderColor) {
        state.borderColor = normalizeColor(savedState.borderColor);
    }
    if ("baseColor" in savedState && savedState.baseColor) {
        state.baseColor = normalizeColor(savedState.baseColor);
    }
    if ("showBaseColor" in savedState) {
        state.showBaseColor = Boolean(savedState.showBaseColor);
    }
    if ("pannable" in savedState) {
        state.pannable = Boolean(savedState.pannable);
    }
    if ("zoomable" in savedState) {
        state.zoomable = Boolean(savedState.zoomable);
    }
    if ("backgroundColor" in savedState && savedState.backgroundColor) {
        state.backgroundColor = normalizeColor(savedState.backgroundColor);
    }
    if ("backgroundTransparent" in savedState) {
        state.backgroundTransparent = Boolean(savedState.backgroundTransparent);
    }
    if ("debugMode" in savedState) {
        state.debugMode = Boolean(savedState.debugMode);
    }
    if (typeof savedState.debugTextColor === "string") {
        state.debugTextColor = savedState.debugTextColor === "light" ? "light" : "dark";
    }
    if (typeof savedState.mode === "string") {
        state.mode = savedState.mode === "cubeString" ? "cubeString" : "setupMoves";
    }
    if (savedState.maskLibrary && typeof savedState.maskLibrary === "object") {
        state.maskLibrary = clone(savedState.maskLibrary);
    } else if (!state.maskLibrary || typeof state.maskLibrary !== "object") {
        state.maskLibrary = {};
    }
    if (savedState.customStickerColors && typeof savedState.customStickerColors === "object") {
        state.customStickerColors = clone(savedState.customStickerColors);
    } else if (!state.customStickerColors || typeof state.customStickerColors !== "object") {
        state.customStickerColors = {};
    }
    if (typeof savedState.mode === "string") {
        state.mode = savedState.mode === "cubeString" ? "cubeString" : "setupMoves";
    }
    if (typeof savedState.cubeStringInput === "string") {
        state.cubeStringInput = savedState.cubeStringInput;
    }
    const maskSizeKey = String(state.cubeSize);
    if (typeof savedState.initialMask === "string") {
        if (!(maskSizeKey in state.maskLibrary)) {
            state.maskLibrary[maskSizeKey] = savedState.initialMask;
        }
        state.initialMask = savedState.initialMask;
    }
    loadMaskForCurrentCubeSize();
    persistModeSetting();
    if (typeof savedState.theme === "string") {
        state.theme = savedState.theme === "light" ? "light" : "dark";
    }
    if (savedState.rotation && typeof savedState.rotation === "object") {
        state.rotation.x = Number(savedState.rotation.x) || state.rotation.x;
        state.rotation.y = Number(savedState.rotation.y) || state.rotation.y;
        state.rotation.z = Number(savedState.rotation.z) || state.rotation.z;
    }
    if (savedState.colors && typeof savedState.colors === "object") {
        state.colors = clone(savedState.colors);
    }
    ensureColorState();
    if (savedState.renderedFaces && typeof savedState.renderedFaces === "object") {
        const merged = createDefaultRenderState();
        FACE_KEYS.forEach((face) => {
            if (face in savedState.renderedFaces) {
                merged[face] = Boolean(savedState.renderedFaces[face]);
            }
        });
        state.renderedFaces = merged;
    }
    if (!state.renderedFaces) {
        state.renderedFaces = createDefaultRenderState();
    }
}

function handleSettingsDownload() {
    const snapshot = buildSettingsSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = SETTINGS_FILE_NAME;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function handleSettingsFileSelected(event) {
    const input = event.target;
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        let applied = false;
        try {
            const content = reader.result;
            if (typeof content !== "string") return;
            const snapshot = JSON.parse(content);
            isRestoringSettings = true;
            applySettingsSnapshot(snapshot);
            applied = true;
        } catch (error) {
            console.error("Failed to load settings file", error);
        } finally {
            isRestoringSettings = false;
            if (applied) {
                refreshSceneFromState();
                saveSettingsToStorage();
            }
            if (input) {
                input.value = "";
            }
        }
    };
    reader.readAsText(file);
}

function refreshSceneFromState() {
    applyTheme();
    syncControls();
    ensureColorState();
    syncInitialMask();
    applyColors();
    applyBackground();
    applyBorderStyle(false);
    updateScale();
    rebuildGeometry();
    renderCube();
}

function handlePointerDown(event) {
    if (!canvas || !state.pannable) return;
    const rect = canvas.getBoundingClientRect();
    const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
    if (!inside) {
        return;
    }
    isDragging = true;
    lastPointer = { x: event.clientX, y: event.clientY };
    if (canvas.setPointerCapture) {
        canvas.setPointerCapture(event.pointerId);
    }
}

function handlePointerUp(event) {
    if (!isDragging) return;
    isDragging = false;
    lastPointer = null;
    if (canvas && canvas.releasePointerCapture) {
        canvas.releasePointerCapture(event.pointerId);
    }
    scheduleSettingsSave();
}

function handlePointerMove(event) {
    if (!isDragging || !lastPointer) return;
    if (!state.pannable) {
        isDragging = false;
        lastPointer = null;
        return;
    }
    const dx = event.clientX - lastPointer.x;
    const dy = event.clientY - lastPointer.y;

    state.rotation.y += dx * ROTATE_SPEED;
    state.rotation.x -= dy * ROTATE_SPEED;
    lastPointer = { x: event.clientX, y: event.clientY };

    renderCube();
}

function handleWheel(event) {
    if (!state.zoomable) return;
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    const nextScale = clamp(
        state.scaleFactor + direction * SCALE_WHEEL_STEP,
        SCALE_RANGE.min,
        SCALE_RANGE.max
    );
    if (nextScale === state.scaleFactor) return;
    state.scaleFactor = nextScale;
    if (sizeScaleInput) sizeScaleInput.value = state.scaleFactor;
    updateScaleLabel();
    updateScale();
    renderCube();
    scheduleSettingsSave();
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function clone(obj) {
    if (typeof structuredClone === "function") {
        return structuredClone(obj);
    }
    return JSON.parse(JSON.stringify(obj));
}

const colorCanvas = document.createElement("canvas");
colorCanvas.width = 1;
colorCanvas.height = 1;
const colorCtx = colorCanvas.getContext("2d");

function normalizeColor(value) {
    if (!value) return "#ffffff";
    try {
        colorCtx.fillStyle = "#000000";
        colorCtx.fillStyle = value;
        return colorCtx.fillStyle;
    } catch (e) {
        return "#ffffff";
    }
}

function resetColorsState() {
    FACE_KEYS.forEach((face) => {
        const defaultColor = DEFAULT_FACE_COLORS[face] ?? "#ffffff";
        state.colors[face] = normalizeColor(defaultColor);
    });
    state.baseColor = normalizeColor(DEFAULT_BODY_COLOR);
    state.showBaseColor = true;
}

function ensureColorState() {
    if (!state.colors || typeof state.colors !== "object") {
        state.colors = {};
    }
    FACE_KEYS.forEach((face) => {
        const fallback = DEFAULT_FACE_COLORS[face] ?? "#ffffff";
        const current = state.colors[face];
        state.colors[face] = normalizeColor(current || fallback);
    });
    state.baseColor = normalizeColor(state.baseColor || DEFAULT_BODY_COLOR);
}

function createDefaultRenderState() {
    const defaults = {};
    FACE_KEYS.forEach((face) => {
        defaults[face] = true;
    });
    return defaults;
}

function getExpectedMaskLength() {
    const stickersPerFace = state.cubeSize * state.cubeSize;
    return FACE_KEYS.length * stickersPerFace;
}

function getDefaultMask() {
    const expected = getExpectedMaskLength();
    return expected > 0 ? ".".repeat(expected) : "";
}

function normalizeInitialMask(value) {
    const expected = getExpectedMaskLength();
    if (!expected) return "";
    if (typeof value !== "string") {
        return getDefaultMask();
    }
    const normalized = value.trim().toLowerCase();
    if (normalized.length !== expected || /[^x.]/.test(normalized)) {
        return getDefaultMask();
    }
    return normalized;
}

function syncInitialMask() {
    ensureMaskLibrary();
    state.initialMask = normalizeInitialMask(state.initialMask);
    if (initialMaskInput) {
        const key = String(state.cubeSize);
        const stored = typeof state.maskLibrary[key] === "string" ? state.maskLibrary[key] : "";
        initialMaskInput.value = stored;
        initialMaskInput.classList.remove("is-invalid");
    }
    updateInitialMaskStatus();
    return state.initialMask;
}

function updateInitialMaskStatus(message, isError = false) {
    if (!initialMaskStatus) return;
    if (typeof message === "string" && message.length) {
        initialMaskStatus.textContent = message;
        initialMaskStatus.classList.toggle("text-danger", Boolean(isError));
        return;
    }
    initialMaskStatus.classList.remove("text-danger");
    const expected = getExpectedMaskLength();
    if (!expected) {
        initialMaskStatus.textContent = "Mask unavailable for current cube size.";
        return;
    }
    const current = normalizeInitialMask(state.initialMask);
    const masked = (current.match(/x/g) || []).length;
    if (masked === 0) {
        initialMaskStatus.textContent = "No stickers masked";
    } else {
        initialMaskStatus.textContent = `${masked}/${expected} stickers masked`;
    }
}

function getRenderedMask() {
    return normalizeInitialMask(state.initialMask);
}

function applyMaskToCubeString(baseString, maskString) {
    if (typeof baseString !== "string") return "";
    if (typeof maskString !== "string" || maskString.length !== baseString.length) {
        return baseString;
    }
    const result = [];
    for (let i = 0; i < baseString.length; i++) {
        result.push(maskString[i] === "x" || maskString[i] === "X" ? "x" : baseString[i]);
    }
    return result.join("");
}

function resetInitialMask() {
    ensureMaskLibrary();
    const key = String(state.cubeSize);
    state.maskLibrary[key] = "";
    state.initialMask = getDefaultMask();
    syncInitialMask();
}

function applyInitialMaskFromInput(rawValue) {
    const expected = getExpectedMaskLength();
    if (!expected) {
        updateInitialMaskStatus("Mask unavailable for current cube size.");
        return;
    }
    const sanitized = (rawValue || "").toLowerCase().replace(/\s+/g, "");
    if (initialMaskInput) {
        initialMaskInput.value = sanitized;
    }
    state.cubeStringInput = sanitized;
    if (!sanitized.length) {
        ensureMaskLibrary();
        state.maskLibrary[String(state.cubeSize)] = "";
        state.initialMask = getDefaultMask();
        syncInitialMask();
        renderCube();
        scheduleSettingsSave();
        return;
    }
    if (sanitized.length !== expected || /[^x.]/.test(sanitized)) {
        if (initialMaskInput) {
            initialMaskInput.classList.add("is-invalid");
        }
        updateInitialMaskStatus(`Mask must be ${expected} characters using "." or "x".`, true);
        return;
    }
    ensureMaskLibrary();
    if (initialMaskInput) {
        initialMaskInput.classList.remove("is-invalid");
    }
    state.maskLibrary[String(state.cubeSize)] = sanitized;
    state.initialMask = sanitized;
    syncInitialMask();
    renderCube();
    scheduleSettingsSave();
}

function normalizeCubeStringValue(value) {
    if (!value) return "";
    return value
        .replace(/\s+/g, "")
        .split("")
        .map((char) => {
            if (char === ".") return ".";
            if (char === "x" || char === "X") return "x";
            return char;
        })
        .join("");
}

function handleCubeStringInputChange(rawValue) {
    state.cubeStringInput = rawValue || "";
    if (state.mode === "cubeString") {
        updateCubeFromSequences();
        renderCube();
    }
    scheduleSettingsSave();
}

function applyCubeStringState() {
    if (!vc) return;
    const expected = getExpectedMaskLength();
    if (!expected) {
        updateCubeStringStatus("Cube string unavailable for current cube size.", true);
        return;
    }
    const raw = cubeStringInput ? cubeStringInput.value : (state.cubeStringInput || "");
    const sanitized = normalizeCubeStringValue(raw || "");
    state.cubeStringInput = raw || "";
    if (cubeStringInput && cubeStringInput.value !== raw) {
        cubeStringInput.value = raw;
    }
    if (!sanitized.length) {
        updateCubeStringStatus(`${sanitized.length}/${expected} characters`, true);
        renderCustomColorInputs([]);
        ensureCustomColorState();
        state.customStickerColors = {};
        if (cubeStringInput) cubeStringInput.classList.add("is-invalid");
        vc.cubeString = nxCube ? nxCube.toCubeString(getRenderedMask()) : "";
        return;
    }
    const maskChar = (typeof VisualCube !== "undefined" && VisualCube.MASK_CHAR) ? VisualCube.MASK_CHAR : "x";
    const normalizedCubeString = sanitized.replace(/\./g, maskChar);
    const extras = getExtraCubeStringChars(normalizedCubeString);
    syncCustomStickerColors(extras);
    renderCustomColorInputs(extras);
    if (sanitized.length !== expected) {
        updateCubeStringStatus(`${sanitized.length}/${expected} characters`, true);
        if (cubeStringInput) cubeStringInput.classList.add("is-invalid");
        vc.cubeString = nxCube ? nxCube.toCubeString(getRenderedMask()) : "";
        return;
    }
    if (cubeStringInput) {
        cubeStringInput.classList.remove("is-invalid");
    }
    applyColors();
    vc.cubeString = normalizedCubeString;
    updateCubeStringStatus(`${sanitized.length}/${expected} characters`);
}

function updateCubeStringStatus(message, isError = false) {
    if (!cubeStringStatus) return;
    cubeStringStatus.textContent = message;
    cubeStringStatus.classList.toggle("text-danger", Boolean(isError));
}

function getExtraCubeStringChars(value) {
    const extras = [];
    if (!value) return extras;
    const allowed = new Set(["U", "R", "F", "D", "L", "B", "x", ".", "X"]);
    value.split("").forEach((char) => {
        if (!allowed.has(char) && !extras.includes(char)) {
            extras.push(char);
        }
    });
    return extras;
}

function ensureCustomColorState() {
    if (!state.customStickerColors || typeof state.customStickerColors !== "object") {
        state.customStickerColors = {};
    }
}

function syncCustomStickerColors(chars) {
    ensureCustomColorState();
    const active = new Set(chars);
    chars.forEach((char) => {
        if (!state.customStickerColors[char]) {
            state.customStickerColors[char] = "#ffffff";
        }
    });
    Object.keys(state.customStickerColors).forEach((char) => {
        if (!active.has(char)) {
            delete state.customStickerColors[char];
        }
    });
}

function generateDefaultColorForChar(char) {
    const palette = ["#ff9f43", "#ffd93d", "#9b59b6", "#20c997", "#54a0ff", "#f368e0", "#48dbfb"];
    const index = char ? char.charCodeAt(0) % palette.length : 0;
    return palette[index];
}

function renderCustomColorInputs(chars) {
    if (!cubeStringColorSection || !cubeStringColors) return;
    cubeStringColors.innerHTML = "";
    if (!chars || chars.length === 0) {
        cubeStringColorSection.hidden = true;
        ensureCustomColorState();
        state.customStickerColors = {};
        return;
    }
    cubeStringColorSection.hidden = false;
    ensureCustomColorState();
    chars.forEach((char) => {
        const label = document.createElement("label");
        label.className = "face-color-pill";
        const span = document.createElement("span");
        span.textContent = char;
        const input = document.createElement("input");
        input.type = "color";
        input.value = normalizeColor(state.customStickerColors[char] || generateDefaultColorForChar(char));
        input.className = "form-control form-control-color";
        input.addEventListener("input", (event) => handleCustomStickerColorChange(char, event.target.value));
        label.appendChild(span);
        label.appendChild(input);
        cubeStringColors.appendChild(label);
    });
}

function handleCustomStickerColorChange(char, value) {
    ensureCustomColorState();
    state.customStickerColors[char] = normalizeColor(value || "#ffffff");
    applyColors();
    renderCube();
    scheduleSettingsSave();
}

function ensureMaskLibrary() {
    if (!state.maskLibrary || typeof state.maskLibrary !== "object") {
        state.maskLibrary = {};
    }
}

function loadMaskForCurrentCubeSize() {
    ensureMaskLibrary();
    const key = String(state.cubeSize);
    const expected = getExpectedMaskLength();
    let raw = typeof state.maskLibrary[key] === "string" ? state.maskLibrary[key] : "";
    if (expected && raw.length) {
        if (raw.length !== expected || /[^x.]/.test(raw)) {
            raw = "";
        }
    }
    state.maskLibrary[key] = raw;
    state.initialMask = raw && raw.length ? raw : getDefaultMask();
    syncInitialMask();
    if (state.mode === "cubeString") {
        const currentLength = (state.cubeStringInput || "").length;
        updateCubeStringStatus(`${currentLength}/${expected} characters`, currentLength !== expected);
    }
}

function persistModeSetting() {
    if (typeof localStorage === "undefined") return;
    try {
        localStorage.setItem(`${SETTINGS_STORAGE_KEY}_mode`, state.mode);
    } catch (error) {
        // ignore persistence errors
    }
}

function restoreModePreference() {
    if (typeof localStorage === "undefined") return;
    try {
        const saved = localStorage.getItem(`${SETTINGS_STORAGE_KEY}_mode`);
        if (saved === "cubeString" || saved === "setupMoves") {
            state.mode = saved;
        }
    } catch (error) {
        // ignore restore errors
    }
}
