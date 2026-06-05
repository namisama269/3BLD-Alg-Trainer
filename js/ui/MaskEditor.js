// MaskEditor.js — Isometric cube net mask editor in a modal
// Supports piece mode (toggle whole corner/edge) and sticker mode.

(function() {
    'use strict';

    // Isometric layout constants
    var CANVAS_W = 600;
    var MARGIN = 50;
    var PGRAM_SCALE = 0.5;
    var STICKER_SIZE = (CANVAS_W - 2 * MARGIN) / (9 + 3 * PGRAM_SCALE);
    var CANVAS_H = 2 * MARGIN + (3 * PGRAM_SCALE + 6) * STICKER_SIZE;
    var PH = STICKER_SIZE * PGRAM_SCALE;
    var PO = PH / Math.tan(45 * Math.PI / 180);

    function isDarkMode() {
        return document.documentElement.getAttribute('data-bs-theme') === 'dark';
    }
    function colors() {
        var dark = isDarkMode();
        return {
            visible: dark ? '#5b9bd5' : '#89c4f4',
            masked:  dark ? '#2a2a2a' : '#888888',
            stroke:  dark ? '#888888' : '#333333',
            label:   dark ? '#cccccc' : '#333333'
        };
    }

    var FACE_START = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };
    var CENTERS = { 4: 'U', 13: 'R', 22: 'F', 31: 'D', 40: 'L', 49: 'B' };

    var PIECES = [
        [0, 47, 36], [2, 45, 11], [6, 18, 38], [8, 20, 9],
        [27, 24, 44], [29, 26, 15], [35, 51, 17], [33, 53, 42],
        [7, 19], [5, 10], [1, 46], [3, 37],
        [28, 25], [32, 16], [34, 52], [30, 43],
        [21, 41], [23, 12], [50, 39], [48, 14],
        [4], [13], [22], [31], [40], [49]
    ];
    var STICKER_TO_PIECE = {};
    for (var p = 0; p < PIECES.length; p++)
        for (var s = 0; s < PIECES[p].length; s++)
            STICKER_TO_PIECE[PIECES[p][s]] = PIECES[p];

    // Module state
    var state = [];
    for (var i = 0; i < 54; i++) state.push(true);
    var mode = 'piece';
    var targetInputId = null;
    var modalInstance = null;
    var canvas = null;
    var ctx = null;
    var stickerShapes = []; // { points, face, gi }
    var built = false;

    function buildStickers() {
        stickerShapes = [];
        // U face (parallelograms)
        for (var row = 0; row < 3; row++) {
            for (var col = 0; col < 3; col++) {
                var tlx = MARGIN + 3 * STICKER_SIZE + 2 * PO;
                var tly = MARGIN + PH;
                var x = tlx - row * PO + col * STICKER_SIZE;
                var y = tly + row * PH;
                stickerShapes.push({ points: [x, y, x + STICKER_SIZE, y, x + STICKER_SIZE + PO, y - PH, x + PO, y - PH], face: 'U', gi: row * 3 + col });
            }
        }
        // R face (parallelograms)
        for (var row = 0; row < 3; row++) {
            for (var col = 0; col < 3; col++) {
                var tlx = MARGIN + 6 * STICKER_SIZE;
                var tly = MARGIN + 3 * PH;
                var x = tlx + col * PH;
                var y = tly + row * STICKER_SIZE - col * PO;
                stickerShapes.push({ points: [x, y, x + PH, y - PO, x + PH, y + STICKER_SIZE - PO, x, y + STICKER_SIZE], face: 'R', gi: 9 + row * 3 + col });
            }
        }
        addSquareFace(MARGIN + 3 * STICKER_SIZE, MARGIN + 3 * PH, 'F', 18);
        addSquareFace(MARGIN + 3 * STICKER_SIZE, MARGIN + 3 * PH + 3 * STICKER_SIZE, 'D', 27);
        addSquareFace(MARGIN, MARGIN + 3 * PH, 'L', 36);
        addSquareFace(MARGIN + 6 * STICKER_SIZE + 3 * PH, MARGIN + 3 * PH - 3 * PO, 'B', 45);
    }

    function addSquareFace(tlx, tly, face, startIdx) {
        for (var row = 0; row < 3; row++) {
            for (var col = 0; col < 3; col++) {
                var x = tlx + col * STICKER_SIZE;
                var y = tly + row * STICKER_SIZE;
                stickerShapes.push({ points: [x, y, x + STICKER_SIZE, y, x + STICKER_SIZE, y + STICKER_SIZE, x, y + STICKER_SIZE], face: face, gi: startIdx + row * 3 + col });
            }
        }
    }

    function draw() {
        if (!ctx) return;
        var c = colors();
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        for (var i = 0; i < stickerShapes.length; i++) {
            var st = stickerShapes[i];
            var pts = st.points;
            ctx.beginPath();
            ctx.moveTo(pts[0], pts[1]);
            for (var j = 2; j < pts.length; j += 2) ctx.lineTo(pts[j], pts[j + 1]);
            ctx.closePath();
            ctx.fillStyle = state[st.gi] ? c.visible : c.masked;
            ctx.globalAlpha = state[st.gi] ? 1.0 : 0.4;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = c.stroke;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if (CENTERS[st.gi]) {
                var cx = 0, cy = 0;
                for (var j = 0; j < pts.length; j += 2) { cx += pts[j]; cy += pts[j + 1]; }
                cx /= pts.length / 2; cy /= pts.length / 2;
                ctx.font = 'bold ' + Math.round(STICKER_SIZE * 0.45) + 'px sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = c.label;
                ctx.fillText(CENTERS[st.gi], cx, cy);
            }
        }
    }

    function pointInPolygon(pts, mx, my) {
        var inside = false, n = pts.length / 2;
        for (var i = 0, j = n - 1; i < n; j = i++) {
            var xi = pts[2 * i], yi = pts[2 * i + 1], xj = pts[2 * j], yj = pts[2 * j + 1];
            if (((yi > my) !== (yj > my)) && (mx < (xj - xi) * (my - yi) / (yj - yi) + xi)) inside = !inside;
        }
        return inside;
    }

    function getMousePos(e) {
        var rect = canvas.getBoundingClientRect();
        return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
    }

    function handleCanvasClick(e) {
        var pos = getMousePos(e);
        for (var i = 0; i < stickerShapes.length; i++) {
            if (pointInPolygon(stickerShapes[i].points, pos.x, pos.y)) {
                handleClick(stickerShapes[i].gi);
                break;
            }
        }
    }

    function handleClick(gi) {
        if (mode === 'piece') {
            var piece = STICKER_TO_PIECE[gi];
            if (piece) {
                var newVal = !state[gi];
                for (var k = 0; k < piece.length; k++) state[piece[k]] = newVal;
            }
        } else {
            state[gi] = !state[gi];
        }
        draw();
        syncToInput();
    }

    function syncToInput() {
        if (!targetInputId) return;
        var str = getMask();
        document.querySelectorAll('#' + CSS.escape(targetInputId)).forEach(function(inp) { inp.value = str; });
        localStorage.setItem(targetInputId, str);
    }

    function setMask(mask54) {
        if (!mask54 || mask54.length !== 54) {
            for (var j = 0; j < 54; j++) state[j] = true;
        } else {
            for (var j = 0; j < 54; j++) state[j] = mask54[j] !== 'x';
        }
        draw();
    }

    function getMask() {
        var str = '';
        for (var j = 0; j < 54; j++) str += state[j] ? '.' : 'x';
        return str;
    }

    function ensureModal() {
        if (document.getElementById('maskEditorModal')) return;
        var html =
            '<div class="modal fade" id="maskEditorModal" tabindex="-1" aria-hidden="true">' +
            '<div class="modal-dialog modal-dialog-centered">' +
            '<div class="modal-content">' +
            '<div class="modal-header">' +
            '<h5 class="modal-title" id="maskEditorModalLabel">Edit Mask</h5>' +
            '<button type="button" class="btn-close" data-bs-dismiss="modal"></button>' +
            '</div>' +
            '<div class="modal-body text-center">' +
            '<div class="d-flex justify-content-center mb-3">' +
            '<div class="btn-group btn-group-sm">' +
            '<button type="button" class="btn btn-outline-primary active" id="maskModePiece">Piece</button>' +
            '<button type="button" class="btn btn-outline-primary" id="maskModeSticker">Sticker</button>' +
            '</div></div>' +
            '<div style="display:flex;justify-content:center;"><canvas id="maskEditorCanvas" style="max-width:100%;cursor:pointer;"></canvas></div>' +
            '<div class="d-flex justify-content-center gap-2 mt-3">' +
            '<button type="button" class="btn btn-outline-secondary btn-sm" id="maskShowAllBtn">Show All</button>' +
            '<button type="button" class="btn btn-outline-secondary btn-sm" id="maskMaskAllBtn">Mask All</button>' +
            '<button type="button" class="btn btn-outline-secondary btn-sm" id="maskInvertBtn">Invert</button>' +
            '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="btn btn-primary" data-bs-dismiss="modal">Done</button>' +
            '</div></div></div></div>';
        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('maskModePiece').addEventListener('click', function() {
            mode = 'piece'; this.classList.add('active'); document.getElementById('maskModeSticker').classList.remove('active');
        });
        document.getElementById('maskModeSticker').addEventListener('click', function() {
            mode = 'sticker'; this.classList.add('active'); document.getElementById('maskModePiece').classList.remove('active');
        });
        document.getElementById('maskShowAllBtn').addEventListener('click', function() {
            for (var j = 0; j < 54; j++) if (!CENTERS[j]) state[j] = true;
            draw(); syncToInput();
        });
        document.getElementById('maskMaskAllBtn').addEventListener('click', function() {
            for (var j = 0; j < 54; j++) if (!CENTERS[j]) state[j] = false;
            draw(); syncToInput();
        });
        document.getElementById('maskInvertBtn').addEventListener('click', function() {
            for (var j = 0; j < 54; j++) state[j] = !state[j];
            draw(); syncToInput();
        });
    }

    function openModal(inputId, label) {
        ensureModal();
        targetInputId = inputId;

        document.getElementById('maskEditorModalLabel').textContent = label || 'Edit Mask';

        // Init canvas once
        if (!canvas) {
            canvas = document.getElementById('maskEditorCanvas');
            canvas.width = CANVAS_W;
            canvas.height = CANVAS_H;
            ctx = canvas.getContext('2d');
            canvas.addEventListener('click', handleCanvasClick);
            buildStickers();
        }

        // Load mask from input
        var input = document.getElementById(inputId);
        var mask = (input && input.value && input.value.length === 54) ? input.value : (localStorage.getItem(inputId) || '');
        setMask(mask);

        // Reset mode
        mode = 'piece';
        var pb = document.getElementById('maskModePiece');
        var sb = document.getElementById('maskModeSticker');
        if (pb) pb.classList.add('active');
        if (sb) sb.classList.remove('active');

        var modalEl = document.getElementById('maskEditorModal');
        if (modalEl && window.bootstrap) {
            if (!modalInstance) modalInstance = new bootstrap.Modal(modalEl);
            modalInstance.show();
        }
    }

    window.MaskEditor = { openModal: openModal, setMask: setMask, getMask: getMask };
})();
