import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import mermaid from 'mermaid'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { keymap } from '@codemirror/view'
import { oneDark } from '@codemirror/theme-one-dark'
import { basicSetup } from 'codemirror'
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
- Collaboration (Room)

### Mermaid

\`\`\`mermaid
graph TD
  A[Write Markdown] --> B[Preview]
  B --> C[Export]
\`\`\`
`

type CollabState = {
  ydoc: Y.Doc
  provider: WebrtcProvider
  ytext: Y.Text
  undoManager: Y.UndoManager
}

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

function randomRoom() {
  return `room-${Math.random().toString(36).slice(2, 8)}`
}

function randomUser() {
  const names = ['Sky', 'Jik', 'Nova', 'Luna', 'Theo', 'Hana']
  const colors = ['#7c3aed', '#2563eb', '#059669', '#dc2626', '#d97706', '#0f766e']
  return {
    name: `${names[Math.floor(Math.random() * names.length)]}-${Math.floor(Math.random() * 100)}`,
    color: colors[Math.floor(Math.random() * colors.length)],
  }
}

function App() {
  const [readOnly, setReadOnly] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [markdownText, setMarkdownText] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search)
    const mdParam = params.get('md')
    const decoded = mdParam ? decodeMdParam(mdParam) : null
    return decoded || localStorage.getItem('md-content') || SAMPLE
  })
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem('md-dark') === '1')
  const [collab, setCollab] = useState<CollabState | null>(null)
  const syncingRef = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setReadOnly(params.get('readonly') === '1')
    setRoomId(params.get('room'))
  }, [])

  useEffect(() => {
    if (!roomId) {
      setCollab(null)
      return
    }

    const ydoc = new Y.Doc()
    const provider = new WebrtcProvider(roomId, ydoc)
    const ytext = ydoc.getText('markdown')
    const undoManager = new Y.UndoManager(ytext)

    provider.awareness.setLocalStateField('user', randomUser())

    if (ytext.length === 0) {
      ytext.insert(0, markdownText)
    }

    const observer = () => {
      syncingRef.current = true
      setMarkdownText(ytext.toString())
      syncingRef.current = false
    }
    ytext.observe(observer)

    setCollab({ ydoc, provider, ytext, undoManager })

    return () => {
      ytext.unobserve(observer)
      provider.destroy()
      ydoc.destroy()
      setCollab(null)
    }
  }, [roomId])

  useEffect(() => {
    if (!statusMessage) return
    const timer = window.setTimeout(() => setStatusMessage(''), 2400)
    return () => window.clearTimeout(timer)
  }, [statusMessage])

  useEffect(() => {
    if (!roomId && !readOnly) localStorage.setItem('md-content', markdownText)
  }, [markdownText, roomId, readOnly])

  useEffect(() => {
    localStorage.setItem('md-dark', dark ? '1' : '0')
  }, [dark])

  const editorExtensions = useMemo(() => {
    const extensions = [basicSetup, markdown()]
    if (dark) extensions.push(oneDark)
    if (collab) {
      extensions.push(yCollab(collab.ytext, collab.provider.awareness, { undoManager: collab.undoManager }))
      extensions.push(keymap.of([...yUndoManagerKeymap]))
    }
    return extensions
  }, [dark, collab])

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

  const copyLink = async (text: string, okMsg: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setStatusMessage(okMsg)
    } catch {
      prompt('아래 링크를 복사해줘', text)
      setStatusMessage('클립보드 접근이 막혀서 수동 복사가 필요해요.')
    }
  }

  const shareReadOnlyLink = async () => {
    const url = new URL(window.location.href)
    url.search = ''
    if (roomId) {
      url.searchParams.set('room', roomId)
    } else {
      url.searchParams.set('md', encodeMdParam(markdownText))
    }
    url.searchParams.set('readonly', '1')
    await copyLink(url.toString(), '읽기 전용 공유 링크를 복사했어요.')
  }

  const shareCollabLink = async () => {
    const id = roomId || randomRoom()
    if (!roomId) setRoomId(id)
    const url = new URL(window.location.href)
    url.search = ''
    url.searchParams.set('room', id)
    await copyLink(url.toString(), '공동 편집 링크를 복사했어요.')
  }

  return (
    <main className={dark ? 'app dark' : 'app'} aria-labelledby="appTitle">
      <header className="top">
        <h1 id="appTitle">Markdown Preview Studio {readOnly ? '(Read Only)' : roomId ? `(Room: ${roomId})` : ''}</h1>
        <div className="actions" role="group" aria-label="문서 작업">
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            aria-pressed={dark}
            aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {dark ? 'Light' : 'Dark'} Mode
          </button>
          {!readOnly && (
            <button type="button" onClick={shareCollabLink} aria-label="공동 편집 링크 복사">
              Share Collab
            </button>
          )}
          {!readOnly && (
            <button type="button" onClick={shareReadOnlyLink} aria-label="읽기 전용 링크 복사">
              Share Readonly
            </button>
          )}
          <button type="button" onClick={exportHtml} aria-label="HTML 파일로 내보내기">
            Export HTML
          </button>
          <button type="button" onClick={exportPdf} aria-label="PDF 파일로 내보내기">
            Export PDF
          </button>
        </div>
      </header>

      <p className="srOnly" role="status" aria-live="polite">
        {statusMessage}
      </p>

      <section className={readOnly ? 'split readonly' : 'split'}>
        {!readOnly && (
          <div className="editorWrap" role="region" aria-label="마크다운 편집기">
            <CodeMirror
              value={markdownText}
              height="100%"
              extensions={editorExtensions}
              onChange={(value) => {
                if (syncingRef.current) return
                setMarkdownText(value)
              }}
            />
          </div>
        )}

        <article id="preview" className="preview markdown-body" role="region" aria-label="미리보기 결과">
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
            {markdownText}
          </ReactMarkdown>
        </article>
      </section>
    </main>
  )
}

export default App
