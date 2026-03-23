# VisualCube.js Integration Guide

This guide provides complete instructions for integrating `visualCube.js` into your project.

## Overview

`visualCube.js` is a standalone JavaScript library that renders 3D Rubik's cube visualizations on HTML5 Canvas elements. It has zero external dependencies and works in both browser and Node.js environments.

---

## Quick Start

### 1. Copy the File

Copy `visualCube.js` into your project directory. Example locations:
- Browser projects: `/public/js/visualCube.js` or `/src/lib/visualCube.js`
- Node.js projects: `/src/visualCube.js` or `/lib/visualCube.js`

### 2. Browser Integration

```html
<!DOCTYPE html>
<html>
<head>
    <title>Rubik's Cube Visualization</title>
</head>
<body>
    <canvas id="cubeCanvas" width="800" height="800"></canvas>

    <!-- Include the library -->
    <script src="path/to/visualCube.js"></script>

    <script>
        // Get canvas context
        const canvas = document.getElementById('cubeCanvas');
        const ctx = canvas.getContext('2d');

        // Create cube instance
        const cube = new VisualCube(
            800,              // canvas width
            800,              // canvas height
            300,              // scale (size of cube)
            -0.5,             // rotation X (radians)
            0.7,              // rotation Y (radians)
            0,                // rotation Z (radians)
            3,                // cube size (3x3x3)
            0.08              // gap size between stickers
        );

        // Render the cube
        cube.drawCube(ctx);
    </script>
</body>
</html>
```

### 3. ES6 Module Integration

If using ES6 modules, modify `visualCube.js` by adding at the end:

```javascript
export default VisualCube;
```

Then import it:

```javascript
import VisualCube from './visualCube.js';

const cube = new VisualCube(800, 800, 300, -0.5, 0.7, 0, 3, 0.08);
const ctx = document.getElementById('canvas').getContext('2d');
cube.drawCube(ctx);
```

### 4. Node.js Integration

Install a canvas library first:

```bash
npm install canvas
```

Then use it:

```javascript
const { createCanvas } = require('canvas');
const VisualCube = require('./visualCube.js');

const canvas = createCanvas(800, 800);
const ctx = canvas.getContext('2d');

const cube = new VisualCube(800, 800, 300, -0.5, 0.7, 0, 3, 0.08);
cube.drawCube(ctx);

// Save to file
const fs = require('fs');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('./cube.png', buffer);
```

---

## Constructor Parameters

```javascript
new VisualCube(width, height, scale, thetaX, thetaY, thetaZ, cubeSize, gapSize, edgeGapRatio)
```

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `width` | number | Yes | Canvas width in pixels | `800` |
| `height` | number | Yes | Canvas height in pixels | `800` |
| `scale` | number | Yes | Cube scale/size (larger = bigger cube) | `300` |
| `thetaX` | number | Yes | Rotation around X-axis in radians | `-0.5` |
| `thetaY` | number | Yes | Rotation around Y-axis in radians | `0.7` |
| `thetaZ` | number | Yes | Rotation around Z-axis in radians | `0` |
| `cubeSize` | number | Yes | Cube dimensions (3 = 3x3x3, 4 = 4x4x4, etc.) | `3` |
| `gapSize` | number | Yes | Gap between stickers (0-0.2 recommended) | `0.08` |
| `edgeGapRatio` | number | No | Border gap ratio (0-1, default: 0.5) | `0.5` |

### Rotation Helper

To convert degrees to radians:
```javascript
const degrees = 45;
const radians = degrees * (Math.PI / 180);
```

Common rotations for good viewing angles:
- Standard view: `thetaX: -0.5, thetaY: 0.7, thetaZ: 0`
- Top view: `thetaX: 0, thetaY: 0, thetaZ: 0`
- Isometric: `thetaX: -0.615, thetaY: 0.785, thetaZ: 0`

---

## Core Methods

### `drawCube(ctx)`

Renders the cube to a canvas context.

```javascript
const ctx = canvas.getContext('2d');
cube.drawCube(ctx);
```

