// CubeState.js - RubiksCube class for cube state management and move execution
// Extracted from RubiksCube.legacy.js

(function() {
    'use strict';

    const SOLVED_STATE = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

    function RubiksCube() {
        this.cubestate = [
            [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8],
            [2, 9], [2, 10], [2, 11], [2, 12], [2, 13], [2, 14], [2, 15], [2, 16], [2, 17],
            [3, 18], [3, 19], [3, 20], [3, 21], [3, 22], [3, 23], [3, 24], [3, 25], [3, 26],
            [4, 27], [4, 28], [4, 29], [4, 30], [4, 31], [4, 32], [4, 33], [4, 34], [4, 35],
            [5, 36], [5, 37], [5, 38], [5, 39], [5, 40], [5, 41], [5, 42], [5, 43], [5, 44],
            [6, 45], [6, 46], [6, 47], [6, 48], [6, 49], [6, 50], [6, 51], [6, 52], [6, 53]
        ];

        this.resetCube = function() {
            this.cubestate = [
                [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8],
                [2, 9], [2, 10], [2, 11], [2, 12], [2, 13], [2, 14], [2, 15], [2, 16], [2, 17],
                [3, 18], [3, 19], [3, 20], [3, 21], [3, 22], [3, 23], [3, 24], [3, 25], [3, 26],
                [4, 27], [4, 28], [4, 29], [4, 30], [4, 31], [4, 32], [4, 33], [4, 34], [4, 35],
                [5, 36], [5, 37], [5, 38], [5, 39], [5, 40], [5, 41], [5, 42], [5, 43], [5, 44],
                [6, 45], [6, 46], [6, 47], [6, 48], [6, 49], [6, 50], [6, 51], [6, 52], [6, 53]
            ];
        };

        this.resetCubestate = function() {
            var face = 1;
            for (var i = 0; i < 6; ++i) {
                for (var j = 0; j < 9; ++j) {
                    this.cubestate[9*i + j][0] = face;
                }
                ++face;
            }
        };

        this.resetMask = function() {
            var face = 1;
            for (var i = 0; i < 6; ++i) {
                for (var j = 0; j < 9; ++j) {
                    this.cubestate[9*i + j][1] = 9*i + j;
                }
                ++face;
            }
        };

        this.getMaskValues = function() {
            return this.cubestate.map(facelet => facelet[1]);
        };

        // Pivot baseline: separate tracking for pivot detection (independent of mask)
        // Records which sticker is at each position after scramble
        this.pivotBaseline = null;

        this.savePivotBaseline = function() {
            // Save the color at each position as the baseline
            // We track colors because pivot detection checks if a specific sticker moved
            this.pivotBaseline = this.cubestate.map(facelet => facelet[0]);
        };

        this.getPivotBaseline = function() {
            return this.pivotBaseline;
        };

        this.isPivotInPlace = function(pivotIndex) {
            if (!this.pivotBaseline) return true;
            // Pivot is in place if the color at pivotIndex matches the baseline
            return this.cubestate[pivotIndex][0] === this.pivotBaseline[pivotIndex];
        };

        this.solution = function() {
            var gcube = Cube.fromString(this.toString());
            return gcube.solve();
        };

        this.isSolved = function(initialMask) {
            initialMask = initialMask || "";
            for (var i = 0; i < 6; i++) {
                let uniqueColorsOnFace = new Set();

                for (var j = 0; j < 9; j++) {
                    if (initialMask.length == 54 && initialMask[this.cubestate[9*i + j][1]] == 'x') {
                        continue;
                    }
                    uniqueColorsOnFace.add(this.cubestate[9*i + j][0]);
                }

                if (uniqueColorsOnFace.size > 1) {
                    return false;
                }
            }
            return true;
        };

        this.wcaOrient = function() {
            // u-r--f--d--l--b
            // 4 13 22 31 40 49
            var moves = "";

            if (this.cubestate[13][0] == 1) { // R face
                this.doAlgorithm("z'");
                moves += "z'";
            } else if (this.cubestate[22][0] == 1) { // F face
                this.doAlgorithm("x");
                moves += "x";
            } else if (this.cubestate[31][0] == 1) { // D face
                this.doAlgorithm("x2");
                moves += "x2";
            } else if (this.cubestate[40][0] == 1) { // L face
                this.doAlgorithm("z");
                moves += "z";
            } else if (this.cubestate[49][0] == 1) { // B face
                this.doAlgorithm("x'");
                moves += "x'";
            }

            if (this.cubestate[13][0] == 3) { // R face
                this.doAlgorithm("y");
                moves += " y";
            } else if (this.cubestate[40][0] == 3) { // L face
                this.doAlgorithm("y'");
                moves += " y'";
            } else if (this.cubestate[49][0] == 3) { // B face
                this.doAlgorithm("y2");
                moves += " y2";
            }

            return moves;
        };

        this.toString = function() {
            var str = "";
            var sides = ["U", "R", "F", "D", "L", "B"];
            for (var i = 0; i < this.cubestate.length; i++) {
                str += sides[this.cubestate[i][0] - 1];
            }
            return str;
        };

        this.toInitialMaskedString = function(initialMask) {
            var str = "";
            var sides = ["U", "R", "F", "D", "L", "B"];
            for (var i = 0; i < this.cubestate.length; i++) {
                if (initialMask[this.cubestate[i][1]] == 'x') {
                    str += 'x';
                } else {
                    str += sides[this.cubestate[i][0] - 1];
                }
            }
            return str;
        };

        this.test = function(alg) {
            this.doAlgorithm(alg);
            if (window.updateVirtualCube) {
                window.updateVirtualCube();
            }
        };

        this.doAlgorithm = function(alg) {
            if (!alg || alg == "") return;

            var moveArr = alg.split(/(?=[A-Za-z])/);

            for (var i = 0; i < moveArr.length; i++) {
                var move = moveArr[i];
                var myRegexp = /([RUFBLDrufbldxyzEMS])(\d*)('?)/g;
                var match = myRegexp.exec(move.trim());

                if (match != null) {
                    var side = match[1];
                    var times = 1;

                    if (match[2] !== "") {
                        times = match[2] % 4;
                    }

                    if (match[3] == "'") {
                        times = (4 - times) % 4;
                    }

                    switch (side) {
                        case "R": this.doR(times); break;
                        case "U": this.doU(times); break;
                        case "F": this.doF(times); break;
                        case "B": this.doB(times); break;
                        case "L": this.doL(times); break;
                        case "D": this.doD(times); break;
                        case "r": this.doRw(times); break;
                        case "u": this.doUw(times); break;
                        case "f": this.doFw(times); break;
                        case "b": this.doBw(times); break;
                        case "l": this.doLw(times); break;
                        case "d": this.doDw(times); break;
                        case "x": this.doX(times); break;
                        case "y": this.doY(times); break;
                        case "z": this.doZ(times); break;
                        case "E": this.doE(times); break;
                        case "M": this.doM(times); break;
                        case "S": this.doS(times); break;
                    }
                } else {
                    console.log("Invalid alg, or no alg specified:" + alg + "|");
                }
            }
        };

        this.solveNoRotate = function() {
            var cubestate = this.cubestate;
            this.cubestate = [
                cubestate[4], cubestate[4], cubestate[4], cubestate[4], cubestate[4], cubestate[4], cubestate[4], cubestate[4], cubestate[4],
                cubestate[13], cubestate[13], cubestate[13], cubestate[13], cubestate[13], cubestate[13], cubestate[13], cubestate[13], cubestate[13],
                cubestate[22], cubestate[22], cubestate[22], cubestate[22], cubestate[22], cubestate[22], cubestate[22], cubestate[22], cubestate[22],
                cubestate[31], cubestate[31], cubestate[31], cubestate[31], cubestate[31], cubestate[31], cubestate[31], cubestate[31], cubestate[31],
                cubestate[40], cubestate[40], cubestate[40], cubestate[40], cubestate[40], cubestate[40], cubestate[40], cubestate[40], cubestate[40],
                cubestate[49], cubestate[49], cubestate[49], cubestate[49], cubestate[49], cubestate[49], cubestate[49], cubestate[49], cubestate[49]
            ];
        };

        // Basic face moves
        this.doU = function(times) {
            for (var i = 0; i < times; i++) {
                var cs = this.cubestate;
                this.cubestate = [cs[6], cs[3], cs[0], cs[7], cs[4], cs[1], cs[8], cs[5], cs[2], cs[45], cs[46], cs[47], cs[12], cs[13], cs[14], cs[15], cs[16], cs[17], cs[9], cs[10], cs[11], cs[21], cs[22], cs[23], cs[24], cs[25], cs[26], cs[27], cs[28], cs[29], cs[30], cs[31], cs[32], cs[33], cs[34], cs[35], cs[18], cs[19], cs[20], cs[39], cs[40], cs[41], cs[42], cs[43], cs[44], cs[36], cs[37], cs[38], cs[48], cs[49], cs[50], cs[51], cs[52], cs[53]];
            }
        };

        this.doR = function(times) {
            for (var i = 0; i < times; i++) {
                var cs = this.cubestate;
                this.cubestate = [cs[0], cs[1], cs[20], cs[3], cs[4], cs[23], cs[6], cs[7], cs[26], cs[15], cs[12], cs[9], cs[16], cs[13], cs[10], cs[17], cs[14], cs[11], cs[18], cs[19], cs[29], cs[21], cs[22], cs[32], cs[24], cs[25], cs[35], cs[27], cs[28], cs[51], cs[30], cs[31], cs[48], cs[33], cs[34], cs[45], cs[36], cs[37], cs[38], cs[39], cs[40], cs[41], cs[42], cs[43], cs[44], cs[8], cs[46], cs[47], cs[5], cs[49], cs[50], cs[2], cs[52], cs[53]];
            }
        };

        this.doF = function(times) {
            for (var i = 0; i < times; i++) {
                var cs = this.cubestate;
                this.cubestate = [cs[0], cs[1], cs[2], cs[3], cs[4], cs[5], cs[44], cs[41], cs[38], cs[6], cs[10], cs[11], cs[7], cs[13], cs[14], cs[8], cs[16], cs[17], cs[24], cs[21], cs[18], cs[25], cs[22], cs[19], cs[26], cs[23], cs[20], cs[15], cs[12], cs[9], cs[30], cs[31], cs[32], cs[33], cs[34], cs[35], cs[36], cs[37], cs[27], cs[39], cs[40], cs[28], cs[42], cs[43], cs[29], cs[45], cs[46], cs[47], cs[48], cs[49], cs[50], cs[51], cs[52], cs[53]];
            }
        };

        this.doD = function(times) {
            for (var i = 0; i < times; i++) {
                var cs = this.cubestate;
                this.cubestate = [cs[0], cs[1], cs[2], cs[3], cs[4], cs[5], cs[6], cs[7], cs[8], cs[9], cs[10], cs[11], cs[12], cs[13], cs[14], cs[24], cs[25], cs[26], cs[18], cs[19], cs[20], cs[21], cs[22], cs[23], cs[42], cs[43], cs[44], cs[33], cs[30], cs[27], cs[34], cs[31], cs[28], cs[35], cs[32], cs[29], cs[36], cs[37], cs[38], cs[39], cs[40], cs[41], cs[51], cs[52], cs[53], cs[45], cs[46], cs[47], cs[48], cs[49], cs[50], cs[15], cs[16], cs[17]];
            }
        };

        this.doL = function(times) {
            for (var i = 0; i < times; i++) {
                var cs = this.cubestate;
                this.cubestate = [cs[53], cs[1], cs[2], cs[50], cs[4], cs[5], cs[47], cs[7], cs[8], cs[9], cs[10], cs[11], cs[12], cs[13], cs[14], cs[15], cs[16], cs[17], cs[0], cs[19], cs[20], cs[3], cs[22], cs[23], cs[6], cs[25], cs[26], cs[18], cs[28], cs[29], cs[21], cs[31], cs[32], cs[24], cs[34], cs[35], cs[42], cs[39], cs[36], cs[43], cs[40], cs[37], cs[44], cs[41], cs[38], cs[45], cs[46], cs[33], cs[48], cs[49], cs[30], cs[51], cs[52], cs[27]];
            }
        };

        this.doB = function(times) {
            for (var i = 0; i < times; i++) {
                var cs = this.cubestate;
                this.cubestate = [cs[11], cs[14], cs[17], cs[3], cs[4], cs[5], cs[6], cs[7], cs[8], cs[9], cs[10], cs[35], cs[12], cs[13], cs[34], cs[15], cs[16], cs[33], cs[18], cs[19], cs[20], cs[21], cs[22], cs[23], cs[24], cs[25], cs[26], cs[27], cs[28], cs[29], cs[30], cs[31], cs[32], cs[36], cs[39], cs[42], cs[2], cs[37], cs[38], cs[1], cs[40], cs[41], cs[0], cs[43], cs[44], cs[51], cs[48], cs[45], cs[52], cs[49], cs[46], cs[53], cs[50], cs[47]];
            }
        };

        // Slice moves
        this.doE = function(times) {
            for (var i = 0; i < times; i++) {
                var cs = this.cubestate;
                this.cubestate = [cs[0], cs[1], cs[2], cs[3], cs[4], cs[5], cs[6], cs[7], cs[8], cs[9], cs[10], cs[11], cs[21], cs[22], cs[23], cs[15], cs[16], cs[17], cs[18], cs[19], cs[20], cs[39], cs[40], cs[41], cs[24], cs[25], cs[26], cs[27], cs[28], cs[29], cs[30], cs[31], cs[32], cs[33], cs[34], cs[35], cs[36], cs[37], cs[38], cs[48], cs[49], cs[50], cs[42], cs[43], cs[44], cs[45], cs[46], cs[47], cs[12], cs[13], cs[14], cs[51], cs[52], cs[53]];
            }
        };

        this.doM = function(times) {
            for (var i = 0; i < times; i++) {
                var cs = this.cubestate;
                this.cubestate = [cs[0], cs[52], cs[2], cs[3], cs[49], cs[5], cs[6], cs[46], cs[8], cs[9], cs[10], cs[11], cs[12], cs[13], cs[14], cs[15], cs[16], cs[17], cs[18], cs[1], cs[20], cs[21], cs[4], cs[23], cs[24], cs[7], cs[26], cs[27], cs[19], cs[29], cs[30], cs[22], cs[32], cs[33], cs[25], cs[35], cs[36], cs[37], cs[38], cs[39], cs[40], cs[41], cs[42], cs[43], cs[44], cs[45], cs[34], cs[47], cs[48], cs[31], cs[50], cs[51], cs[28], cs[53]];
            }
        };

        this.doS = function(times) {
            for (var i = 0; i < times; i++) {
                var cs = this.cubestate;
                this.cubestate = [cs[0], cs[1], cs[2], cs[43], cs[40], cs[37], cs[6], cs[7], cs[8], cs[9], cs[3], cs[11], cs[12], cs[4], cs[14], cs[15], cs[5], cs[17], cs[18], cs[19], cs[20], cs[21], cs[22], cs[23], cs[24], cs[25], cs[26], cs[27], cs[28], cs[29], cs[16], cs[13], cs[10], cs[33], cs[34], cs[35], cs[36], cs[30], cs[38], cs[39], cs[31], cs[41], cs[42], cs[32], cs[44], cs[45], cs[46], cs[47], cs[48], cs[49], cs[50], cs[51], cs[52], cs[53]];
            }
        };

        // Rotations
        this.doX = function(times) {
            for (var i = 0; i < times; i++) {
                this.doR(1);
                this.doM(3);
                this.doL(3);
            }
        };

        this.doY = function(times) {
            for (var i = 0; i < times; i++) {
                this.doU(1);
                this.doE(3);
                this.doD(3);
            }
        };

        this.doZ = function(times) {
            for (var i = 0; i < times; i++) {
                this.doF(1);
                this.doS(1);
                this.doB(3);
            }
        };

        // Wide moves
        this.doUw = function(times) {
            for (var i = 0; i < times; i++) {
                this.doE(3);
                this.doU(1);
            }
        };

        this.doRw = function(times) {
            for (var i = 0; i < times; i++) {
                this.doM(3);
                this.doR(1);
            }
        };

        this.doFw = function(times) {
            for (var i = 0; i < times; i++) {
                this.doS(1);
                this.doF(1);
            }
        };

        this.doDw = function(times) {
            for (var i = 0; i < times; i++) {
                this.doE(1);
                this.doD(1);
            }
        };

        this.doLw = function(times) {
            for (var i = 0; i < times; i++) {
                this.doM(1);
                this.doL(1);
            }
        };

        this.doBw = function(times) {
            for (var i = 0; i < times; i++) {
                this.doS(3);
                this.doB(1);
            }
        };

        /**
         * Set cube state from a 54-character string (URFDLB format)
         * @param {string} stateStr - 54-character cube state string
         */
        this.fromString = function(stateStr) {
            if (!stateStr || stateStr.length !== 54) {
                console.error('Invalid cube state string length:', stateStr ? stateStr.length : 0);
                return;
            }

            const sideMap = { 'U': 1, 'R': 2, 'F': 3, 'D': 4, 'L': 5, 'B': 6 };

            for (var i = 0; i < 54; i++) {
                const face = sideMap[stateStr[i]];
                if (face !== undefined) {
                    this.cubestate[i][0] = face;
                } else {
                    console.error('Invalid character in cube state string:', stateStr[i]);
                }
            }
        };
    }

    // Export
    window.RubiksCube = RubiksCube;
    window.SOLVED_STATE = SOLVED_STATE;
})();
