# Border Smoothness Fix

## The Problem

At small cube sizes, sticker borders appear rough and jagged instead of smooth. This is caused by **aliasing** - a common rendering issue when drawing lines at sub-pixel widths or at angles.

### Root Causes

1. **Fixed line width** - The original code used a hardcoded `lineWidth = 2.5` that didn't scale well at small sizes
2. **No anti-aliasing controls** - Canvas stroke rendering used default settings without optimization
3. **Sharp corners** - Default `lineJoin` and `lineCap` settings created harsh corner transitions

## The Solution

### 1. Configurable Border Width

Added `stickerBorderWidth` property to the VisualCube class:

```javascript
this.stickerBorderWidth = 2.5; // Configurable border width
```

This allows users to adjust the border width based on their needs:
- **Smaller values (0.5-1.5)**: Better for small cube sizes, produces smoother lines
- **Larger values (2.5-5)**: Better for large cube sizes, more visible borders

### 2. Canvas Anti-Aliasing Settings

Added two critical canvas context properties when drawing borders:

```javascript
ctx.lineJoin = 'round'; // Smooth corners
ctx.lineCap = 'round';  // Smooth line ends
```

**What these do:**
- `lineJoin: 'round'` - Creates smooth, rounded corners where border lines meet (vs sharp "miter" joints)
- `lineCap: 'round'` - Rounds the ends of lines for smoother appearance

### 3. New UI Control

Added a "Border Width" input in the settings panel:
- **Range**: 0.5 to 10
- **Step**: 0.5
- **Default**: 2.5
- **Hint**: "Lower values for smoother lines at small sizes"

## Usage Recommendations

### For Small Cubes (Scale 200-300)
- **Border Width**: 0.5 - 1.5
- This produces the smoothest lines with minimal aliasing

### For Medium Cubes (Scale 300-450)
- **Border Width**: 1.5 - 2.5
- Balanced between visibility and smoothness

### For Large Cubes (Scale 450-600)
- **Border Width**: 2.5 - 5
- Thicker borders are more visible and still smooth

## Technical Details

### Canvas Anti-Aliasing

Modern browsers apply anti-aliasing to canvas strokes automatically, but the quality depends on:
1. **Line width** - Thinner lines at small sizes have fewer pixels to anti-alias
2. **Line joins** - Sharp corners (`miter`) create more aliasing artifacts than rounded
3. **Coordinate precision** - Sub-pixel rendering can cause inconsistent anti-aliasing

### Why Round Joins Help

When two lines meet at a sharp angle (like the corners of a sticker):
- **Miter join** (default): Extends the outer edges to form a sharp point - can look jagged
- **Round join**: Creates a smooth circular arc at the junction - significantly reduces aliasing
- **Bevel join**: Cuts off the corner at an angle - better than miter but not as smooth as round

## Files Modified

### [js/visualCube.js](js/visualCube.js)
- Added `stickerBorderWidth` property (line 25)
- Updated stroke rendering to use configurable width (line 106)
- Added `lineJoin` and `lineCap` for smoother rendering (lines 107-108)

### [index-material.html](index-material.html)
- Added Border Width input control (lines 187-191)
- Includes helpful hint text for users

### [js/visualCubeSettings.js](js/visualCubeSettings.js)
- Added `borderWidth: 2.5` to default settings (line 19)
- Apply border width to VisualCube instance (line 84)
- Update UI to reflect border width setting (lines 165-168)
- Event listener for border width changes (lines 322-330)

## Additional Improvements

If you want even smoother rendering, consider:

1. **Higher DPI rendering**: Render canvas at 2x size then scale down via CSS
2. **WebGL renderer**: Use WebGL instead of Canvas 2D for better anti-aliasing
3. **SVG rendering**: Vector graphics scale infinitely without aliasing
4. **Larger base canvas**: Render at higher resolution, downscale with CSS

## Testing

Try these combinations to see the difference:

**Rough borders (before fix):**
- Scale: 250
- Border Width: 2.5
- Notice: Jagged, pixelated edges

**Smooth borders (after fix):**
- Scale: 250
- Border Width: 1.0
- Notice: Much smoother, cleaner appearance

**High quality (recommended):**
- Scale: 400
- Border Width: 1.5
- Auto Border: Enabled
- Border Shade: 0.85
