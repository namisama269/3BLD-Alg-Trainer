// Last edited: 2025-11-16

class VisualCube {
    constructor(width, height, scale, thetaX, thetaY, thetaZ, cubeSize, gapSize, edgeGapRatio = VisualCube.EDGE_GAP_RATIO_DEFAULT) {
        this.width = width;
        this.height = height;
        this.scale = scale;
        this.thetaX = thetaX;
        this.thetaY = thetaY;
        this.thetaZ = thetaZ;

        this.cubeSize = cubeSize;
        this.gapSize = gapSize;
        this.edgeGapRatio = VisualCube.clampEdgeRatio(edgeGapRatio ?? VisualCube.EDGE_GAP_RATIO_DEFAULT);

        this.cubeString = VisualCube.getDefaultCubeString(cubeSize);

        this.drawInside = false;

        this.shift = (Math.PI / 2) / 15;
        this.showBaseColor = true;
        this.baseColor = VisualCube.DEFAULT_BASE_COLOR;
        this.stickerBorderColor = VisualCube.BLACK;
        this.stickerBorderShade = 0.85;
        this.stickerBorderWidth = 2.5; // Configurable border width
        this.debugMode = false;
        this.customStickerColors = {};
        this.debugTextColor = "dark";
        this.renderCounter = 1;
        this.renderedFaces = {};
        VisualCube.FACE_IDS.forEach((face) => {
            this.renderedFaces[face] = true;
        });

        this.faceStickers = VisualCube.getFaceStickers(cubeSize, gapSize, this.edgeGapRatio ?? VisualCube.EDGE_GAP_RATIO_DEFAULT);
        this.points = [
            [-1, -1, 1],
            [1, -1, 1],
            [1,  1, 1],
            [-1, 1, 1],
            [-1, -1, -1],
            [1, -1, -1],
            [1, 1, -1],
            [-1, 1, -1]
        ];
        this.stickerColors = {
            "U": VisualCube.WHITE,
            "D": VisualCube.YELLOW,
            "R": VisualCube.RED,
            "L": VisualCube.ORANGE,
            "F": VisualCube.GREEN,
            "B": VisualCube.BLUE,
            "z": VisualCube.BLACK,
            [VisualCube.MASK_CHAR]: VisualCube.MASK_DARK_COLOR,
            [VisualCube.BASE_COLOR_KEY]: VisualCube.DEFAULT_BASE_COLOR,
        }
        this.faceBase = {
            "U": [this.points[4], this.points[5], this.points[1], this.points[0]],
            "D": [this.points[7], this.points[6], this.points[2], this.points[3]],
            "R": [this.points[1], this.points[5], this.points[6], this.points[2]],
            "L": [this.points[4], this.points[0], this.points[3], this.points[7]],
            "F": [this.points[0], this.points[1], this.points[2], this.points[3]],
            "B": [this.points[4], this.points[5], this.points[6], this.points[7]]
        }

    }


    
    
