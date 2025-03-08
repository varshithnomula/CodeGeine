# CodeGenie: AI Code Generator

An AI-powered code generation tool that helps developers quickly generate high-quality code snippets in multiple programming languages.

## Features

- 🤖 AI-powered code generation using CodeLlama
- 🎨 Beautiful, modern UI with dark theme
- 💻 Support for multiple programming languages:
  - Python
  - TypeScript
  - Java
  - C++
  - Rust
  - Go
- ✨ Automatic language detection
- 🎯 Clean code output with proper formatting
- 🚀 Real-time code editing with syntax highlighting

## Tech Stack

- Next.js 13+ with App Router
- TypeScript
- Tailwind CSS
- CodeLlama (via Replicate API)
- Monaco Editor

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/[your-username]/codegenie.git
cd codegenie
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file and add your Replicate API key:
```
REPLICATE_API_KEY=your_api_key_here
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Enter your code requirements in the text area
2. Select your preferred programming language (or let it auto-detect)
3. Click "Generate" to create the code
4. The generated code will appear in the editor below
5. Edit the code if needed

## License

MIT License - feel free to use this project for any purpose.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 