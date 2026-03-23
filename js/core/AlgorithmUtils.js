// AlgorithmUtils.js - Algorithm manipulation and transformation utilities
// Depends on: helpers.js (commToMoves, isCommutator, invertMoves)

(function() {
    'use strict';

    // Rotation map for simplifying moves after rotations
    const ROTATION_MAP = {
        "x": { "B": "U", "F": "D", "U": "F", "D": "B", "L": "L", "R": "R" },
        "x'": { "F": "U", "B": "D", "U": "B", "D": "F", "L": "L", "R": "R" },
        "y": { "L": "F", "R": "B", "F": "R", "B": "L", "U": "U", "D": "D" },
        "y'": { "F": "L", "B": "R", "L": "B", "R": "F", "U": "U", "D": "D" },
        "z": { "U": "L", "D": "R", "L": "D", "R": "U", "F": "F", "B": "B" },
        "z'": { "U": "R", "D": "L", "L": "U", "R": "D", "F": "F", "B": "B" }
    };

    // Random AUF moves
    const AUF_MOVES = {
        "U": ["", "U", "U'", "U2"],
        "D": ["", "D", "D'", "D2"]
    };

    /**
     * Simplify a move based on rotation context
     * @param {string} move - The move to simplify (e.g., "R", "U'")
     * @param {string} rotation - The rotation context (e.g., "x", "y'")
     * @returns {string} The simplified move
     */
    function simplifyRotation(move, rotation) {
        move = move.trim();
        rotation = rotation.trim();

        if (rotation in ROTATION_MAP && move[0] in ROTATION_MAP[rotation]) {
            return ROTATION_MAP[rotation][move[0]] + move.slice(1);
        }

        return move;
    }

    /**
     * Get a random AUF (Adjust U Face) move
     * @param {string} layer - The layer to adjust ("U" or "D")
     * @returns {string} A random AUF move
     */
    function getRandAuf(layer = "U") {
        const moves = AUF_MOVES[layer] || AUF_MOVES["U"];
        const rand = Math.floor(Math.random() * moves.length);
        return moves[rand];
    }

    /**
     * Get random premoves for scramble obfuscation
     * @param {number} numPremoves - Number of premoves to generate
     * @returns {string} Space-separated premoves
     */
    function getPremoves(numPremoves) {
        const allMoves = ["R", "L", "U", "D", "F", "B"];
        const modifiers = ["", "'", "2"];
        let premoves = [];

        for (let i = 0; i < numPremoves; i++) {
            const move = allMoves[Math.floor(Math.random() * allMoves.length)];
            const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
            premoves.push(move + modifier);
        }

        return premoves.join(" ");
    }

    /**
     * Obfuscate an algorithm to create a realistic scramble
     * Requires cubejs library (alg.cube) to be loaded
     * @param {string} algorithm - The algorithm to obfuscate
     * @param {number} numPremoves - Number of premoves to use
     * @param {number} minLength - Minimum solution length
     * @returns {string} The obfuscated algorithm
     */
    function obfuscate(algorithm, numPremoves = 3, minLength = 16) {
        if (!window.alg || !window.alg.cube) {
            console.warn('alg.cube library not available for obfuscation');
            return algorithm;
        }

        var premoves = getPremoves(numPremoves);
        var rc = new RubiksCube();
        rc.doAlgorithm(alg.cube.invert(premoves) + algorithm);
        var orient = alg.cube.invert(rc.wcaOrient());
        var solution = alg.cube.simplify(premoves + (alg.cube.invert(rc.solution())) + orient).replace(/2'/g, "2");
        return solution.split(" ").length >= minLength ? solution : obfuscate(algorithm, numPremoves + 1, minLength);
    }

    /**
     * Add random AUFs to an array of algorithms
     * @param {string[]} algArr - Array of algorithms
     * @returns {string[]} Algorithms with AUFs added
     */
    function addAUFs(algArr) {
        if (!window.alg || !window.alg.cube) {
            console.warn('alg.cube library not available for AUF addition');
            return algArr;
        }

        var rand1 = getRandAuf("U");
        var rand2 = getRandAuf("U");

        for (var i = 0; i < algArr.length; i++) {
            algArr[i] = alg.cube.simplify(rand1 + algArr[i] + " " + rand2);
        }
        return algArr;
    }

    /**
     * Generate a scramble from an algorithm
     * @param {string} raw_alg - The raw algorithm
     * @param {boolean} obfuscateAlg - Whether to obfuscate the scramble
     * @param {boolean} shouldPrescramble - Whether to use prescramble
     * @returns {string} The generated scramble
     */
    function generateAlgScramble(raw_alg, obfuscateAlg, shouldPrescramble) {
        if (!window.alg || !window.alg.cube) {
            console.warn('alg.cube library not available');
            return raw_alg;
        }

        if (!obfuscateAlg) {
            return alg.cube.invert(raw_alg);
        } else if (!shouldPrescramble) {
            return obfuscate(alg.cube.invert(raw_alg));
        }
    }

    /**
     * Generate a prescramble with random moves
     * @param {string} raw_alg - The raw algorithm
     * @param {string} generator - Comma-separated move generator
     * @param {number} times - Number of random moves
     * @param {boolean} obfuscateAlg - Whether to obfuscate
     * @param {string} premoves - Optional premoves
     * @returns {string} The generated prescramble
     */
    function generatePreScramble(raw_alg, generator, times, obfuscateAlg, premoves = "") {
        if (!window.alg || !window.alg.cube) {
            console.warn('alg.cube library not available');
            return raw_alg;
        }

        var genArray = generator.split(",");
        var scramble = premoves;

        for (var i = 0; i < times; i++) {
            var rand = Math.floor(Math.random() * genArray.length);
            scramble += genArray[rand];
        }
        scramble += alg.cube.invert(raw_alg);

        if (obfuscateAlg) {
            return obfuscate(scramble);
        } else {
            return scramble;
        }
    }

    /**
     * Add extra rotations to reorient cube after algorithm
     * @param {string} algorithm - The algorithm
     * @returns {string} Algorithm with correction rotations
     */
    function correctRotation(algorithm) {
        var rc = new RubiksCube();
        rc.doAlgorithm(algorithm);
        var ori = rc.wcaOrient();
        return algorithm + " " + ori;
    }

    /**
     * Mirror algorithms across M or S axis
     * @param {string[]} algList - List of algorithms
     * @param {string} axis - Axis to mirror across ("M" or "S")
     * @returns {string[]} Mirrored algorithms
     */
    function mirrorAlgsAcrossAxis(algList, axis = "M") {
        if (!window.alg || !window.alg.cube) {
            console.warn('alg.cube library not available for mirroring');
            return algList;
        }

        return algList.map(originalAlg => {
            // commToMoves is from helpers.js
            const expandedAlg = commToMoves(originalAlg);
            try {
                if (axis === "M") {
                    return alg.cube.mirrorAcrossM(expandedAlg);
                } else {
                    return alg.cube.mirrorAcrossS(expandedAlg);
                }
            } catch (err) {
                console.warn("Failed to mirror alg:", originalAlg, err);
                return originalAlg;
            }
        });
    }

    /**
     * Calculate average movecount of algorithm list
     * @param {string[]} algList - List of algorithms
     * @param {string} metric - Metric to use (e.g., "HTM", "STM")
     * @param {boolean} includeAUF - Whether to include AUF moves in count
     * @returns {number} Average movecount
     */
    function averageMovecount(algList, metric, includeAUF) {
        if (!window.alg || !window.alg.cube) {
            console.warn('alg.cube library not available');
            return 0;
        }

        var totalmoves = 0;

        for (var i = 0; i < algList.length; i++) {
            var topAlg = algList[i].split("!")[0];
            topAlg = topAlg.replace(/\[|\]|\)|\(/g, "");
            // commToMoves is from helpers.js
            topAlg = commToMoves(topAlg);

            var moves = alg.cube.simplify(alg.cube.expand(alg.cube.fromString(topAlg)));

            if (!includeAUF) {
                while (moves.length > 0 && (moves[0].base === "U" || moves[0].base === "y")) {
                    moves.splice(0, 1);
                }
                while (moves.length > 0 && (moves[moves.length - 1].base === "U" || moves[moves.length - 1].base === "y")) {
                    moves.splice(moves.length - 1);
                }
            }
            totalmoves += alg.cube.countMoves(moves, { "metric": metric });
        }

        return algList.length > 0 ? totalmoves / algList.length : 0;
    }

    /**
     * Generate random orientation for color neutrality
     * @param {Object} options - Orientation options
     * @returns {string[]} [fullOrientation, randomPart]
     */
    function generateOrientation(options = {}) {
        const cn1 = options.cn1 || "";
        const fullCN = options.fullCN || false;
        const cn2 = options.cn2 || "";
        const cn3 = options.cn3 || "";

        if (fullCN) {
            var firstRotation = ["", "x", "x'", "x2", "y", "y'"];
            var secondRotation = ["", "z", "z'", "z2"];

            var rand1 = Math.floor(Math.random() * 6);
            var rand2 = Math.floor(Math.random() * 4);
            var randomPart = firstRotation[rand1] + secondRotation[rand2];

            if (randomPart === "x2z2") {
                randomPart = "y2";
            }

            var fullOrientation = cn1 + randomPart;
            return [fullOrientation, randomPart];
        }

        var rand1 = Math.floor(Math.random() * 4);
        var rand2 = Math.floor(Math.random() * 4);

        var randomPart = cn2.repeat(rand1) + cn3.repeat(rand2);
        var fullOrientation = cn1 + randomPart;
        return [fullOrientation, randomPart];
    }

    // U layer side indices (for pivot finding)
    const uSideIndices = new Set([9, 10, 11, 18, 19, 20, 36, 37, 38, 45, 46, 47]);

    /**
     * Find a non-center sticker that doesn't move during an algorithm
     * Used for maintaining pivot position
     * @param {string} algorithm - The algorithm to analyze
     * @returns {number} Index of pivot sticker, or -1 if not found
     */
    function findPivot(algorithm) {
        let cube = new RubiksCube();
        let moves = algorithm.split(" ");
        let states = [];

        for (let move of moves) {
            cube.doAlgorithm(move);
            states.push(cube.getMaskValues());
        }

        for (let i = 0; i < 54; ++i) {
            // Skip centers
            if (i % 9 === 4) continue;

            // Skip U layer
            if (i < 9) continue;
            if (uSideIndices.has(i)) continue;

            let stateSet = new Set();
            for (let state of states) {
                stateSet.add(state[i]);
            }

            if (stateSet.size === 1) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Find rotation to fix pivot position
     * @param {number} pivotIndex - Index of the pivot sticker
     * @param {RubiksCube} cube - The cube state
     * @returns {string} Rotation to fix the pivot
     */
    function findRotationToFixPivot(pivotIndex, cube) {
        const rotations = ["", "x", "x'", "x2", "y", "y'", "y2", "z", "z'", "z2"];

        for (let i = 0; i < rotations.length; ++i) {
            for (let j = 0; j < rotations.length; ++j) {
                let rotation = rotations[i] + ' ' + rotations[j];
                rotation = rotation.trim();

                cube.doAlgorithm(rotation);
                if (cube.cubestate[pivotIndex][1] === pivotIndex) {
                    if (window.alg && window.alg.cube) {
                        cube.doAlgorithm(alg.cube.invert(rotation));
                    }
                    return rotation;
                }

                if (window.alg && window.alg.cube) {
                    cube.doAlgorithm(alg.cube.invert(rotation));
                }
            }
        }

        return "rotation not found";
    }

    // Export functions to global scope
    window.AlgorithmUtils = {
        simplifyRotation,
        getRandAuf,
        getPremoves,
        obfuscate,
        addAUFs,
        generateAlgScramble,
        generatePreScramble,
        correctRotation,
        mirrorAlgsAcrossAxis,
        averageMovecount,
        generateOrientation,
        findPivot,
        findRotationToFixPivot,
        uSideIndices,
        ROTATION_MAP,
        AUF_MOVES
    };

    // Also export individual functions for backward compatibility
    window.simplifyRotation = simplifyRotation;
    window.getRandAuf = getRandAuf;
    window.getPremoves = getPremoves;
    window.obfuscate = obfuscate;
    window.addAUFs = addAUFs;
    window.generateAlgScramble = generateAlgScramble;
    window.generatePreScramble = generatePreScramble;
    window.correctRotation = correctRotation;
    window.mirrorAlgsAcrossAxis = mirrorAlgsAcrossAxis;
    window.averageMovecount = averageMovecount;
    window.generateOrientation = generateOrientation;
    window.findPivot = findPivot;
    window.findRotationToFixPivot = findRotationToFixPivot;

})();
