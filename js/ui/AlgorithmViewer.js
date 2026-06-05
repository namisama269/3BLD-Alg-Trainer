// AlgorithmViewer.js - Browse algorithms grouped by subset with cube preview
// Depends on: AlgorithmList (parseSubsets), CubeState (RubiksCube), visualCube (VisualCube), helpers (isCommutator, commToMoves)

(function() {
    'use strict';

    let previewVC = null;
    let previewCube = null;
    let previewContainer = null;
    let selectedAlgEl = null;

    function init() {
        const browseBtn = document.getElementById('algViewerBtn');
        if (browseBtn) {
            browseBtn.addEventListener('click', open);
        }

        const modal = document.getElementById('algViewerModal');
        if (modal) {
            modal.addEventListener('shown.bs.modal', function() {
                if (!previewContainer) {
                    previewContainer = document.getElementById('algViewerPreview');
                }
                if (!previewCube) {
                    previewCube = new RubiksCube();
                }
                syncFromMainVC();
                refreshList();
            });
        }
    }

    /**
     * Sync all visual properties from the main VisualCube instance.
     * With SVG, we use the same dimensions as the main vc — viewBox handles scaling.
     */
    function syncFromMainVC() {
        const src = window.vc;
        if (!src) return;

        if (!previewVC) {
            previewVC = new VisualCube(
                src.width, src.height, src.scale,
                src.thetaX, src.thetaY, src.thetaZ,
                src.cubeSize, src.gapSize, src.edgeGapRatio
            );
        } else {
            previewVC.scale = src.scale;
            previewVC.thetaX = src.thetaX;
            previewVC.thetaY = src.thetaY;
            previewVC.thetaZ = src.thetaZ;
            previewVC.gapSize = src.gapSize;
            previewVC.edgeGapRatio = src.edgeGapRatio;
            previewVC.faceStickers = VisualCube.getFaceStickers(src.cubeSize, src.gapSize, src.edgeGapRatio);
        }

        previewVC.showBaseColor = src.showBaseColor;
        previewVC.baseColor = src.baseColor;
        previewVC.stickerBorderColor = src.stickerBorderColor;
        previewVC.stickerBorderShade = src.stickerBorderShade;
        previewVC.stickerBorderWidth = src.stickerBorderWidth;
        previewVC.debugMode = false;

        previewVC.stickerColors = {};
        for (var key in src.stickerColors) {
            previewVC.stickerColors[key] = src.stickerColors[key];
        }
    }

    function open() {
        const modal = document.getElementById('algViewerModal');
        if (modal && window.bootstrap) {
            const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
            bsModal.show();
        }
    }

    let cachedSubsets = [];
    let activeSubsetIdx = 0;

    function refreshList() {
        const textarea = document.getElementById('userDefinedAlgs');
        if (!textarea) return;

        const { subsets } = AlgorithmList.parseSubsets(textarea.value);
        cachedSubsets = subsets;
        activeSubsetIdx = 0;

        renderSubsetSelector(subsets);

        if (subsets.length === 0 || (subsets.length === 1 && subsets[0].algs.length === 0)) {
            var list = document.getElementById('algViewerList');
            if (list) list.innerHTML = '<p class="text-muted text-center py-4">No algorithms found. Add some to the textarea first.</p>';
            var sel = document.getElementById('algViewerSubsetSelect');
            if (sel) sel.style.display = 'none';
        } else {
            renderAlgsForSubset(0);
        }

        clearPreview();
    }

    function renderSubsetSelector(subsets) {
        const select = document.getElementById('algViewerSubsetSelect');
        if (!select) return;

        select.innerHTML = '';

        if (subsets.length <= 1 && subsets[0] && subsets[0].name === 'Uncategorized') {
            // Single unnamed group — hide the selector
            select.style.display = 'none';
            return;
        }

        select.style.display = '';
        subsets.forEach(function(subset, idx) {
            var opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = subset.name + ' (' + subset.algs.length + ')';
            select.appendChild(opt);
        });

        select.value = 0;
        select.onchange = function() {
            activeSubsetIdx = parseInt(select.value, 10);
            renderAlgsForSubset(activeSubsetIdx);
            clearPreview();
        };
    }

    function renderAlgsForSubset(subsetIdx) {
        const container = document.getElementById('algViewerList');
        if (!container) return;
        container.innerHTML = '';
        selectedAlgEl = null;

        var subset = cachedSubsets[subsetIdx];
        if (!subset) return;

        var list = document.createElement('div');
        list.className = 'list-group';

        subset.algs.forEach(function(algStr, idx) {
            var item = document.createElement('div');
            item.className = 'list-group-item list-group-item-action';
            item.style.cssText = 'cursor:pointer; font-family:"Roboto Mono",monospace; font-size:0.82rem; display:flex; align-items:center; gap:8px; padding:6px 10px;';

            var num = document.createElement('span');
            num.textContent = (idx + 1) + '.';
            num.style.cssText = 'opacity:0.45; min-width:2.2em; text-align:right; font-size:0.78rem; flex-shrink:0;';

            var text = document.createElement('span');
            var displayAlg = algStr.split('!')[0].trim();
            text.textContent = displayAlg;
            text.style.cssText = 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';

            item.appendChild(num);
            item.appendChild(text);
            item.title = algStr;

            item.addEventListener('click', function() {
                if (selectedAlgEl) {
                    selectedAlgEl.classList.remove('active');
                }
                item.classList.add('active');
                selectedAlgEl = item;
                selectAlg(displayAlg);
            });

            list.appendChild(item);
        });

        container.appendChild(list);
    }

    function selectAlg(algString) {
        if (!previewCube || !previewVC || !previewCtx) return;

        // Expand commutator if needed
        let moves = algString;
        if (window.isCommutator && isCommutator(algString)) {
            moves = commToMoves(algString);
        }

        // The algorithm is the solution — invert it to set up the case
        if (window.alg && window.alg.cube && window.alg.cube.invert) {
            try {
                moves = alg.cube.invert(moves);
            } catch (e) {
                moves = invertMoves(moves);
            }
        } else if (window.invertMoves) {
            moves = invertMoves(moves);
        }

        // Build the cube state the same way the trainer does:
        // 1. Reset to solved
        // 2. Apply preorientation (colourneutrality1)
        // 3. Reset mask so mask indices match the preoriented solved state
        // 4. Apply the inverse algorithm as the scramble
        previewCube.resetCube();

        // Apply preorientation from colourneutrality1 setting
        var cn1El = document.getElementById('colourneutrality1');
        var cn1 = cn1El ? cn1El.value : (localStorage.getItem('colourneutrality1') || '');
        if (cn1 && cn1.trim()) {
            previewCube.doAlgorithm(cn1.trim());
        }

        // Reset mask after preorientation (matches trainer behavior)
        previewCube.resetMask();

        // Apply the algorithm
        previewCube.doAlgorithm(moves);

        // Get the cube string and apply mask if configured
        var useMaskEl = document.getElementById('useMask');
        var useMask = useMaskEl ? useMaskEl.checked : true;
        var initialMaskEl = document.getElementById('initialMask');
        var initialMask = (useMask && initialMaskEl) ? initialMaskEl.value : '';
        var cubeStr;
        if (initialMask && initialMask.length === 54) {
            cubeStr = previewCube.toInitialMaskedString(initialMask);
        } else {
            cubeStr = previewCube.toString();
        }

        // Apply final mask
        var finalMaskEl = document.getElementById('finalMask');
        var finalMask = (useMask && finalMaskEl) ? finalMaskEl.value : '';
        if (finalMask && finalMask.length === 54) {
            for (var k = 0; k < 54; k++) {
                if (finalMask[k] === 'x') {
                    cubeStr = cubeStr.substring(0, k) + 'x' + cubeStr.substring(k + 1);
                }
            }
        }

        previewVC.cubeString = cubeStr;
        if (previewContainer) {
            previewVC.drawSVG(previewContainer);
        }

        // Update the label
        const label = document.getElementById('algViewerSelectedAlg');
        if (label) {
            label.textContent = algString;
        }
    }

    function clearPreview() {
        if (previewContainer) {
            previewContainer.innerHTML = '';
        }
        const label = document.getElementById('algViewerSelectedAlg');
        if (label) {
            label.textContent = 'Select an algorithm to preview';
        }
    }

    // Export
    window.AlgorithmViewer = {
        init: init,
        open: open
    };
})();
