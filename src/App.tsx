import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import './App.css'

const SAMPLE = `# Markdown Preview Studio

실시간으로 마크다운을 작성하고 미리보기 하세요.

## Features

- Live Preview
- GitHub Flavored Markdown (GFM)
- Dark Mode
- Auto Save
- Export HTML / PDF

### Code

\`\`\`ts
function greet(name: string) {
  return \`Hello, \${name}\`
}
\`\`\`

### Table

| Name | Role |
| --- | --- |
| developjik | Frontend |
| preview | Studio |

- [x] 체크리스트
- [ ] 프로젝트 배포
`

function App() {
  const [markdown, setMarkdown] = useState<string>(() => localStorage.getItem('md-content') || SAMPLE)
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem('md-dark') === '1')

  useEffect(() => {
    localStorage.setItem('md-content', markdown)
  }, [markdown])

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

  const exportPdf = () => window.print()

  return (
    <main className={dark ? 'app dark' : 'app'}>
      <header className="top">
        <h1>Markdown Preview Studio</h1>
        <div className="actions">
          <button onClick={() => setDark((d) => !d)}>{dark ? 'Light' : 'Dark'} Mode</button>
          <button onClick={exportHtml}>Export HTML</button>
          <button onClick={exportPdf}>Export PDF</button>
        </div>
      </header>

      <section className="split">
        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          className="editor"
          spellCheck={false}
        />

        <article id="preview" className="preview markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {markdown}
          </ReactMarkdown>
        </article>
      </section>
    </main>
  )
}

export default App
