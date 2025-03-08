import { NextResponse } from 'next/server'

const API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent'
const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyB_5v0m7rapZHpBSWJKAX4l16JhihOwxlY'

function detectLanguage(prompt: string): string {
  const langKeywords = {
    python: ['python', 'py', 'def ', 'class ', '.py'],
    typescript: ['typescript', 'ts', 'function ', 'interface ', 'type ', '.ts'],
    java: ['java', 'public class', 'public static', '.java'],
    cpp: ['c++', 'cpp', 'vector<', '#include', '.cpp', '.hpp'],
    rust: ['rust', 'fn ', 'struct ', 'impl ', '.rs'],
    go: ['golang', 'go', 'func ', 'package ', '.go']
  }

  for (const [lang, keywords] of Object.entries(langKeywords)) {
    if (keywords.some(keyword => prompt.toLowerCase().includes(keyword))) {
      return lang
    }
  }

  return 'python'
}

function formatPrompt(prompt: string): string {
  const language = detectLanguage(prompt)
  const langSpecificRequirements = {
    python: '- Use type hints\n- Follow PEP 8 style guide\n- Include error handling\n- Support async operations',
    typescript: '- Use type annotations\n- Follow TypeScript conventions\n- Include error handling\n- Support async operations',
    java: '- Use standard Java conventions\n- Include error handling\n- Support async operations',
    cpp: '- Use standard C++ conventions\n- Include error handling\n- Support resource management',
    rust: '- Use standard Rust conventions\n- Include error handling\n- Support async operations',
    go: '- Use standard Go conventions\n- Include error handling\n- Support concurrent operations'
  }

  return `Write code for this task:
${prompt}

Requirements:
- Use ${language}
- Write clean, working code
${langSpecificRequirements[language as keyof typeof langSpecificRequirements] || ''}
- Handle errors appropriately
- Return only the implementation`
}

function cleanOutput(code: string, language: string): string {
  code = code.replace(/```[\w-]*\n?|\n?```/g, '')
  
  const commentPatterns = {
    python: /#.*$/gm,
    typescript: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
    java: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
    cpp: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
    rust: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
    go: /\/\/.*$/gm
  }

  code = code.replace(commentPatterns[language as keyof typeof commentPatterns] || /#.*$/gm, '')
  code = code.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')

  switch (language) {
    case 'python':
      code = code.replace(/\n{3,}/g, '\n\n')
      break
    case 'go':
      code = code.replace(/\s+$/gm, '')
      break
  }

  return code
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!API_KEY) {
      return NextResponse.json(
        { error: 'API key is not configured. Please set the GEMINI_API_KEY environment variable.' },
        { status: 500 }
      )
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const language = detectLanguage(prompt)
    const formattedPrompt = formatPrompt(prompt)

    // Request to Gemini API
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: formattedPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Generation error:', error)
      
      return NextResponse.json(
        { error: error.error?.message || 'Error generating code' },
        { status: response.status }
      )
    }

    const result = await response.json()
    
    // Extract code from Gemini response
    const generatedText = result.candidates[0].content.parts[0].text
    const cleanedCode = cleanOutput(generatedText, language)
    
    return NextResponse.json({ code: cleanedCode, language })

  } catch (error: any) {
    console.error('Request error:', error)
    return NextResponse.json(
      { error: error.message || 'Error generating code' },
      { status: 500 }
    )
  }
} 