    drawStickers(ctx, colors, border, stickers, annotate = false) {
        const borderArray = Array.isArray(border) ? border : null;
        const fallbackBorder = borderArray ? null : border;
        for (let i = 0; i < stickers.length; ++i) {
            let sticker4Points = [];
            let s = stickers[i];
            s.forEach((pt) => {
                let rotated2d = [[pt[0]], [pt[1]], [pt[2]]];
    
                rotated2d = VisualCube.matrixProd(VisualCube.getRotationMatrix(this.thetaZ, "z"), rotated2d);
                rotated2d = VisualCube.matrixProd(VisualCube.getRotationMatrix(this.thetaY, "y"), rotated2d);
                rotated2d = VisualCube.matrixProd(VisualCube.getRotationMatrix(this.thetaX, "x"), rotated2d);
    
                let projected2d = VisualCube.matrixProd(VisualCube.PROJECTION, rotated2d);
    
                let x = Math.round(projected2d[0][0] * this.scale + this.width/2);
                let y = Math.round(projected2d[1][0] * this.scale + this.height/2);
    
                sticker4Points.push([x, y]);
            });
            
            const colorKey = colors[i];
            ctx.fillStyle = this._resolveStickerColor(colorKey);
            ctx.beginPath();
            ctx.moveTo(sticker4Points[0][0], sticker4Points[0][1]);

            for (let j = 1; j < sticker4Points.length; ++j) {
                ctx.lineTo(sticker4Points[j][0], sticker4Points[j][1]);
            }

            ctx.closePath();
            ctx.fill();

            const stickerBorder = borderArray ? (borderArray[i] ?? fallbackBorder) : border;
            ctx.strokeStyle = stickerBorder || VisualCube.BLACK;
            ctx.lineWidth = this.stickerBorderWidth || 2.5;
            ctx.lineJoin = 'round'; // Smooth corners
            ctx.lineCap = 'round'; // Smooth line ends
            ctx.beginPath();
            ctx.moveTo(sticker4Points[0][0], sticker4Points[0][1]);

            for (let j = 1; j < sticker4Points.length; ++j) {
                ctx.lineTo(sticker4Points[j][0], sticker4Points[j][1]);
            }

            ctx.closePath();
            ctx.stroke();

            if (annotate && this.debugMode) {
                const center = sticker4Points.reduce(
                    (acc, point) => {
                        acc.x += point[0];
                        acc.y += point[1];
                        return acc;
                    },
                    { x: 0, y: 0 }
                );
                center.x /= sticker4Points.length;
                center.y /= sticker4Points.length;

                const label = String(this.renderCounter++);
                ctx.save();
                ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                const useLight = this.debugTextColor === "light";
                ctx.lineWidth = 3;
                ctx.strokeStyle = useLight ? "rgba(0, 0, 0, 0.65)" : "rgba(255, 255, 255, 0.75)";
                ctx.strokeText(label, center.x, center.y);
                ctx.fillStyle = useLight ? "#f2f2f2" : "#111111";
                ctx.fillText(label, center.x, center.y);
                ctx.restore();
            }
        }
    }

    drawCube(ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high'; // High quality anti-aliasing

        // clear canvas first
        ctx.fillStyle = "white";
        ctx.clearRect(0, 0, this.width, this.height);
    
        // compute distance to camera to get face rendering order
        let newPoints = [];
        this.points.forEach((pt) => {
            let rotated2d = [[pt[0]], [pt[1]], [pt[2]]];
            rotated2d = VisualCube.matrixProd(VisualCube.getRotationMatrix(this.thetaZ, "z"), rotated2d);
            rotated2d = VisualCube.matrixProd(VisualCube.getRotationMatrix(this.thetaY, "y"), rotated2d);
            rotated2d = VisualCube.matrixProd(VisualCube.getRotationMatrix(this.thetaX, "x"), rotated2d);
    
            let np = [rotated2d[0], rotated2d[1], rotated2d[2]]
            
            newPoints.push(np);
        });
    
    
        let newFaceBase = {
            "U": [newPoints[4], newPoints[5], newPoints[1], newPoints[0]],
            "D": [newPoints[7], newPoints[6], newPoints[2], newPoints[3]],
            "R": [newPoints[1], newPoints[5], newPoints[6], newPoints[2]],
            "L": [newPoints[4], newPoints[0], newPoints[3], newPoints[7]],
            "F": [newPoints[0], newPoints[1], newPoints[2], newPoints[3]],
            "B": [newPoints[4], newPoints[5], newPoints[6], newPoints[7]]
        };
    
        let dists = [];
        for (const [k, v] of Object.entries(newFaceBase)) {
            let dtc = VisualCube.distToCam(v, this.width);
            dists.push([dtc, k]);
        }
        dists.sort();
        dists.reverse();
        
        let cubeData = VisualCube.convertCubeString(this.cubeString);
    
        this.renderCounter = 1;

        const borderColor = this._getBorderColor();

        for (let i = 0; i < dists.length; ++i) {
            let face = dists[i][1];
            if (this.renderedFaces && this.renderedFaces[face] === false) {
                continue;
            }
            if (this.drawInside) {
                this.drawStickers(ctx, "z", VisualCube.BLACK, [this.faceBase[face]]);
            }
            if (this.showBaseColor) {
                this.stickerColors[VisualCube.BASE_COLOR_KEY] = this.baseColor;
                const baseBorder = this.baseColor || borderColor;
                const prevJoin = ctx.lineJoin;
                const prevCap = ctx.lineCap;
                ctx.lineJoin = "round";
                ctx.lineCap = "round";
                this.drawStickers(ctx, VisualCube.BASE_COLOR_KEY, baseBorder, [this.faceBase[face]], false);
                ctx.lineJoin = prevJoin;
                ctx.lineCap = prevCap;
            }
            let faceColors = Array.from(cubeData[face]);
            let faceBorders = null;
            const hasMask = /x/i.test(cubeData[face]);
            if (hasMask) {
                faceBorders = new Array(faceColors.length).fill(borderColor);
                for (let i = 0; i < faceColors.length; i++) {
                    const masked = faceColors[i] === VisualCube.MASK_CHAR || faceColors[i] === VisualCube.MASK_CHAR.toUpperCase();
                    if (!masked) continue;
                    if (this.showBaseColor) {
                        faceColors[i] = VisualCube.BASE_COLOR_KEY;
                        faceBorders[i] = borderColor;
                    } else {
                        faceColors[i] = VisualCube.MASK_CHAR;
                        faceBorders[i] = borderColor;
                    }
                }
            }
            const bordersToUse = hasMask ? faceBorders : borderColor;
            this.drawStickers(ctx, faceColors, bordersToUse, this.faceStickers[face], true);
        }
    }