### `setCustomColors(colorMap)`

Set custom colors for specific sticker letters.

```javascript
cube.setCustomColors({
    'U': '#ffffff',  // White
    'D': '#ffff00',  // Yellow
    'R': '#ff0000',  // Red
    'L': '#ff8800',  // Orange
    'F': '#00ff00',  // Green
    'B': '#0000ff'   // Blue
});
```

---

## Configuration Properties

After creating a cube instance, you can modify these properties:

### Cube State

```javascript
// Set cube configuration (string representing all stickers)
// Format: 54 characters for 3x3 (6 faces × 9 stickers)
// Order: U, R, F, D, L, B faces
cube.cubeString = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
```

### Visual Options

```javascript
// Show/hide the base color (cube plastic)
cube.showBaseColor = true;  // default: true

// Set base color (cube body color)
cube.baseColor = "#f5f5dc";  // default: beige

// Set sticker border color
cube.stickerBorderColor = "black";  // default: black

// Auto-shade border based on base color
cube.stickerBorderColor = null;  // enables auto-shading

// Border shade factor (0-1, darker to lighter)
cube.stickerBorderShade = 0.85;  // default: 0.85

// Draw cube interior (when transparent stickers are used)
cube.drawInside = false;  // default: false

// Enable debug mode (shows sticker numbers)
cube.debugMode = false;  // default: false

// Debug text color
cube.debugTextColor = "dark";  // "dark" or "light"
```

### Face Rendering Control

```javascript
// Hide specific faces
cube.renderedFaces = {
    "U": true,   // Up face
    "D": true,   // Down face
    "R": true,   // Right face
    "L": true,   // Left face
    "F": true,   // Front face
    "B": false   // Back face (hidden)
};
```

### Sticker Colors

```javascript
// Default color scheme (can be modified)
cube.stickerColors = {
    "U": "#ffffff",  // White
    "D": "#F0FF00",  // Yellow
    "R": "#E8120A",  // Red
    "L": "#FB8C00",  // Orange
    "F": "#66FF33",  // Green
    "B": "#2055FF",  // Blue
    "z": "black",    // Black (placeholder)
    "x": "#b0b0b0",  // Masked sticker (gray)
    "_": "#f5f5dc"   // Base color
};
```

---

## Advanced Features

### 1. Cube String Format

The `cubeString` represents all stickers on the cube. Each character represents one sticker.

For a **3×3×3 cube** (54 stickers total):
- Characters 0-8: U face (top)
- Characters 9-17: R face (right)
- Characters 18-26: F face (front)
- Characters 27-35: D face (bottom)
- Characters 36-44: L face (left)
- Characters 45-53: B face (back)

```javascript
// Solved 3x3 cube
cube.cubeString = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

// 2x2 cube (24 stickers)
cube.cubeSize = 2;
cube.cubeString = "UUUURRRRRFFFFDDDDLLLLBBBB";

// 4x4 cube (96 stickers)
cube.cubeSize = 4;
cube.cubeString = "U".repeat(16) + "R".repeat(16) + "F".repeat(16) +
                  "D".repeat(16) + "L".repeat(16) + "B".repeat(16);
```

### 2. Masking Stickers

Use `'x'` or `'X'` in the cube string to mask (hide) specific stickers:

```javascript
// Hide center sticker on each face
cube.cubeString = "UUUUxUUUURRRRxRRRRFFFFxFFFFDDDDxDDDDLLLLxLLLLBBBBxBBBB";
```

### 3. Animation Example

```javascript
let rotation = 0;

function animate() {
    rotation += 0.01;

    cube.thetaY = rotation;
    cube.drawCube(ctx);

    requestAnimationFrame(animate);
}

animate();
```

### 4. Serialization

Save and restore cube state:

```javascript
// Save state
const state = cube.toJSON();
localStorage.setItem('cubeState', JSON.stringify(state));

// Restore state
const savedState = JSON.parse(localStorage.getItem('cubeState'));
const restoredCube = VisualCube.fromJSON(savedState, {
    width: 800,
    height: 800,
    scale: 300
});
```

