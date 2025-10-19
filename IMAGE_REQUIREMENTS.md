# Image Requirements for FT Website

## Required Public Folder Structure

Create the following folder structure in your Next.js project:

```
public/
├── images/
│   ├── authors/
│   │   └── gideon-rachman.jpg
│   ├── iran-israel-conflict-main.jpg
│   ├── middle-east-analysis-chart.jpg
│   ├── trump-g7-summit.jpg
│   ├── whatsapp-advertising.jpg
│   ├── tsb-bank-branch.jpg
│   └── uk-parliament-commons.jpg
```

## Image Specifications

### Main Hero Images
- **iran-israel-conflict-main.jpg** (Priority image)
  - Dimensions: 16:9 aspect ratio (e.g., 1200x675px)
  - Content: Political leaders or Middle East conflict scene
  - Alt text: "Iran-Israel conflict - Political leaders"

### Author Profile Images
- **authors/gideon-rachman.jpg**
  - Dimensions: Square (e.g., 200x200px)
  - Content: Professional headshot of Gideon Rachman
  - Alt text: "Gideon Rachman"

### Analysis & Charts
- **middle-east-analysis-chart.jpg**
  - Dimensions: 16:9 aspect ratio (e.g., 800x450px)
  - Content: Middle East conflict analysis chart or infographic
  - Alt text: "Middle East conflict analysis chart"

### Top Stories Images
- **trump-g7-summit.jpg**
  - Dimensions: 16:9 aspect ratio (e.g., 600x338px)
  - Content: Trump at G7 summit with Canadian officials
  - Alt text: "Trump at G7 summit with Canadian officials"

- **whatsapp-advertising.jpg**
  - Dimensions: 16:9 aspect ratio (e.g., 600x338px)
  - Content: WhatsApp advertising interface mockup
  - Alt text: "WhatsApp advertising interface mockup"

- **tsb-bank-branch.jpg**
  - Dimensions: 16:9 aspect ratio (e.g., 600x338px)
  - Content: TSB bank branch storefront
  - Alt text: "TSB bank branch storefront"

- **uk-parliament-commons.jpg**
  - Dimensions: 16:9 aspect ratio (e.g., 600x338px)
  - Content: UK Parliament House of Commons interior
  - Alt text: "UK Parliament House of Commons"

## Image Sources

You can source these images from:
1. **News photography websites** (Reuters, AP, Getty Images)
2. **Stock photo services** (Unsplash, Pexels for free alternatives)
3. **Financial Times official images** (with proper licensing)
4. **Government official photos** (for Parliament, political figures)

## Important Notes

1. **Copyright**: Ensure all images are properly licensed for your use case
2. **Optimization**: Compress images for web use (WebP format recommended)
3. **Responsiveness**: Images will automatically scale due to Next.js Image component
4. **Loading**: Main hero image has `priority` flag for faster loading
5. **Fallback**: If images are missing, they will show broken image icons

## Quick Setup Command

```bash
# Create the folder structure
mkdir -p public/images/authors

# Add placeholder images (you'll need to replace with actual images)
touch public/images/iran-israel-conflict-main.jpg
touch public/images/middle-east-analysis-chart.jpg
touch public/images/trump-g7-summit.jpg
touch public/images/whatsapp-advertising.jpg
touch public/images/tsb-bank-branch.jpg
touch public/images/uk-parliament-commons.jpg
touch public/images/authors/gideon-rachman.jpg
```

Replace the placeholder files with actual images matching the specifications above. 