    _getBorderColor() {
        if (this.stickerBorderColor) {
            return this.stickerBorderColor;
        }
        if (!this.showBaseColor) {
            return VisualCube.BLACK;
        }
        if (!this.baseColor) {
            return VisualCube.BLACK;
        }
        return VisualCube.shadeColor(this.baseColor, this.stickerBorderShade ?? 0.8);
    }

    _resolveStickerColor(key) {
        if (key && this.stickerColors && this.stickerColors[key]) {
            return this.stickerColors[key];
        }
        if (key && this.customStickerColors && this.customStickerColors[key]) {
            return this.customStickerColors[key];
        }
        return VisualCube.DEFAULT_STICKER_COLOR;
    }

    setCustomColors(map = {}) {
        this.customStickerColors = {};
        if (!map || typeof map !== "object") {
            return;
        }
        Object.entries(map).forEach(([key, value]) => {
            if (typeof key !== "string" || !value) return;
            try {
                this.customStickerColors[key] = value;
            } catch (e) {
                // ignore
            }
        });
    }

    static clampScalar(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static shadeColor(hex, factor) {
        if (!hex || typeof hex !== "string") {
            return "#000000";
        }
        let normalized = hex.trim();
        if (normalized.startsWith("#")) {
            normalized = normalized.slice(1);
        }
        if (![3, 6].includes(normalized.length)) {
            return "#000000";
        }
        const expand = normalized.length === 3;
        const r = parseInt(expand ? normalized[0] + normalized[0] : normalized.slice(0, 2), 16);
        const g = parseInt(expand ? normalized[1] + normalized[1] : normalized.slice(2, 4), 16);
        const b = parseInt(expand ? normalized[2] + normalized[2] : normalized.slice(4, 6), 16);

        const adjust = (component) => {
            const value = VisualCube.clampScalar(Math.round(component * (factor ?? 0.8)), 0, 255);
            return value.toString(16).padStart(2, "0");
        };

        return `#${adjust(r)}${adjust(g)}${adjust(b)}`;
    }

    static convertCubeString(cubeString) {
        if (!cubeString) {
            return { U: "", D: "", R: "", L: "", F: "", B: "" };
        }

        const faceCount = 6;
        const stickersPerFace = cubeString.length / faceCount;
        const n = Math.sqrt(stickersPerFace);
        if (!Number.isInteger(n)) {
            throw new Error("Invalid cube string length for a square face.");
        }

        const matrices = {};
        VisualCube.FACE_ORDER.forEach((face, idx) => {
            const start = idx * stickersPerFace;
            matrices[face] = [];
            for (let r = 0; r < n; r++) {
                const row = [];
                for (let c = 0; c < n; c++) {
                    const index = start + r * n + c;
                    row.push(cubeString[index]);
                }
                matrices[face].push(row);
            }
        });

        const transform = {
            U: VisualCube.copyMatrix,
            F: VisualCube.copyMatrix,
            R: VisualCube.rotateCCW,
            L: VisualCube.transpose,
            D: VisualCube.flipVertical,
            B: VisualCube.flipHorizontal,
        };

        const result = {};
        VisualCube.FACE_ORDER.forEach((face) => {
            const matrix = matrices[face];
            const oriented = transform[face](matrix);
            result[face] = oriented.flat().join("");
        });

        return result;
    }

    static rotateCCW(matrix) {
        const n = matrix.length;
        const out = Array.from({ length: n }, () => Array(n).fill(""));
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                out[n - 1 - c][r] = matrix[r][c];
            }
        }
        return out;
    }

    static transpose(matrix) {
        const n = matrix.length;
        const out = Array.from({ length: n }, () => Array(n).fill(""));
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                out[c][r] = matrix[r][c];
            }
        }
        return out;
    }

    static flipVertical(matrix) {
        return matrix.slice().reverse();
    }

    static flipHorizontal(matrix) {
        return matrix.map((row) => row.slice().reverse());
    }

    static copyMatrix(matrix) {
        return matrix.map((row) => row.slice());
    }

    static clampEdgeRatio(value) {
        if (typeof value !== "number" || Number.isNaN(value)) {
            return VisualCube.EDGE_GAP_RATIO_DEFAULT;
        }
        return Math.min(1, Math.max(0, value));
    }

    static getStickerMetrics(cubeSize, gapSize, edgeGapRatio = VisualCube.EDGE_GAP_RATIO_DEFAULT) {
        const ratio = VisualCube.clampEdgeRatio(edgeGapRatio);
        const borderGap = gapSize * ratio;
        const internalGaps = Math.max(0, cubeSize - 1) * gapSize;
        const totalGap = internalGaps + 2 * borderGap;
        const stickerSize = (2 - totalGap) / cubeSize;
        return { stickerSize, borderGap };
    }

    static getXYStickers(cubeSize, gapSize, topLeftX, topLeftY, topLeftZ, edgeGapRatio = VisualCube.EDGE_GAP_RATIO_DEFAULT) {
        const stickers = [];
        const { stickerSize, borderGap } = VisualCube.getStickerMetrics(cubeSize, gapSize, edgeGapRatio);

        for (let v = 0; v < cubeSize; ++v) {
            for (let h = 0; h < cubeSize; ++h) {
                const px = topLeftX + borderGap + h * (gapSize + stickerSize);
                const py = topLeftY + borderGap + v * (gapSize + stickerSize);
                const pz = topLeftZ;

                stickers.push([
                    [px, py, pz],
                    [px + stickerSize, py, pz],
                    [px + stickerSize, py + stickerSize, pz],
                    [px, py + stickerSize, pz],
                ]);
            }
        }

        return stickers;
    }

    static getXZStickers(cubeSize, gapSize, topLeftX, topLeftY, topLeftZ, edgeGapRatio = VisualCube.EDGE_GAP_RATIO_DEFAULT) {
        const stickers = [];
        const { stickerSize, borderGap } = VisualCube.getStickerMetrics(cubeSize, gapSize, edgeGapRatio);

        for (let v = 0; v < cubeSize; ++v) {
            for (let h = 0; h < cubeSize; ++h) {
                const px = topLeftX + borderGap + h * (gapSize + stickerSize);
                const py = topLeftY;
                const pz = topLeftZ + borderGap + v * (gapSize + stickerSize);

                stickers.push([
                    [px, py, pz],
                    [px + stickerSize, py, pz],
                    [px + stickerSize, py, pz + stickerSize],
                    [px, py, pz + stickerSize],
                ]);
            }
        }

        return stickers;
    }

    static getYZStickers(cubeSize, gapSize, topLeftX, topLeftY, topLeftZ, edgeGapRatio = VisualCube.EDGE_GAP_RATIO_DEFAULT) {
        const stickers = [];
        const { stickerSize, borderGap } = VisualCube.getStickerMetrics(cubeSize, gapSize, edgeGapRatio);

        for (let v = 0; v < cubeSize; ++v) {
            for (let h = 0; h < cubeSize; ++h) {
                const px = topLeftX;
                const py = topLeftY + borderGap + h * (gapSize + stickerSize);
                const pz = topLeftZ + borderGap + v * (gapSize + stickerSize);

                stickers.push([
                    [px, py, pz],
                    [px, py, pz + stickerSize],
                    [px, py + stickerSize, pz + stickerSize],
                    [px, py + stickerSize, pz],
                ]);
            }
        }

        return stickers;
    }

    static getFaceStickers(cubeSize, gapSize, edgeGapRatio = VisualCube.EDGE_GAP_RATIO_DEFAULT) {
        return {
            U: VisualCube.getXZStickers(cubeSize, gapSize, -1, -1, -1, edgeGapRatio),
            D: VisualCube.getXZStickers(cubeSize, gapSize, -1, 1, -1, edgeGapRatio),
            R: VisualCube.getYZStickers(cubeSize, gapSize, 1, -1, -1, edgeGapRatio),
            L: VisualCube.getYZStickers(cubeSize, gapSize, -1, -1, -1, edgeGapRatio),
            F: VisualCube.getXYStickers(cubeSize, gapSize, -1, -1, 1, edgeGapRatio),
            B: VisualCube.getXYStickers(cubeSize, gapSize, -1, -1, -1, edgeGapRatio),
        };
    }

    static matrixProd(A, B) {
        const result = new Array(A.length).fill(0).map(() => new Array(B[0].length).fill(0));
        return result.map((row, i) =>
            row.map((_, j) => A[i].reduce((sum, elm, k) => sum + elm * B[k][j], 0))
        );
    }

    static getRotationMatrix(theta, axis) {
        if (axis === "z") {
            return [
                [Math.cos(theta), -Math.sin(theta), 0],
                [Math.sin(theta), Math.cos(theta), 0],
                [0, 0, 1],
            ];
        }
        if (axis === "y") {
            return [
                [Math.cos(theta), 0, Math.sin(theta)],
                [0, 1, 0],
                [-Math.sin(theta), 0, Math.cos(theta)],
            ];
        }
        if (axis === "x") {
            return [
                [1, 0, 0],
                [0, Math.cos(theta), -Math.sin(theta)],
                [0, Math.sin(theta), Math.cos(theta)],
            ];
        }
        return [];
    }

    static distToCam(points, width) {
        const camera = [0, 0, width];
        const faceCenter = [];
        for (let i = 0; i < 3; ++i) {
            let total = 0;
            for (let j = 0; j < 4; ++j) {
                total += points[j][i][0];
            }
            faceCenter.push(total / 4);
        }
        const dx = camera[0] - faceCenter[0];
        const dy = camera[1] - faceCenter[1];
        const dz = camera[2] - faceCenter[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    toJSON() {
        const copyMap = (src = {}) => {
            const out = {};
            Object.keys(src).forEach((key) => {
                out[key] = src[key];
            });
            return out;
        };
        return {
            width: this.width,
            height: this.height,
            scale: this.scale,
            thetaX: this.thetaX,
            thetaY: this.thetaY,
            thetaZ: this.thetaZ,
            cubeSize: this.cubeSize,
            gapSize: this.gapSize,
            edgeGapRatio: this.edgeGapRatio,
            cubeString: this.cubeString,
            drawInside: this.drawInside,
            showBaseColor: this.showBaseColor,
            baseColor: this.baseColor,
            stickerBorderColor: this.stickerBorderColor,
            stickerBorderShade: this.stickerBorderShade,
            debugMode: this.debugMode,
            renderedFaces: copyMap(this.renderedFaces),
            stickerColors: copyMap(this.stickerColors),
        };
    }

    static fromJSON(serialized = {}, options = {}) {
        const snapshot = serialized && typeof serialized === "object" ? serialized : {};
        const state = snapshot.state && typeof snapshot.state === "object" ? snapshot.state : snapshot;
        const resolveNumber = (value, fallback) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : fallback;
        };
        const width = resolveNumber(options.width ?? state.canvasWidth, VisualCube.DEFAULT_WIDTH);
        const height = resolveNumber(options.height ?? state.canvasHeight, VisualCube.DEFAULT_HEIGHT);
        const baseScale = resolveNumber(options.baseScale, VisualCube.DEFAULT_SCALE);
        const scaleFactor = resolveNumber(state.scaleFactor, 1);
        const scale = resolveNumber(options.scale, baseScale * scaleFactor);
        const rotation = state.rotation || {};
        const thetaX = resolveNumber(options.thetaX ?? rotation.x, 0);
        const thetaY = resolveNumber(options.thetaY ?? rotation.y, 0);
        const thetaZ = resolveNumber(options.thetaZ ?? rotation.z, 0);
        const cubeSize = resolveNumber(state.cubeSize, 3);
        const gapSize = resolveNumber(state.stickerGap, 0.08);
        const edgeGapRatio = resolveNumber(state.borderRatio, VisualCube.EDGE_GAP_RATIO_DEFAULT);

        const cube = new VisualCube(
            width,
            height,
            scale,
            thetaX,
            thetaY,
            thetaZ,
            cubeSize,
            gapSize,
            edgeGapRatio
        );

        if (typeof state.cubeString === "string" && state.cubeString.length) {
            cube.cubeString = state.cubeString;
        }
        if (typeof state.showBaseColor === "boolean") {
            cube.showBaseColor = state.showBaseColor;
        }
        if (typeof state.baseColor === "string" && state.baseColor) {
            cube.baseColor = state.baseColor;
        }
        cube.stickerColors[VisualCube.BASE_COLOR_KEY] = cube.baseColor;
        if (typeof state.debugMode === "boolean") {
            cube.debugMode = state.debugMode;
        }
        if (typeof state.borderShade === "number") {
            cube.stickerBorderShade = state.borderShade;
        }
        if (state.autoBorderColor) {
            cube.stickerBorderColor = null;
        } else if (typeof state.borderColor === "string" && state.borderColor) {
            cube.stickerBorderColor = state.borderColor;
        }
        if (state.colors && typeof state.colors === "object") {
            VisualCube.FACE_IDS.forEach((face) => {
                if (typeof state.colors[face] === "string" && state.colors[face]) {
                    cube.stickerColors[face] = state.colors[face];
                }
            });
        }
        if (state.renderedFaces && typeof state.renderedFaces === "object") {
            const merged = {};
            VisualCube.FACE_IDS.forEach((face) => {
                merged[face] = face in state.renderedFaces ? Boolean(state.renderedFaces[face]) : true;
            });
            cube.renderedFaces = merged;
        }

        cube.edgeGapRatio = VisualCube.clampEdgeRatio(edgeGapRatio ?? cube.edgeGapRatio);
        cube.faceStickers = VisualCube.getFaceStickers(cube.cubeSize, cube.gapSize, cube.edgeGapRatio);
        return cube;
    }
}

