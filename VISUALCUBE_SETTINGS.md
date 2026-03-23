# VisualCube Settings Integration

This document describes the VisualCube settings UI that has been integrated into the Alg Trainer application.

## Files Modified/Created

### New Files
- **`js/visualCubeSettings.js`** - Complete settings management system with localStorage persistence

### Modified Files
- **`index-material.html`** - Added comprehensive settings UI panel
- **`js/visualCube.deprecated.js`** - Renamed from visualCube.js (old version)
- **`js/visualCube.js`** - New VisualCube implementation

## Features Implemented

### 1. Cube Measurements & Geometry

#### **Scale** (200-600, default: 400)
- Controls the overall rendering size of the cube
- Larger values = bigger cube visualization
- Real-time slider with live value display

#### **Gap Size** (0-0.2, default: 0.08)
- Spacing between individual stickers
- Smaller values = tighter stickers
- Precision control with 0.01 increments

#### **Edge Gap Ratio** (0-1, default: 0.65)
- Ratio of perimeter gaps to internal gaps
- 0 = no edge gaps, 1 = full edge gaps
- Affects the visual appearance of the cube edges

### 2. Rotation Controls

#### **Rotation X** (-180° to 180°, default: -23°)
- Pitch rotation (vertical tilt)
- Stored internally as radians
- UI displays in degrees for user convenience

#### **Rotation Y** (-180° to 180°, default: -34°)
- Yaw rotation (horizontal spin)
- Affects left-right viewing angle

#### **Rotation Z** (-180° to 180°, default: 0°)
- Roll rotation (clockwise/counter-clockwise tilt)
- Usually kept at 0 for standard viewing

### 3. Colors

#### **Face Colors**
Individual color pickers for each face:
- **U (Up)** - White (#ffffff)
- **D (Down)** - Yellow (#f0ff00)
- **R (Right)** - Red (#e8120a)
- **L (Left)** - Orange (#fb8c00)
- **F (Front)** - Green (#66ff33)
- **B (Back)** - Blue (#2055ff)

#### **Base Color** (default: Black #000000)
- Color of the cube body/plastic
- Toggle "Show Base" to show/hide the base color
- Affects the visible cube structure between stickers

#### **Border Color** (default: Black #000000)
- Color of sticker borders
- **Auto mode** (default: enabled): Automatically calculates border color based on base color
- **Manual mode**: Use custom color picker

#### **Border Shade** (0-1, default: 0.85)
- Controls the darkness/lightness of automatic borders
- Only applies when "Auto" border is enabled
- Lower values = darker borders

### 4. Debug Features

#### **Debug Mode**
- When enabled, displays sticker rendering order
- Shows numbered labels on each sticker
- Useful for development and understanding the rendering pipeline

#### **Debug Text Color** (Dark/Light)
- Only visible when Debug Mode is enabled
- Choose between dark or light text for the debug labels
- Ensures visibility against different sticker colors

## Settings Panel UI

The settings are organized in a collapsible Bootstrap card:
- **Header**: "Cube Visualization Settings" with Toggle button
- **Collapsible panel**: All controls hidden by default to save space
- **Responsive design**: Works on mobile and desktop
- **Real-time updates**: All changes apply immediately to the cube
- **Reset button**: Restores all settings to defaults

## Technical Implementation

### localStorage Persistence
All settings are automatically saved to browser localStorage with the key `visualCubeSettings`. Settings persist across:
- Page refreshes
- Browser restarts
- Different sessions

### Settings Structure
```javascript
{
    scale: 400,
    gapSize: 0.08,
    edgeGapRatio: 0.65,
    thetaX: -0.4,        // Radians
    thetaY: -0.6,        // Radians
    thetaZ: 0,           // Radians
    baseColor: '#000000',
    showBaseColor: true,
    borderColor: '#000000',
    autoBorderColor: true,
    borderShade: 0.85,
    debugMode: false,
    debugTextColor: 'dark',
    colorU: '#ffffff',
    colorD: '#f0ff00',
    colorR: '#e8120a',
    colorL: '#fb8c00',
    colorF: '#66ff33',
    colorB: '#2055ff'
}
```

### Integration Points

1. **VisualCube Instance** (`window.vc`)
   - Settings are applied directly to the global VisualCube instance
   - Properties updated: scale, gapSize, edgeGapRatio, rotation angles, colors, etc.

2. **updateVirtualCube Function**
   - Called automatically after settings changes
   - Redraws the cube with new parameters

3. **Face Stickers Recalculation**
   - Automatically rebuilds sticker geometry when gap settings change
   - Uses `VisualCube.getFaceStickers()` method

## Usage

### For Users
1. Open the "Cube Visualization Settings" panel
2. Click the "Toggle" button to show/hide settings
3. Adjust any slider or color picker in real-time
4. Changes apply immediately to the cube
5. Click "Reset to Defaults" to restore original settings

### For Developers
```javascript
// Access settings programmatically
const settings = VisualCubeSettings.loadSettings();

// Apply custom settings
VisualCubeSettings.applySettings({
    scale: 500,
    debugMode: true,
    colorU: '#ff0000'  // Red top face
});

// Save settings
VisualCubeSettings.saveSettings(customSettings);
```

## Browser Compatibility
- All modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES6+ JavaScript support
- Bootstrap 5.3+ for UI components
- localStorage API for persistence

## Future Enhancements
Potential additions:
- Export/import settings as JSON file
- Preset configurations
- Animation speed controls
- Custom sticker shapes
- Face visibility toggles (show/hide specific faces)
- Background color customization
