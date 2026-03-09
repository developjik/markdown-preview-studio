import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import mermaid from 'mermaid'
import 'highlight.js/styles/github-dark.css'
import './App.css'

const SAMPLE = `# Markdown Preview Studio

실시간으로 마크다운을 작성하고 미리보기 하세요.

## Features

- Live Preview
- GitHub Flavored Markdown (GFM)
- Mermaid
- Dark Mode
- Auto Save
- Export HTML / PDF

### Mermaid

\`\`\`mermaid
graph TD
  A[Write Markdown] --> B[Preview]
  B --> C[Export]
\`\`\`

### Code

\`\`\`ts
function greet(name: string) {
  return \`Hello, \${name}\`
}
\`\`\`
`

function MermaidBlock({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'default' })
        const id = `mmd-${Math.random().toString(36).slice(2)}`
        const result = await mermaid.render(id, chart)
        if (mounted) {
          setSvg(result.svg)
          setError('')
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Mermaid render failed')
          setSvg('')
        }
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [chart])

  if (error) {
    return (
      <div className="mermaidError">
        <p>Mermaid 렌더 실패: {error}</p>
        <pre>{chart}</pre>
      </div>
    )
  }

  return <div className="mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
}

function decodeMdParam(value: string) {
  try {
    return decodeURIComponent(escape(atob(value)))
  } catch {
    return null
  }
}

function encodeMdParam(value: string) {
  return btoa(unescape(encodeURIComponent(value)))
}

function App() {
  const [readOnly, setReadOnly] = useState<boolean>(false)
  const [markdown, setMarkdown] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search)
    const mdParam = params.get('md')
    const decoded = mdParam ? decodeMdParam(mdParam) : null
    return decoded || localStorage.getItem('md-content') || SAMPLE
  })
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem('md-dark') === '1')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setReadOnly(params.get('readonly') === '1')
  }, [])

  useEffect(() => {
    if (!readOnly) localStorage.setItem('md-content', markdown)
  }, [markdown, readOnly])

  useEffect(() => {
    localStorage.setItem('md-dark', dark ? '1' : '0')
  }, [dark])

  const exportHtml = () => {
    const html = `<!doctype html><html><head><meta charset="UTF-8"/><title>Export</title></head><body>${document.getElementById('preview')?.innerHTML || ''}</body></html>`
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'markdown-preview.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPdf = async () => {
    const preview = document.getElementById('preview')
    if (!preview) return

    const { default: html2pdf } = await import('html2pdf.js')
    const opt = {
      margin: 10,
      filename: 'markdown-preview.pdf',
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: { mode: ['css', 'legacy'] },
    }

    await html2pdf().set(opt).from(preview).save()
  }

  const shareReadOnlyLink = async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('md', encodeMdParam(markdown))
    url.searchParams.set('readonly', '1')
    const text = url.toString()

    try {
      await navigator.clipboard.writeText(text)
      alert('읽기 전용 공유 링크가 복사됐어!')
    } catch {
      prompt('아래 링크를 복사해줘', text)
    }
  }

  return (
    <main className={dark ? 'app dark' : 'app'}>
      <header className="top">
        <h1>Markdown Preview Studio {readOnly ? '(Read Only)' : ''}</h1>
        <div className="actions">
          <button onClick={() => setDark((d) => !d)}>{dark ? 'Light' : 'Dark'} Mode</button>
          {!readOnly && <button onClick={shareReadOnlyLink}>Share Link</button>}
          <button onClick={exportHtml}>Export HTML</button>
          <button onClick={exportPdf}>Export PDF</button>
        </div>
      </header>

      <section className={readOnly ? 'split readonly' : 'split'}>
        {!readOnly && (
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="editor"
            spellCheck={false}
          />
        )}

        <article id="preview" className="preview markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              code(props) {
                const { className, children } = props
                const match = /language-(\w+)/.exec(className || '')
                if (match?.[1] === 'mermaid') {
                  return <MermaidBlock chart={String(children).replace(/\n$/, '')} />
                }
                return <code className={className}>{children}</code>
              },
            }}
          >
            {markdown}
          </ReactMarkdown>
        </article>
      </section>
    </main>
  )
}

export default App
