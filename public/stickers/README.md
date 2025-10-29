# TGS Stickers Directory

This directory contains Telegram TGS stickers for the app.

## How to add TGS stickers:

### Option 1: Use existing TGS files from Telegram
1. Find a sticker pack in Telegram
2. Download the `.tgs` file (you can use bots like @Stickerdownloadbot)
3. Place the `.tgs` file in this directory
4. Reference it in your code: `<TgsSticker src="/stickers/your-sticker.tgs" />`

### Option 2: Use Lottie JSON directly
1. Get a Lottie animation from https://lottiefiles.com/
2. Download as JSON
3. Place the `.json` file in this directory
4. Reference it: `<TgsSticker src="/stickers/your-animation.json" />`

### Option 3: Convert emoji to Lottie
Use services like:
- https://lottiefiles.com/
- https://rive.app/
- https://designstripe.com/animator

## Example TGS sources:
- Telegram Sticker Packs (via @Stickerdownloadbot)
- https://tlgrm.ru/stickers (Telegram sticker database)
- LottieFiles: https://lottiefiles.com/featured

## Current stickers:
- `map.tgs` - Map/location animation (placeholder - add your own!)

## Usage in components:

```jsx
import TgsSticker from '../../components/common/TgsSticker'

<TgsSticker 
  src="/stickers/map.tgs"
  width={120}
  height={120}
  loop={true}
  autoplay={true}
/>
```

## Notes:
- TGS files are gzipped Lottie JSON
- The TgsSticker component handles decompression automatically
- Both `.tgs` and `.json` formats are supported
- Recommended size: 512x512 or smaller for performance
