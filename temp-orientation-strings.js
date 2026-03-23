// Generates 54-char cube strings for each orientation
// Based on VisualCube FACE_ORDER: ["U", "R", "F", "D", "L", "B"]

// Standard solved state (white top, green front): U=W, R=R, F=G, D=Y, L=O, B=B
// Color mapping: w=white, y=yellow, r=red, o=orange, g=green, b=blue

const ORIENTATION_MOVES = {
    "wg": "", "wr": "y", "wb": "y2", "wo": "y'",
    "yg": "z2", "yr": "x2 y", "yb": "x2", "yo": "x2 y'",
    "og": "z", "ow": "z y", "ob": "z y2", "oy": "z y'",
    "rg": "z'", "rw": "z' y'", "rb": "z' y2", "ry": "z' y",
    "gy": "x", "gr": "x y", "gw": "x y2", "go": "x y'",
    "bw": "x'", "br": "x' y", "by": "x' y2", "bo": "x' y'"
};

// For each orientation, what color is on each face? [U, R, F, D, L, B]
// Starting from wg (white top, green front): [w, r, g, y, o, b]

// Rotation effects on faces [U, R, F, D, L, B]:
// x:  [F, R, U, B, L, D] -> front goes to top, top goes to back, back goes to down, down goes to front
// x': [B, R, D, F, L, U]
// y:  [U, F, L, D, B, R] -> right goes to front, front goes to left, left goes to back, back goes to right
// y': [U, B, R, D, F, L]
// z:  [L, U, F, R, D, B] -> top goes to right, right goes to down, down goes to left, left goes to top
// z': [R, D, F, L, U, B]

function applyRotation(faces, rotation) {
    const [U, R, F, D, L, B] = faces;
    switch (rotation) {
        case 'x':  return [F, R, D, B, L, U];
        case "x'": return [B, R, U, F, L, D];
        case 'x2': return [D, R, B, U, L, F];
        case 'y':  return [U, F, L, D, B, R];
        case "y'": return [U, B, R, D, F, L];
        case 'y2': return [U, L, B, D, R, F];
        case 'z':  return [L, U, F, R, D, B];
        case "z'": return [R, D, F, L, U, B];
        case 'z2': return [D, L, F, U, R, B];
        default:   return faces;
    }
}

function applyMoves(moves) {
    // Start with solved: white top, green front
    // [U, R, F, D, L, B] = [w, r, g, y, o, b]
    let faces = ['w', 'r', 'g', 'y', 'o', 'b'];

    if (!moves || moves.trim() === '') return faces;

    const moveList = moves.trim().split(/\s+/);
    for (const move of moveList) {
        faces = applyRotation(faces, move);
    }
    return faces;
}

function facesToCubeString(faces) {
    // faces = [U, R, F, D, L, B] colors
    // Return 54-char string with 9 of each color in URFDLB order
    return faces.map(c => c.repeat(9)).join('');
}

function facesToURFDLB(faces) {
    // Return the 6 colors as URFDLB string (e.g., "wrgyob")
    return faces.join('');
}

// Generate the orientation strings
const ORIENTATION_FACE_COLORS = {};
const ORIENTATION_CUBE_STRINGS = {};

for (const [orientation, moves] of Object.entries(ORIENTATION_MOVES)) {
    const faces = applyMoves(moves);
    ORIENTATION_FACE_COLORS[orientation] = facesToURFDLB(faces);
    ORIENTATION_CUBE_STRINGS[orientation] = facesToCubeString(faces);
}

console.log("// ORIENTATION_FACE_COLORS: 6-char string showing color on each face [U,R,F,D,L,B]");
console.log("const ORIENTATION_FACE_COLORS = " + JSON.stringify(ORIENTATION_FACE_COLORS, null, 4) + ";\n");

console.log("// ORIENTATION_CUBE_STRINGS: 54-char string for VisualCube (9 chars per face, URFDLB order)");
console.log("const ORIENTATION_CUBE_STRINGS = " + JSON.stringify(ORIENTATION_CUBE_STRINGS, null, 4) + ";");

// Run it
console.log("\n--- OUTPUT ---\n");
