
# Nano-Thumbnail

Nano-Thumbnail is a Next.js application for generating and managing AI-powered thumbnails. It features authentication, image generation, and a user-friendly interface.

## Features
- AI-based image generation
- User authentication (signup, login, email verification)
- Chat interface for image requests
- History of generated images
- Responsive design

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- pnpm (or npm/yarn)

### Installation
```bash
pnpm install
```

### Running the Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure
- `app/` - Main application pages and API routes
- `components/` - Reusable React components
- `contexts/` - React context providers (e.g., Auth)
- `hooks/` - Custom React hooks
- `lib/` - Utility libraries (e.g., Firebase config)
- `public/` - Static assets and images

## Environment Variables
Create a `.env.local` file and add your Firebase and other API keys as needed:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
# ...other variables
```

## License
MIT

## Author
Suprabhat3