VisualCube.BLACK = "black";
VisualCube.WHITE = "white";
VisualCube.YELLOW = "#F0FF00";
VisualCube.RED = "#E8120A";
VisualCube.ORANGE = "#FB8C00";
VisualCube.GREEN = "#66FF33";
VisualCube.BLUE = "#2055FF";
VisualCube.MASK_CHAR = "x";
VisualCube.MASK_DARK_COLOR = "#b0b0b0";
VisualCube.DEFAULT_STICKER_COLOR = "#808080";
VisualCube.DEFAULT_BASE_COLOR = "#f5f5dc";
VisualCube.BASE_COLOR_KEY = "_";
VisualCube.EDGE_GAP_RATIO_DEFAULT = 0.5;
VisualCube.FACE_IDS = Object.freeze(["U", "D", "R", "L", "F", "B"]);
VisualCube.FACE_ORDER = Object.freeze(["U", "R", "F", "D", "L", "B"]);
VisualCube.PROJECTION = [
    [1, 0, 0],
    [0, 1, 0],
];
VisualCube.DEFAULT_WIDTH = 1200;
VisualCube.DEFAULT_HEIGHT = 1200;
VisualCube.DEFAULT_SCALE = 360;
VisualCube.getDefaultCubeString = function(cubeSize) {
    const size = Number.isFinite(cubeSize) && cubeSize > 0 ? cubeSize : 3;
    const stickersPerFace = size * size;
    return VisualCube.FACE_ORDER.map((face) => face.repeat(stickersPerFace)).join("");
};

// Ensure global availability
window.VisualCube = VisualCube;
