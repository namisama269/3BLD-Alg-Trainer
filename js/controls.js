class KeyCombo {
    constructor(code, modifiers={}) {
        this.shift = modifiers.shift || false;
        this.ctrl = modifiers.ctrl || false;
        this.alt = modifiers.alt || false;
        this.meta = modifiers.meta || false;

        this.code = code;
    }

    matches(evt) {
        // Don't match if meta key is pressed (unless explicitly required)
        // This allows Cmd+R (refresh), Cmd+C (copy), etc. to work on Mac
        if (evt.metaKey && !this.meta) {
            return false;
        }
        return this.code == evt.code &&
               evt.shiftKey == this.shift &&
               evt.altKey == this.alt &&
               evt.ctrlKey == this.ctrl;
    }

    toString() {
        let out = this.code.replace("Key", "");
        if (this.shift) {
            out = "shift-" + out;
        }
        if (this.alt) {
            out = "alt-" + out;
        }
        if (this.ctrl) {
            out = "ctrl-" + out;
        }
        if (this.meta) {
            out = "meta-" + out;
        }
        return out;
    }
}

function keyEventToKeyCombo(evt, force) {
    let code = evt.code;
    if (evt.key === "Shift" || evt.key === "Control" || evt.key === "Meta" || evt.key == "Alt") {
        if (force) {
            code = "";
        } else {
            return false;
        }
    }
    return new KeyCombo(code, {"shift": evt.shiftKey, "alt": evt.altKey, "ctrl": evt.ctrlKey, "meta": evt.metaKey});
}

class Listener {
    constructor() {
        let self = this;
        this.combos = []; // [[combo, fn]]
        document.body.addEventListener("keydown", e => self.keydown(e));
    }

    keydown(e) {
        // Ignore events from input fields and textareas
        const tagName = e.target.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
            return;
        }
        // Only handle keys when on the trainer screen
        if (window.UIController && !window.UIController.isTrainerScreen()) {
            return;
        }
        for (let [combo, fn] of this.combos) {
            if (combo.matches(e)) {
                fn(e);
                e.preventDefault();
                return true;
            }
        }
        return false;
    }

    register(combo, action) {
        this.combos.push([combo, action]);
    }

    reset() {
        this.combos = [];
    }
}

// Ensure global availability
window.KeyCombo = KeyCombo;
window.Listener = Listener;
window.keyEventToKeyCombo = keyEventToKeyCombo;
