# Sound Files

This directory should contain the following sound effect files for the chess game:

## Required Sound Files

| File | Description | Suggested Duration |
|------|-------------|-------------------|
| `move.mp3` | Standard piece move sound | 0.2-0.3s |
| `capture.mp3` | Piece capture sound | 0.3-0.4s |
| `check.mp3` | Check notification sound | 0.3-0.5s |
| `castle.mp3` | Castling move sound | 0.4-0.5s |
| `promote.mp3` | Pawn promotion sound | 0.3-0.5s |
| `game-start.mp3` | Game start notification | 0.5-1.0s |
| `game-end.mp3` | Game end notification | 0.5-1.0s |
| `low-time.mp3` | Low time warning (< 30 seconds) | 0.2-0.3s |
| `illegal.mp3` | Illegal move attempt sound | 0.2-0.3s |

## Sound Specifications

- **Format**: MP3 (for broad browser compatibility)
- **Sample Rate**: 44.1 kHz
- **Bit Rate**: 128-192 kbps
- **Channels**: Mono or Stereo
- **Volume**: Normalized to -3dB to -6dB

## Recommended Sources

You can obtain free chess sound effects from:

1. **Lichess** - Open source chess sounds (MIT License)
   - https://github.com/lichess-org/lila/tree/master/public/sound

2. **Chess.com** - Standard chess sounds (check licensing)

3. **Freesound.org** - Community sound effects (various licenses)
   - Search for "chess move", "board game", etc.

4. **OpenGameArt.org** - Game sound effects (various open licenses)

## Implementation Notes

The `SoundManager` class in `src/utils/SoundManager.ts` handles:
- Lazy loading of sound files
- Sound enable/disable toggle
- Volume control
- Browser autoplay policy handling

Sounds are loaded on-demand and cached for subsequent plays.

## Adding Custom Sounds

1. Place your MP3 files in this directory
2. Ensure filenames match the expected names above
3. The SoundManager will automatically load them

## Fallback Behavior

If sound files are missing or fail to load:
- The game will continue to function normally
- No error messages will be shown to users
- Console warnings will be logged for debugging