### 5. Interactive Controls

```javascript
let isDragging = false;
let lastX, lastY;

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;

    cube.thetaY += dx * 0.01;
    cube.thetaX += dy * 0.01;

    cube.drawCube(ctx);

    lastX = e.clientX;
    lastY = e.clientY;
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});
```

---

## Static Constants

Available color constants:

```javascript
VisualCube.BLACK              // "black"
VisualCube.WHITE              // "white"
VisualCube.YELLOW             // "#F0FF00"
VisualCube.RED                // "#E8120A"
VisualCube.ORANGE             // "#FB8C00"
VisualCube.GREEN              // "#66FF33"
VisualCube.BLUE               // "#2055FF"
VisualCube.MASK_CHAR          // "x"
VisualCube.MASK_DARK_COLOR    // "#b0b0b0"
VisualCube.DEFAULT_BASE_COLOR // "#f5f5dc"
```

Face identifiers:

```javascript
VisualCube.FACE_IDS    // ["U", "D", "R", "L", "F", "B"]
VisualCube.FACE_ORDER  // ["U", "R", "F", "D", "L", "B"]
```

---

## Static Utility Methods

### `VisualCube.getDefaultCubeString(cubeSize)`

Generate a solved cube string for any size:

```javascript
const solved3x3 = VisualCube.getDefaultCubeString(3);
// Returns: "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"

const solved4x4 = VisualCube.getDefaultCubeString(4);
// Returns 96-character string
```

### `VisualCube.fromJSON(state, options)`

Create cube from saved state:

```javascript
const cube = VisualCube.fromJSON(savedState, {
    width: 800,
    height: 800,
    scale: 300,
    thetaX: -0.5,
    thetaY: 0.7,
    thetaZ: 0
});
```

### `VisualCube.shadeColor(hexColor, factor)`

Darken/lighten a color:

```javascript
const darker = VisualCube.shadeColor("#ff0000", 0.5);  // 50% darker red
const lighter = VisualCube.shadeColor("#ff0000", 1.5); // 50% lighter red
```

---

## Common Use Cases

### 1. Display Algorithm Visualization

```javascript
// Show specific algorithm result
cube.cubeString = "UUURUUUUURRRDRRRRFFFFLFFFFFDDDDDDDDLLLLLLLLLLBBBBBBBBB";
cube.drawCube(ctx);
```

### 2. Tutorial/Training Mode

```javascript
// Only show front, right, and top faces
cube.renderedFaces = {
    "U": true,
    "R": true,
    "F": true,
    "D": false,
    "L": false,
    "B": false
};
cube.drawCube(ctx);
```

### 3. Custom Color Scheme

```javascript
// Stickerless cube (transparent/black stickers)
cube.showBaseColor = true;
cube.baseColor = "#222222";  // Dark plastic
cube.stickerColors = {
    "U": "#ffffff",
    "D": "#ffd700",
    "R": "#dc143c",
    "L": "#ff6347",
    "F": "#32cd32",
    "B": "#4169e1"
};
cube.drawCube(ctx);
```

### 4. Pattern Showcase

```javascript
// Checkerboard pattern on 3x3
cube.cubeString = "UxUxUxUxURxRxRxRxRFxFxFxFxFDxDxDxDxDLxLxLxLxLBxBxBxBxB";
cube.showBaseColor = true;
cube.baseColor = "#1a1a1a";
cube.drawCube(ctx);
```

---

## Performance Considerations

1. **Canvas Size**: Larger canvases require more computation. 800×800 is a good balance.

2. **Cube Size**: Larger cubes (7×7×7+) have more stickers to render. Consider lower frame rates for animations.

3. **Redraws**: Only call `drawCube()` when needed (on state change, not every frame unless animating).

4. **Multiple Cubes**: Create multiple instances for side-by-side comparisons:

```javascript
const cube1 = new VisualCube(400, 400, 150, -0.5, 0.7, 0, 3, 0.08);
const cube2 = new VisualCube(400, 400, 150, -0.5, 0.7, 0, 3, 0.08);

cube1.drawCube(ctx1);
cube2.drawCube(ctx2);
```

---

## Troubleshooting

### Issue: Cube doesn't appear

**Check:**
- Canvas context is valid: `ctx instanceof CanvasRenderingContext2D`
- Canvas width/height match cube constructor parameters
- Scale isn't too small or too large (try 200-400)

### Issue: Cube is cut off

**Solution:**
- Reduce `scale` parameter
- Increase canvas `width` and `height`
- Ensure scale < width/3 for best fit

### Issue: Colors not showing

**Check:**
- `cubeString` contains valid face letters (U, D, R, L, F, B)
- Custom colors are valid hex/CSS colors
- `showBaseColor` is set correctly for your use case

### Issue: Animation is choppy

**Solution:**
- Use `requestAnimationFrame` instead of `setInterval`
- Reduce cube size for smoother rendering
- Clear canvas before each draw (handled automatically by `drawCube`)

---

## Examples Repository Structure

Recommended project structure:

```
your-project/
├── index.html
├── js/
│   ├── visualCube.js          # The library
│   └── app.js                 # Your application code
└── css/
    └── style.css
```

---

## Framework Integration

### React

```jsx
import { useEffect, useRef } from 'react';
import VisualCube from './visualCube';

function CubeComponent() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const cube = new VisualCube(800, 800, 300, -0.5, 0.7, 0, 3, 0.08);
        cube.drawCube(ctx);
    }, []);

    return <canvas ref={canvasRef} width={800} height={800} />;
}
```

### Vue

```vue
<template>
    <canvas ref="cubeCanvas" width="800" height="800"></canvas>
</template>

<script>
import VisualCube from './visualCube';

export default {
    mounted() {
        const ctx = this.$refs.cubeCanvas.getContext('2d');
        const cube = new VisualCube(800, 800, 300, -0.5, 0.7, 0, 3, 0.08);
        cube.drawCube(ctx);
    }
}
</script>
```

### Angular

```typescript
import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import VisualCube from './visualCube';

@Component({
    selector: 'app-cube',
    template: '<canvas #cubeCanvas width="800" height="800"></canvas>'
})
export class CubeComponent implements AfterViewInit {
    @ViewChild('cubeCanvas') canvasRef: ElementRef;

    ngAfterViewInit() {
        const canvas = this.canvasRef.nativeElement;
        const ctx = canvas.getContext('2d');
        const cube = new VisualCube(800, 800, 300, -0.5, 0.7, 0, 3, 0.08);
        cube.drawCube(ctx);
    }
}
```

---

## API Reference Summary

### Constructor
- `new VisualCube(width, height, scale, thetaX, thetaY, thetaZ, cubeSize, gapSize, edgeGapRatio?)`

### Instance Methods
- `drawCube(ctx)` - Render cube to canvas
- `setCustomColors(colorMap)` - Set custom sticker colors
- `toJSON()` - Serialize cube state

### Static Methods
- `VisualCube.fromJSON(state, options)` - Deserialize cube
- `VisualCube.getDefaultCubeString(size)` - Get solved cube string
- `VisualCube.shadeColor(hex, factor)` - Shade/tint colors

### Properties (configurable)
- `cubeString` - Cube state string
- `showBaseColor` - Show cube body
- `baseColor` - Cube body color
- `stickerBorderColor` - Border color
- `stickerBorderShade` - Border shade factor
- `debugMode` - Show debug annotations
- `renderedFaces` - Face visibility map
- `stickerColors` - Color mapping
- `thetaX`, `thetaY`, `thetaZ` - Rotation angles

---

## Support & Resources

For issues or questions:
1. Check that your canvas context is valid
2. Verify cube string length matches cube size (size² × 6)
3. Ensure rotation values are in radians, not degrees
4. Try default values first, then customize

Good luck with your integration!