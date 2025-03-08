'use client'

import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import CodeMirror from '@uiw/react-codemirror'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
}

export default function CodeEditor({ value, onChange, readOnly = false }: CodeEditorProps) {
  return (
    <CodeMirror
      value={value}
      height="300px"
      theme={oneDark}
      extensions={[javascript({ jsx: true })]}
      onChange={onChange}
      readOnly={readOnly}
      className="overflow-hidden rounded-lg"
    />
  )
} 