// OrientationSelector.js — Dropdown selector for cube orientations
// Replaces free-text rotation inputs with a grouped dropdown of all 24 valid orientations.

(function() {
    'use strict';

    var FACE_NAMES = { w: 'White', y: 'Yellow', o: 'Orange', r: 'Red', g: 'Green', b: 'Blue' };

    var ORIENTATION_MOVES = {
        wg: '',       wr: 'y',       wb: 'y2',      wo: "y'",
        yg: 'z2',     yr: 'x2 y',   yb: 'x2',      yo: "x2 y'",
        og: 'z',      ow: 'z y',    ob: 'z y2',     oy: "z y'",
        rg: "z'",     rw: "z' y'",  rb: "z' y2",    ry: "z' y",
        gy: 'x',      gr: 'x y',    gw: 'x y2',     go: "x y'",
        bw: "x'",     br: "x' y",   by: "x' y2",    bo: "x' y'"
    };

    // Groups: top face → array of front face options
    var GROUPS = [
        { top: 'w', fronts: ['g', 'r', 'b', 'o'] },
        { top: 'y', fronts: ['g', 'r', 'b', 'o'] },
        { top: 'o', fronts: ['g', 'w', 'b', 'y'] },
        { top: 'r', fronts: ['g', 'w', 'b', 'y'] },
        { top: 'g', fronts: ['y', 'r', 'w', 'o'] },
        { top: 'b', fronts: ['w', 'r', 'y', 'o'] },
    ];

    // Reverse lookup: move string → orientation key
    var MOVES_TO_KEY = {};
    for (var key in ORIENTATION_MOVES) {
        MOVES_TO_KEY[ORIENTATION_MOVES[key].trim()] = key;
    }

    function label(key) {
        return FACE_NAMES[key[0]] + ' / ' + FACE_NAMES[key[1]];
    }

    /**
     * Create an orientation selector dropdown.
     * @param {string} containerId - ID of the container div
     * @param {string} inputId - ID of the text input to sync with
     * @param {Object} options - { allowCustom: bool }
     */
    function create(containerId, inputId, options) {
        options = options || {};
        var container = document.getElementById(containerId);
        if (!container) return;

        // Find the linked input (first matching ID in document)
        var input = document.getElementById(inputId);

        // Build select
        var select = document.createElement('select');
        select.className = 'form-select form-select-sm';

        // Default empty option
        var emptyOpt = document.createElement('option');
        emptyOpt.value = '_none';
        emptyOpt.textContent = '— None —';
        select.appendChild(emptyOpt);

        // Grouped options
        GROUPS.forEach(function(group) {
            var optgroup = document.createElement('optgroup');
            optgroup.label = FACE_NAMES[group.top] + ' top';
            group.fronts.forEach(function(front) {
                var key = group.top + front;
                var opt = document.createElement('option');
                opt.value = key;
                var moves = ORIENTATION_MOVES[key];
                opt.textContent = label(key) + (moves ? '  (' + moves + ')' : '');
                optgroup.appendChild(opt);
            });
            select.appendChild(optgroup);
        });

        // Custom option
        if (options.allowCustom) {
            var customOpt = document.createElement('option');
            customOpt.value = '_custom';
            customOpt.textContent = 'Custom...';
            select.appendChild(customOpt);
        }

        container.innerHTML = '';
        container.appendChild(select);

        // Set initial value from input
        function syncFromInput() {
            if (!input) return;
            var val = (input.value || '').trim();
            if (!val) {
                select.value = '_none';
                if (input) input.classList.add('d-none');
                return;
            }
            var matchedKey = MOVES_TO_KEY[val];
            if (matchedKey) {
                select.value = matchedKey;
                if (input) input.classList.add('d-none');
            } else if (options.allowCustom) {
                select.value = '_custom';
                if (input) input.classList.remove('d-none');
            } else {
                select.value = '_none';
            }
        }

        syncFromInput();

        // On dropdown change → write to input
        select.addEventListener('change', function() {
            var val = select.value;
            if (val === '_none') {
                if (input) {
                    input.value = '';
                    input.classList.add('d-none');
                    localStorage.setItem(inputId, '');
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            } else if (val === '_custom') {
                if (input) input.classList.remove('d-none');
            } else {
                var moves = ORIENTATION_MOVES[val] || '';
                if (input) {
                    input.value = moves;
                    input.classList.add('d-none');
                    localStorage.setItem(inputId, moves);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        });

        return { syncFromInput: syncFromInput };
    }

    window.OrientationSelector = {
        create: create,
        ORIENTATION_MOVES: ORIENTATION_MOVES,
        MOVES_TO_KEY: MOVES_TO_KEY
    };
})();
