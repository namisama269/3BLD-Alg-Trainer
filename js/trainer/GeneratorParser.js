// GeneratorParser.js - Parse generator syntax for algorithm set generation
// Syntax:
//   <alg1, alg2, ...> = generators (BFS expansion to all reachable states)
//   [alg1, alg2, ...] = alternatives (creates separate cases for each)
//   Plain moves outside brackets = executed directly

(function() {
    'use strict';

    // Cache for expanded generator results to avoid recomputation
    let generatorCache = new Map();

    // Cache for fully generated algorithm list (after Generate button is pressed)
    let generatedAlgList = null;
    let generatedInputHash = null;

    // Progress callback for async generation
    let progressCallback = null;

    /**
     * Find the matching closing bracket
     * @param {string} input - Input string
     * @param {number} start - Starting position (at opening bracket)
     * @param {string} open - Opening bracket character
     * @param {string} close - Closing bracket character
     * @returns {number} Position of matching closing bracket, or -1 if not found
     */
    function findMatchingBracket(input, start, open, close) {
        let depth = 1;
        let i = start + 1;
        while (i < input.length && depth > 0) {
            if (input[i] === open) depth++;
            else if (input[i] === close) depth--;
            i++;
        }
        return depth === 0 ? i - 1 : -1;
    }

    /**
     * Tokenize generator input into segments
     * @param {string} input - Generator string
     * @returns {Array} Array of tokens {type: 'generator'|'alternative'|'plain', content: string}
     */
    function tokenize(input) {
        const tokens = [];
        let i = 0;

        while (i < input.length) {
            // Skip whitespace
            while (i < input.length && /\s/.test(input[i])) {
                i++;
            }
            if (i >= input.length) break;

            if (input[i] === '<') {
                // Generator group
                const end = findMatchingBracket(input, i, '<', '>');
                if (end === -1) {
                    throw new Error('Unmatched < bracket at position ' + i);
                }
                tokens.push({ type: 'generator', content: input.slice(i + 1, end) });
                i = end + 1;
            } else if (input[i] === '[') {
                // Alternative group
                const end = findMatchingBracket(input, i, '[', ']');
                if (end === -1) {
                    throw new Error('Unmatched [ bracket at position ' + i);
                }
                tokens.push({ type: 'alternative', content: input.slice(i + 1, end) });
                i = end + 1;
            } else {
                // Plain move sequence - collect until next bracket or end
                let j = i;
                while (j < input.length && input[j] !== '<' && input[j] !== '[') {
                    j++;
                }
                const content = input.slice(i, j).trim();
                if (content) {
                    tokens.push({ type: 'plain', content: content });
                }
                i = j;
            }
        }

        return tokens;
    }

    /**
     * Split algorithm string by comma, respecting nested brackets
     * @param {string} content - Comma-separated algorithms
     * @returns {string[]} Array of individual algorithms
     */
    function splitByComma(content) {
        const result = [];
        let current = '';
        let depth = 0;

        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            if (char === '(' || char === '[' || char === '<') {
                depth++;
                current += char;
            } else if (char === ')' || char === ']' || char === '>') {
                depth--;
                current += char;
            } else if (char === ',' && depth === 0) {
                const trimmed = current.trim();
                if (trimmed) result.push(trimmed);
                current = '';
            } else {
                current += char;
            }
        }

        const trimmed = current.trim();
        if (trimmed) result.push(trimmed);

        return result;
    }

    /**
     * Expand generators using BFS to find all reachable states
     * @param {string[]} generators - Array of generator algorithms
     * @param {number} maxStates - Maximum number of states to explore
     * @returns {string[]} Array of algorithm sequences that generate each unique state
     */
    function expandGenerators(generators, maxStates = 1000) {
        // Create cache key (use slice to avoid mutating original array)
        const cacheKey = generators.slice().sort().join('|');
        if (generatorCache.has(cacheKey)) {
            return generatorCache.get(cacheKey);
        }

        const cube = new RubiksCube();
        const solvedState = cube.toString();

        // Map: state string -> algorithm sequence to reach it
        const visited = new Map();
        visited.set(solvedState, '');

        // BFS queue: {state, alg}
        const queue = [{ state: solvedState, alg: '' }];

        // Pre-expand commutator notation for all generators
        const expandedGens = generators.map(gen =>
            window.commToMoves ? commToMoves(gen) : gen
        );

        // Reuse single cube instance for performance
        const testCube = new RubiksCube();

        while (queue.length > 0 && visited.size < maxStates) {
            const { state, alg } = queue.shift();

            for (let i = 0; i < generators.length; i++) {
                // Reset cube to current state and apply generator
                testCube.fromString(state);
                testCube.doAlgorithm(expandedGens[i]);

                const newState = testCube.toString();

                if (!visited.has(newState)) {
                    const newAlg = alg ? alg + ' ' + generators[i] : generators[i];
                    visited.set(newState, newAlg);
                    queue.push({ state: newState, alg: newAlg });
                }
            }
        }

        // Return all non-empty algorithm sequences (exclude solved state with empty alg)
        const result = Array.from(visited.values()).filter(a => a !== '');

        // Cache the result
        generatorCache.set(cacheKey, result);

        return result;
    }

    /**
     * Parse generator string and produce array of all generated algorithms
     * @param {string} generatorInput - The generator string with <> and [] syntax
     * @returns {string[]} Array of all generated algorithms
     */
    function parseGeneratorString(generatorInput) {
        if (!generatorInput || !generatorInput.trim()) {
            return [];
        }

        try {
            const tokens = tokenize(generatorInput.trim());

            if (tokens.length === 0) {
                return [];
            }

            // Process tokens to build algorithm list
            // Start with a single empty prefix
            let currentAlgs = [''];

            for (const token of tokens) {
                if (token.type === 'plain') {
                    // Append plain moves to all current algorithms
                    currentAlgs = currentAlgs.map(alg =>
                        (alg ? alg + ' ' : '') + token.content
                    );
                } else if (token.type === 'generator') {
                    // Parse generators and expand
                    const generators = splitByComma(token.content);
                    const expanded = expandGenerators(generators);

                    // Combine each current alg with each expanded state
                    const newAlgs = [];
                    for (const prefix of currentAlgs) {
                        for (const genAlg of expanded) {
                            newAlgs.push((prefix ? prefix + ' ' : '') + genAlg);
                        }
                        // Also include the prefix without any generator (identity/solved case)
                        newAlgs.push(prefix);
                    }
                    currentAlgs = newAlgs;
                } else if (token.type === 'alternative') {
                    // Parse alternatives
                    const alternatives = splitByComma(token.content);

                    // Combine each current alg with each alternative
                    const newAlgs = [];
                    for (const prefix of currentAlgs) {
                        for (const alt of alternatives) {
                            newAlgs.push((prefix ? prefix + ' ' : '') + alt);
                        }
                    }
                    currentAlgs = newAlgs;
                }
            }

            // Clean up: trim whitespace and filter empty strings
            return currentAlgs
                .map(alg => alg.trim())
                .filter(alg => alg !== '');

        } catch (error) {
            console.error('[GeneratorParser] Error:', error.message);
            return [];
        }
    }

    /**
     * Validate generator syntax without fully expanding
     * @param {string} input - Generator input string
     * @returns {{valid: boolean, error: string|null}}
     */
    function validateSyntax(input) {
        if (!input || !input.trim()) {
            return { valid: true, error: null };
        }

        try {
            const tokens = tokenize(input.trim());

            // Check each token for valid algorithms
            for (const token of tokens) {
                if (token.type === 'generator' || token.type === 'alternative') {
                    const algs = splitByComma(token.content);
                    for (const algStr of algs) {
                        if (!algStr.trim()) {
                            return { valid: false, error: 'Empty algorithm in brackets' };
                        }
                        // Try to validate the algorithm
                        try {
                            if (window.alg && window.alg.cube) {
                                const expanded = window.commToMoves ? commToMoves(algStr.trim()) : algStr.trim();
                                window.alg.cube.simplify(expanded);
                            }
                        } catch (e) {
                            return { valid: false, error: 'Invalid algorithm: ' + algStr.trim() };
                        }
                    }
                } else if (token.type === 'plain') {
                    try {
                        if (window.alg && window.alg.cube) {
                            const expanded = window.commToMoves ? commToMoves(token.content) : token.content;
                            window.alg.cube.simplify(expanded);
                        }
                    } catch (e) {
                        return { valid: false, error: 'Invalid algorithm: ' + token.content };
                    }
                }
            }

            return { valid: true, error: null };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Get a preview of how many cases will be generated
     * @param {string} input - Generator input string
     * @returns {number} Estimated number of cases
     */
    function estimateCaseCount(input) {
        if (!input || !input.trim()) {
            return 0;
        }

        try {
            const tokens = tokenize(input.trim());
            let count = 1;

            for (const token of tokens) {
                if (token.type === 'generator') {
                    const generators = splitByComma(token.content);
                    // Rough estimate: assume each generator produces unique states
                    // Real count from BFS would be more accurate but expensive
                    const expanded = expandGenerators(generators, 100);
                    count *= (expanded.length + 1); // +1 for identity
                } else if (token.type === 'alternative') {
                    const alternatives = splitByComma(token.content);
                    count *= alternatives.length;
                }
            }

            return count;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Clear the generator cache
     */
    function clearCache() {
        generatorCache.clear();
        generatedAlgList = null;
        generatedInputHash = null;
    }

    /**
     * Compute a hash for the generator input
     * @param {string} input - Generator input string
     * @returns {string} Hash string
     */
    function hashInput(input) {
        return input.trim();
    }

    /**
     * Check if we have a valid cached generation for the current input
     * @param {string} input - Generator input string
     * @returns {boolean}
     */
    function hasCachedGeneration(input) {
        return generatedAlgList !== null && generatedInputHash === hashInput(input);
    }

    /**
     * Get the cached algorithm list
     * @returns {string[]|null}
     */
    function getCachedAlgList() {
        return generatedAlgList;
    }

    /**
     * Expand generators using BFS with async yielding for progress updates
     * @param {string[]} generators - Array of generator algorithms
     * @param {number} maxStates - Maximum number of states to explore
     * @param {function} onProgress - Progress callback (statesFound, queueSize)
     * @returns {Promise<string[]>} Array of algorithm sequences
     */
    async function expandGeneratorsAsync(generators, maxStates = 1000, onProgress = null) {
        // Create cache key
        const cacheKey = generators.slice().sort().join('|');
        if (generatorCache.has(cacheKey)) {
            return generatorCache.get(cacheKey);
        }

        const cube = new RubiksCube();
        const solvedState = cube.toString();

        const visited = new Map();
        visited.set(solvedState, '');

        const queue = [{ state: solvedState, alg: '' }];

        const expandedGens = generators.map(gen =>
            window.commToMoves ? commToMoves(gen) : gen
        );

        const testCube = new RubiksCube();
        let iterations = 0;

        while (queue.length > 0 && visited.size < maxStates) {
            const { state, alg } = queue.shift();

            for (let i = 0; i < generators.length; i++) {
                testCube.fromString(state);
                testCube.doAlgorithm(expandedGens[i]);

                const newState = testCube.toString();

                if (!visited.has(newState)) {
                    const newAlg = alg ? alg + ' ' + generators[i] : generators[i];
                    visited.set(newState, newAlg);
                    queue.push({ state: newState, alg: newAlg });
                }
            }

            iterations++;
            // Yield to UI every 50 iterations
            if (iterations % 50 === 0) {
                if (onProgress) {
                    onProgress(visited.size, queue.length);
                }
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        const result = Array.from(visited.values()).filter(a => a !== '');
        generatorCache.set(cacheKey, result);

        return result;
    }

    /**
     * Generate all algorithms asynchronously with progress updates
     * @param {string} generatorInput - The generator string
     * @param {function} onProgress - Progress callback ({phase, detail, percent})
     * @returns {Promise<string[]>} Array of all generated algorithms
     */
    async function generateAsync(generatorInput, onProgress = null) {
        if (!generatorInput || !generatorInput.trim()) {
            return [];
        }

        // Check if already cached
        const inputHash = hashInput(generatorInput);
        if (generatedInputHash === inputHash && generatedAlgList !== null) {
            if (onProgress) {
                onProgress({ phase: 'complete', detail: 'Using cached results', percent: 100 });
            }
            return generatedAlgList;
        }

        try {
            const tokens = tokenize(generatorInput.trim());

            if (tokens.length === 0) {
                return [];
            }

            let currentAlgs = [''];
            let tokenIndex = 0;

            for (const token of tokens) {
                tokenIndex++;
                const tokenPercent = Math.round((tokenIndex / tokens.length) * 100);

                if (token.type === 'plain') {
                    currentAlgs = currentAlgs.map(alg =>
                        (alg ? alg + ' ' : '') + token.content
                    );
                    if (onProgress) {
                        onProgress({
                            phase: 'Processing plain moves',
                            detail: token.content,
                            percent: tokenPercent
                        });
                    }
                } else if (token.type === 'generator') {
                    const generators = splitByComma(token.content);

                    if (onProgress) {
                        onProgress({
                            phase: 'Expanding generators',
                            detail: `<${generators.join(', ')}>`,
                            percent: tokenPercent - 10
                        });
                    }

                    const expanded = await expandGeneratorsAsync(generators, 1000, (states, queue) => {
                        if (onProgress) {
                            onProgress({
                                phase: 'Expanding generators',
                                detail: `Found ${states} unique states, ${queue} in queue`,
                                percent: tokenPercent - 5
                            });
                        }
                    });

                    const newAlgs = [];
                    for (const prefix of currentAlgs) {
                        for (const genAlg of expanded) {
                            newAlgs.push((prefix ? prefix + ' ' : '') + genAlg);
                        }
                        newAlgs.push(prefix);
                    }
                    currentAlgs = newAlgs;

                    if (onProgress) {
                        onProgress({
                            phase: 'Combining results',
                            detail: `${currentAlgs.length} algorithms so far`,
                            percent: tokenPercent
                        });
                    }

                    // Yield to keep UI responsive
                    await new Promise(resolve => setTimeout(resolve, 0));

                } else if (token.type === 'alternative') {
                    const alternatives = splitByComma(token.content);

                    if (onProgress) {
                        onProgress({
                            phase: 'Processing alternatives',
                            detail: `[${alternatives.join(', ')}]`,
                            percent: tokenPercent
                        });
                    }

                    const newAlgs = [];
                    for (const prefix of currentAlgs) {
                        for (const alt of alternatives) {
                            newAlgs.push((prefix ? prefix + ' ' : '') + alt);
                        }
                    }
                    currentAlgs = newAlgs;
                }
            }

            // Clean up
            const result = currentAlgs
                .map(alg => alg.trim())
                .filter(alg => alg !== '');

            // Cache the result
            generatedAlgList = result;
            generatedInputHash = inputHash;

            if (onProgress) {
                onProgress({
                    phase: 'Complete',
                    detail: `Generated ${result.length} algorithms`,
                    percent: 100
                });
            }

            return result;

        } catch (error) {
            console.error('[GeneratorParser] Error:', error.message);
            if (onProgress) {
                onProgress({
                    phase: 'Error',
                    detail: error.message,
                    percent: 0
                });
            }
            return [];
        }
    }

    /**
     * Check if generation is needed (input changed since last generation)
     * @param {string} input - Generator input string
     * @returns {boolean}
     */
    function needsGeneration(input) {
        return !hasCachedGeneration(input);
    }

    // Export to global scope
    window.GeneratorParser = {
        parseGeneratorString,
        validateSyntax,
        estimateCaseCount,
        clearCache,
        generateAsync,
        hasCachedGeneration,
        getCachedAlgList,
        needsGeneration
    };

})();
