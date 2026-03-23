(function (global) {
class RubiksCube {
  constructor(n = 3) {
    if (!Number.isInteger(n) || n < 2) {
      throw new Error("n must be an integer ≥ 2");
    }
    this.n = n;
    const order = ["U", "R", "F", "D", "L", "B"];
    let idx = 0;
    this.faces = {};
    for (const face of order) {
      this.faces[face] = RubiksCube._filled(n, () => ({ idx: idx++, color: face }));
    }
  }

  clone() {
    const c = new RubiksCube(this.n);
    c.faces = RubiksCube._deepCopy(this.faces);
    return c;
  }

  reset() {
    this.constructor.call(this, this.n);
  }

  resetMaskIndices() {
    const order = ["U", "R", "F", "D", "L", "B"];
    let idx = 0;
    for (const face of order) {
      const M = this.faces[face];
      for (let r = 0; r < this.n; r++) {
        for (let c = 0; c < this.n; c++) {
          M[r][c].idx = idx++;
        }
      }
    }
  }

  applyMoves(seq) {
    if (!seq) return this;
    const tokens = RubiksCube._tokenize(seq);
    for (const t of tokens) this._applyMoveToken(t);
    return this;
  }

  toCubeString(maskString) {
    const order = ["U", "R", "F", "D", "L", "B"];
    let out = "";
    const mask = (typeof maskString === "string" && maskString.length === order.length * this.n * this.n)
      ? maskString.toLowerCase()
      : null;
    for (const f of order) {
      const M = this.faces[f];
      for (let r = 0; r < this.n; r++) {
        for (let c = 0; c < this.n; c++) {
          const sticker = M[r][c];
          const masked = mask && mask[sticker.idx] === "x";
          out += masked ? "x" : sticker.color;
        }
      }
    }
    return out;
  }

  _applyMoveToken(tok) {
    let { prefixNum, letter, suffix, wide } = tok;

    const netTurns = RubiksCube._normalizeTurns(suffix);
    if (netTurns === 0) {
      return;
    }

    let dir = 1;
    let reps = 1;
    if (netTurns === 2) {
      reps = 2;
    } else if (netTurns === 3) {
      dir = -1;
    }

    if (/[MES]/.test(letter) && letter === letter.toUpperCase()) {
      const k = Math.floor((this.n + 1) / 2);
      if (letter === "M") {
        this._rotateSliceSeries("L", k, 1, RubiksCube._adjustDir("L", dir), reps, dir);
        return;
      } else if (letter === "E") {
        this._rotateSliceSeries("D", k, 1, RubiksCube._adjustDir("D", dir), reps, dir);
        return;
      } else if (letter === "S") {
      this._rotateSliceSeries("F", k, 1, RubiksCube._adjustDir("F", dir), reps, dir);
      return;
    }
  }

    if (/[mes]/.test(letter) && letter === letter.toLowerCase()) {
      if (prefixNum != null && prefixNum !== 1) {
        throw new Error(`Lowercase ${letter} does not support numeric prefixes`);
      }
      const comboMap = {
        m: ["x'", "L'", "R"],
        e: ["y'", "D'", "U"],
        s: ["z", "F'", "B"],
      };
      const baseSeq = comboMap[letter];
      if (!baseSeq) {
        throw new Error(`Unsupported move token: ${tok.raw}`);
      }
      const turns = netTurns;
      if (turns === 1) {
        this.applyMoves(baseSeq.join(" "));
      } else if (turns === 2) {
        this.applyMoves(baseSeq.join(" "));
        this.applyMoves(baseSeq.join(" "));
      } else if (turns === 3) {
        const inverted = RubiksCube._invertMoveSequence(baseSeq);
        this.applyMoves(inverted.join(" "));
      }
      return;
    }

    const isLowerWide = /[urfldb]/i.test(letter) && letter === letter.toLowerCase() && !/[mes]/.test(letter);
    const isWideMove = wide || isLowerWide;

    if (isWideMove) {
      const face = letter.toUpperCase();
      const width = prefixNum == null ? 2 : RubiksCube._clampValue(prefixNum, 1, this.n);
      this._rotateSliceSeries(face, 1, width, RubiksCube._adjustDir(face, dir), reps, dir);
      return;
    }

    if (/[URFDLB]/.test(letter) && letter === letter.toUpperCase()) {
      const face = letter;
      const sliceIdx = prefixNum == null ? 1 : RubiksCube._clampValue(prefixNum, 1, this.n);
      this._rotateSliceSeries(face, sliceIdx, 1, RubiksCube._adjustDir(face, dir), reps, dir);
      return;
    }

    if (/[xyzXYZ]/.test(letter)) {
      const norm = letter.toLowerCase();
      const rotationFaces = { x: "R", y: "U", z: "F" };
      const face = rotationFaces[norm];
      if (!face) throw new Error(`Unsupported rotation: ${letter}`);
      this._rotateSliceSeries(face, 1, this.n, RubiksCube._adjustDir(face, dir), reps, dir);
      return;
    }

    throw new Error(`Unsupported move token: ${tok.raw}`);
  }

  _rotateSliceSeries(face, startSlice, width, dir, reps, faceRotationDir = dir) {
    const lastSlice = startSlice + width - 1;
    const includesNearFace = startSlice === 1;
    const includesFarFace = lastSlice === this.n;
    const oppositeFace = RubiksCube._oppositeFace(face);

    for (let r = 0; r < reps; r++) {
      for (let w = 0; w < width; w++) {
        this._rotateSingleSliceOn(this.faces, face, startSlice + w, dir);
      }
      if (includesNearFace) {
        this._rotateFaceMatrixOn(this.faces, face, faceRotationDir);
      }
      if (includesFarFace && oppositeFace) {
        this._rotateFaceMatrixOn(this.faces, oppositeFace, -faceRotationDir);
      }
    }
  }

  _rotateSingleSliceOn(target, face, slice, dir) {
    const n = this.n;
    const s = slice;

    const getRow = (F, r) => target[F][r].slice();
    const setRow = (F, r, arr) => {
      target[F][r] = arr.slice();
    };
    const getCol = (F, c) => target[F].map((row) => row[c]);
    const setCol = (F, c, arr) => {
      for (let i = 0; i < n; i++) target[F][i][c] = arr[i];
    };
    const rev = (arr) => arr.slice().reverse();

    switch (face) {
      case "U": {
        const r = s - 1;
        let F = getRow("F", r);
        let R = getRow("R", r);
        let B = getRow("B", r);
        let L = getRow("L", r);
        if (dir === 1) {
          setRow("F", r, R);
          setRow("L", r, F);
          setRow("B", r, L);
          setRow("R", r, B);
        } else {
          setRow("F", r, L);
          setRow("R", r, F);
          setRow("B", r, R);
          setRow("L", r, B);
        }
        break;
      }
      case "D": {
        const r = n - s;
        let F = getRow("F", r);
        let R = getRow("R", r);
        let B = getRow("B", r);
        let L = getRow("L", r);
        if (dir === 1) {
          setRow("F", r, L);
          setRow("R", r, F);
          setRow("B", r, R);
          setRow("L", r, B);
        } else {
          setRow("F", r, R);
          setRow("L", r, F);
          setRow("B", r, L);
          setRow("R", r, B);
        }
        break;
      }
      case "R": {
        const c = n - s;
        let Uc = getCol("U", c);
        let Fc = getCol("F", c);
        let Dc = getCol("D", c);
        let Bc = getCol("B", n - 1 - c);
        Bc = rev(Bc);
        if (dir === 1) {
          setCol("F", c, Uc);
          setCol("D", c, Fc);
          setCol("B", n - 1 - c, rev(Dc));
          setCol("U", c, Bc);
        } else {
          setCol("B", n - 1 - c, rev(Uc));
          setCol("D", c, Bc);
          setCol("F", c, Dc);
          setCol("U", c, Fc);
        }
        break;
      }
      case "L": {
        const c = s - 1;
        let Uc = getCol("U", c);
        let Fc = getCol("F", c);
        let Dc = getCol("D", c);
        let Bc = getCol("B", n - 1 - c);
        Bc = rev(Bc);
        if (dir === 1) {
          setCol("U", c, Bc);
          setCol("F", c, Uc);
          setCol("D", c, Fc);
          setCol("B", n - 1 - c, rev(Dc));
        } else {
          setCol("B", n - 1 - c, rev(Uc));
          setCol("D", c, Bc);
          setCol("F", c, Dc);
          setCol("U", c, Fc);
        }
        break;
      }
      case "F": {
        const rU = n - s;
        const cR = s - 1;
        const rD = s - 1;
        const cL = n - s;
        let Urow = getRow("U", rU);
        let Rcol = getCol("R", cR);
        let Drow = getRow("D", rD);
        let Lcol = getCol("L", cL);

        if (dir === 1) {
          setCol("R", cR, Urow);
          setRow("D", rD, rev(Rcol));
          setCol("L", cL, Drow);
          setRow("U", rU, rev(Lcol));
        } else {
          setRow("U", rU, Rcol);
          setCol("R", cR, rev(Drow));
          setRow("D", rD, Lcol);
          setCol("L", cL, rev(Urow));
        }
        break;
      }
      case "B": {
        const rU = s - 1;
        const cR = n - s;
        const rD = n - s;
        const cL = s - 1;
        let Urow = getRow("U", rU);
        let Rcol = getCol("R", cR);
        let Drow = getRow("D", rD);
        let Lcol = getCol("L", cL);

        if (dir === 1) {
          setCol("R", cR, rev(Drow));
          setRow("D", rD, Lcol);
          setCol("L", cL, rev(Urow));
          setRow("U", rU, Rcol);
        } else {
          setRow("U", rU, rev(Lcol));
          setCol("L", cL, Drow);
          setRow("D", rD, rev(Rcol));
          setCol("R", cR, Urow);
        }
        break;
      }
      default:
        throw new Error(`Unknown face ${face}`);
    }
  }

  _rotateFaceMatrixOn(target, face, dir) {
    const M = target[face];
    const n = this.n;
    if (dir === 1) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const tmp = M[i][j];
          M[i][j] = M[j][i];
          M[j][i] = tmp;
        }
      }
      for (let i = 0; i < n; i++) M[i].reverse();
    } else {
      for (let i = 0; i < n; i++) M[i].reverse();
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const tmp = M[i][j];
          M[i][j] = M[j][i];
          M[j][i] = tmp;
        }
      }
    }
  }

  static _filled(n, factory) {
    let supplier = factory;
    if (typeof factory !== "function") {
      supplier = () => ({ idx: 0, color: factory });
    }
    const out = [];
    for (let r = 0; r < n; r++) {
      const row = [];
      for (let c = 0; c < n; c++) {
        row.push(supplier());
      }
      out.push(row);
    }
    return out;
  }

  static _deepCopy(faces) {
    const out = {};
    for (const k of Object.keys(faces)) {
      out[k] = faces[k].map((row) =>
        row.map((cell) => ({ idx: cell.idx, color: cell.color }))
      );
    }
    return out;
  }

  static _tokenize(seq) {
    if (!seq) return [];
const rx = /^(\d+)?([URFDLBurfdlbmesMESxyzXYZ])([wW])?((\d+)?'?)?$/;
    const tokens = [];
    let depth = 0;
    seq
      .split(/\r?\n/)
      .map((line) => {
        const commentIndex = line.indexOf("//");
        return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
      })
      .forEach((line) => {
        if (!line.trim()) return;
        const sanitizedChars = [];
        for (const ch of line) {
          if (ch === "(") {
            depth += 1;
            sanitizedChars.push(" ");
            continue;
          }
          if (ch === ")") {
            depth -= 1;
            if (depth < 0) {
              throw new Error("Unmatched closing parenthesis");
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
          .forEach((part) => {
            const match = part.match(rx);
            if (!match) {
              throw new Error(`Invalid move token: ${part}`);
            }
            const [, num, letter, wSuffix, suf] = match;
            tokens.push({
              raw: part,
              prefixNum: num ? parseInt(num, 10) : null,
              letter,
              suffix: suf || null,
              wide: Boolean(wSuffix),
            });
          });
      });
    if (depth !== 0) {
      throw new Error("Unmatched opening parenthesis");
    }
    return tokens;
  }

  static _invertMoveSequence(sequence) {
    return sequence
      .slice()
      .reverse()
      .map((move) => RubiksCube._invertSingleMove(move));
  }

  static _invertSingleMove(move) {
    const tokens = RubiksCube._tokenize(move);
    if (tokens.length !== 1) {
      throw new Error(`Cannot invert move: ${move}`);
    }
    const { prefixNum, letter, suffix, wide } = tokens[0];
    const netTurns = RubiksCube._normalizeTurns(suffix);
    if (netTurns === 0) {
      return move;
    }
    const inverseTurns = (4 - netTurns) % 4;
    const suffixPart = RubiksCube._suffixFromTurns(inverseTurns);
    const numPart = prefixNum != null ? String(prefixNum) : "";
    const widePart = wide ? "w" : "";
    return `${numPart}${letter}${widePart}${suffixPart}`;
  }

  static _adjustDir(face, dir) {
    const flipped = new Set(["R", "M", "E"]);
    return flipped.has(face) ? -dir : dir;
  }

  static _oppositeFace(face) {
    const pairs = {
      U: "D",
      D: "U",
      R: "L",
      L: "R",
      F: "B",
      B: "F",
    };
    return pairs[face] || null;
  }

  static _normalizeTurns(suffix) {
    if (suffix == null || suffix === "") {
      return 1;
    }
    let working = suffix;
    let isPrime = false;
    if (working.endsWith("'")) {
      isPrime = true;
      working = working.slice(0, -1);
    }
    let turns;
    if (working) {
      const parsed = parseInt(working, 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        turns = 0;
      } else {
        turns = parsed % 4;
      }
    } else {
      turns = 1;
    }
    if (turns === 0) {
      return 0;
    }
    if (isPrime) {
      turns = (4 - turns) % 4;
    }
    return turns % 4;
  }

  static _suffixFromTurns(turns) {
    switch (turns) {
      case 1:
        return "";
      case 2:
        return "2";
      case 3:
        return "'";
      default:
        return "";
    }
  }
  static _clampValue(value, min, max) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return min;
    }
    return Math.min(Math.max(value, min), max);
  }
}

global.RubiksCubeNxN = RubiksCube;
})(typeof window !== "undefined" ? window : globalThis);
