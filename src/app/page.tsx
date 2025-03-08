'use client'

import { useState } from 'react'
import { Editor } from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, Code2, Sparkles, AlertCircle } from 'lucide-react'

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

function cleanCode(code: string, language: string): string {
  // Remove markdown code blocks
  code = code.replace(/```[\w-]*\n?|\n?```/g, '')
  
  // Remove comments based on language
  const commentPatterns = {
    python: /#.*$/gm,
    typescript: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
    java: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
    cpp: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
    rust: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
    go: /\/\/.*$/gm
  }

  code = code.replace(commentPatterns[language as keyof typeof commentPatterns] || /#.*$/gm, '')
  
  // Split into lines and clean each line
  let lines = code.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  // Fix indentation based on language
  switch (language) {
    case 'python': {
      let indentLevel = 0
      lines = lines.map(line => {
        // Decrease indent level if line starts with dedent keywords
        if (line.match(/^(return|break|continue|pass|else|elif|except|finally)$/)) {
          indentLevel = Math.max(0, indentLevel - 1)
        }
        
        // Add proper indentation
        const indentedLine = '    '.repeat(indentLevel) + line
        
        // Increase indent level if line ends with colon
        if (line.endsWith(':')) {
          indentLevel++
        }
        
        return indentedLine
      })
      break
    }
    
    case 'typescript':
    case 'java':
    case 'cpp': {
      let indentLevel = 0
      lines = lines.map(line => {
        // Decrease indent level if line starts with closing brace
        if (line.startsWith('}')) {
          indentLevel = Math.max(0, indentLevel - 1)
        }
        
        // Add proper indentation
        const indentedLine = '  '.repeat(indentLevel) + line
        
        // Increase indent level if line ends with opening brace
        if (line.endsWith('{')) {
          indentLevel++
        }
        
        return indentedLine
      })
      break
    }
    
    case 'rust': {
      let indentLevel = 0
      lines = lines.map(line => {
        // Decrease indent level if line starts with closing brace
        if (line.startsWith('}')) {
          indentLevel = Math.max(0, indentLevel - 1)
        }
        
        // Add proper indentation
        const indentedLine = '    '.repeat(indentLevel) + line
        
        // Increase indent level if line ends with opening brace
        if (line.endsWith('{')) {
          indentLevel++
        }
        
        return indentedLine
      })
      break
    }
    
    case 'go': {
      let indentLevel = 0
      lines = lines.map(line => {
        // Decrease indent level if line starts with closing brace
        if (line.startsWith('}')) {
          indentLevel = Math.max(0, indentLevel - 1)
        }
        
        // Add proper indentation
        const indentedLine = '\t'.repeat(indentLevel) + line
        
        // Increase indent level if line ends with opening brace
        if (line.endsWith('{')) {
          indentLevel++
        }
        
        return indentedLine
      })
      break
    }
  }

  // Join lines back together
  code = lines.join('\n')

  // Add language-specific formatting
  switch (language) {
    case 'python':
      code = code.replace(/\n{3,}/g, '\n\n') // Max 2 blank lines (PEP 8)
      break
    case 'go':
      code = code.replace(/\s+$/gm, '') // Remove trailing whitespace
      break
    default:
      break
  }

  return code
}

export default function Home() {
  const [code, setCode] = useState('')
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState('python')
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!prompt) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const detectedLanguage = detectLanguage(prompt)
      setLanguage(detectedLanguage)

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `${prompt}\n\nRequirements:\n- Use ${detectedLanguage}\n- Write clean, working code\n- Follow ${detectedLanguage} conventions\n- Handle errors appropriately\n- Return only the implementation\n- Use proper indentation (4 spaces for Python, 2 spaces for TypeScript/Java/C++, 4 spaces for Rust, tabs for Go)`
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate code')
      }
      
      const data = await response.json()
      setCode(cleanCode(data.code, detectedLanguage))
    } catch (error: any) {
      console.error('Error:', error)
      setError(error.message || 'Failed to generate code. Please check your API key and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100">
      <div className="container mx-auto p-8 space-y-10">
        <div className="space-y-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <Code2 className="h-10 w-10 text-blue-400" />
            <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
              Code Generator
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto font-light">
            Describe what you want to generate and let AI help you create the code.
            Powered by Google's Gemini 1.5 Flash for accurate and efficient code generation.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="flex gap-4 items-start">
            <div className="relative group flex-1">
              <textarea
                placeholder="Example: Create a function that sorts an array of numbers in ascending order..."
                value={prompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
                className="w-full h-48 p-6 rounded-xl border border-gray-700 bg-gray-800/50 backdrop-blur-sm text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all duration-200 shadow-lg group-hover:shadow-xl text-lg"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
            </div>
            
            <div className="pt-2">
              <Button 
                onClick={handleGenerate}
                disabled={isLoading || !prompt}
                size="lg"
                className="relative overflow-hidden group h-48 px-8 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <span className="relative z-10 flex items-center gap-3 text-lg">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generate
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <Card className="overflow-hidden border-gray-700 shadow-xl max-w-4xl mx-auto">
          <div className="p-3 bg-gray-800/50 border-b border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Code2 className="h-4 w-4" />
              <span className="capitalize">{language}</span>
            </div>
          </div>
          <Editor
            height="400px"
            defaultLanguage={language}
            value={code}
            onChange={(value) => setCode(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 16 },
              renderLineHighlight: 'all',
              renderWhitespace: 'selection',
              cursorStyle: 'line',
              cursorBlinking: 'smooth',
              tabSize: language === 'python' || language === 'rust' ? 4 : 2,
              insertSpaces: language !== 'go',
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        </Card>
      </div>
    </main>
  )
} 