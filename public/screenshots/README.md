# Screenshots for PWA

This directory contains screenshots used in the PWA manifest for app store listings and installation prompts.

## Required Screenshots

The following screenshots are referenced in `manifest.json`:

### 1. game.png (1280x720)
- **Description**: Chess game in progress
- **Form Factor**: Wide (desktop/tablet)
- **Content**: Show an active chess game with pieces on the board, demonstrating the glassmorphism UI

### 2. menu.png (1280x720)
- **Description**: Main menu
- **Form Factor**: Wide (desktop/tablet)
- **Content**: Show the main menu with game mode options (Local Game, Online Game)

## Screenshot Guidelines

### For ChromeOS/Desktop (Wide)
- Resolution: 1280x720 or 1920x1080
- Aspect ratio: 16:9
- Show the full application interface
- Ensure the glassmorphism effects are visible
- Use a clean game state (not mid-animation)

### For Mobile (Narrow) - Optional
- Resolution: 750x1334 (iPhone 6/7/8) or similar
- Aspect ratio: 9:16 or similar portrait
- Show mobile-optimized layout
- Ensure touch targets are visible

## How to Create Screenshots

1. Run the application locally: `npm run dev`
2. Open in Chrome at the desired resolution
3. Use Chrome DevTools (F12) > Device Toolbar to set exact dimensions
4. Take screenshots using:
   - Windows: `Win + Shift + S`
   - macOS: `Cmd + Shift + 4`
   - Chrome DevTools: Three-dot menu > Capture screenshot

## File Format

- Format: PNG
- Color depth: 24-bit (RGB)
- No transparency needed
- Optimize file size while maintaining quality

## Adding New Screenshots

When adding new screenshots:

1. Add the image file to this directory
2. Update `manifest.json` to include the new screenshot:
```json
{
  "src": "/screenshots/your-screenshot.png",
  "sizes": "1280x720",
  "type": "image/png",
  "form_factor": "wide",
  "label": "Description of the screenshot"
}
```

## Notes

- Screenshots are displayed during PWA installation on supported platforms
- ChromeOS and Android show screenshots in the installation dialog
- Good screenshots improve user trust and installation rates