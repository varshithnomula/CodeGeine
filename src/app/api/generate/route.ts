import { NextResponse } from 'next/server'

const API_URL = 'https://api.replicate.com/v1/predictions'
const API_KEY = process.env.REPLICATE_API_KEY

// Using a verified working model version of CodeLlama
const MODEL_VERSION = "d24902e3fa9b698cc208b5e63136c4e26e828659a9f09827ca6ec5bb83014381"

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
        { error: 'API key is not configured. Please set the REPLICATE_API_KEY environment variable.' },
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

    // Initial request to create prediction
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: MODEL_VERSION,
        input: {
          prompt: formattedPrompt,
          max_length: 1000,
          temperature: 0.1,
          top_p: 0.9
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Prediction creation error:', error)
      
      if (response.status === 402) {
        return NextResponse.json(
          { error: 'Payment required. Please check your Replicate API account balance.' },
          { status: 402 }
        )
      }
      
      return NextResponse.json(
        { error: error.detail || 'Error creating prediction' },
        { status: response.status }
      )
    }

    const prediction = await response.json()
    const result = await pollPrediction(prediction.id, language)
    return NextResponse.json({ code: result, language })

  } catch (error: any) {
    console.error('Request error:', error)
    return NextResponse.json(
      { error: error.message || 'Error generating code' },
      { status: 500 }
    )
  }
}

async function pollPrediction(id: string, language: string): Promise<string> {
  const maxAttempts = 60
  const interval = 1000

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        headers: {
          'Authorization': `Token ${API_KEY}`,
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Error checking prediction status')
      }

      const prediction = await response.json()

      if (prediction.status === 'succeeded') {
        const output = prediction.output
        if (!output) {
          throw new Error('No output received from model')
        }
        return cleanOutput(
          Array.isArray(output) ? output.join('') : output,
          language
        )
      }

      if (prediction.status === 'failed') {
        throw new Error(prediction.error || 'Prediction failed')
      }

      if (prediction.status === 'canceled') {
        throw new Error('Prediction was canceled')
      }

      await new Promise(resolve => setTimeout(resolve, interval))
    } catch (error) {
      throw error
    }
  }

  throw new Error('Prediction timed out')
} 