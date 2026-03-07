import { useState, useRef, useEffect } from 'react'
import { createRoot } from 'react-dom/client'

interface WeatherData {
  location: string
  condition: string
  temperature: {
    value: number
    unit: 'celsius' | 'fahrenheit'
  }
}

interface ChatElement {
  type: 'weather'
  params: WeatherData
}

interface Message {
  role: 'user' | 'agent'
  text: string | null
  error?: boolean
  element?: ChatElement
}

interface TextPart {
  text?: string
}

interface FunctionResponsePart {
  functionResponse: {
    id: string
    name: string
    response: { status: string; element?: ChatElement }
  }
}

type Part = TextPart | FunctionResponsePart

interface Event {
  content?: {
    role?: string; parts?: Part[]
  }
}

const BASE_PATH = '/api'
const APP_NAME = 'chat_agent'
const USER_ID = 'user_' + Math.random().toString(36).slice(2, 8)

let sessionId: string | null = null

async function ensureSession(): Promise<string> {
  if (sessionId) return sessionId

  const res = await fetch(`${BASE_PATH}/apps/${APP_NAME}/users/${USER_ID}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })

  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`)

  const data = await res.json()
  sessionId = data.id as string

  return sessionId
}

async function sendMessage(text: string): Promise<Message> {
  const sid = await ensureSession()
  const res = await fetch(`${BASE_PATH}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_name: APP_NAME,
      user_id: USER_ID,
      session_id: sid,
      new_message: { role: 'user', parts: [{ text }] },
    }),
  })

  if (!res.ok) throw new Error(`Agent error: ${res.status}`)

  const events: Event[] = await res.json()

  let replyText: string | null = null
  let element: ChatElement | undefined

  for (const event of [...events].reverse()) {
    const { role, parts } = event.content ?? {}

    if (role === 'model' && replyText === null) {
      const part = parts?.find((p): p is TextPart => 'text' in p && !!p.text)
      if (part?.text) replyText = part.text
    }

    if (role === 'user' && element === null) {
      const part = parts?.find((p): p is FunctionResponsePart => 'functionResponse' in p)
      if (part) element = part.functionResponse.response.element
    }
  }

  return { role: 'agent', text: replyText, element }
}

const WEATHER_ICONS: Record<string, string> = {
  'sunny': '☀️',
  'cloudy': '☁️',
  'rainy': '🌧️',
  'snowy': '❄️',
  'stormy': '⛈️',
  'windy': '🌬️',
  'foggy': '🌫️',
  'partly cloudy': '⛅',
}

function WeatherCard({ params }: { params: WeatherData }) {
  const icon = WEATHER_ICONS[params.condition.toLowerCase()] ?? '🌡️'
  const unit = params.temperature.unit === 'celsius' ? 'C' : 'F'

  return (
    <div className="mt-3 p-4 bg-zinc-900 border border-zinc-700 rounded-2xl">
      <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
        {params.location}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-4xl">{icon}</span>
        <span className="text-3xl font-light text-zinc-100">
          {params.temperature.value}°{unit}
        </span>
      </div>
      <div className="mt-2 text-sm text-zinc-400 capitalize">{params.condition}</div>
    </div>
  )
}

function ElementRenderer({ element }: { element: ChatElement }) {
  if (element.type === 'weather') {
    return <WeatherCard params={element.params} />
  }

  return null
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const finalMessageRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    finalMessageRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const text = input.trim()
    if (!text) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setLoading(true)

    try {
      const reply = await sendMessage(text)
      setMessages((prev) => [...prev, reply])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessages((prev) => [...prev, { role: 'agent', text: `Error: ${msg}`, error: true }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full p-4 gap-4">
      <header className="text-sm font-medium text-zinc-400 border-b border-zinc-800 pb-3">
        AI Chat
      </header>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          const bubbleClass = isUser
            ? 'bg-zinc-700 text-zinc-100 rounded-2xl rounded-br-sm'
            : `bg-zinc-800 rounded-2xl rounded-bl-sm ${msg.error ? 'text-red-400' : 'text-zinc-200'}`

          return (
            <div key={i} className={isUser ? 'flex justify-end' : 'flex justify-start'} ref={i === messages.length - 1 ? finalMessageRef : null}>
              <div className={`${bubbleClass} px-4 py-2 text-sm max-w-[75%] whitespace-pre-wrap`}>
                {msg.text}
                {msg.element && <ElementRenderer element={msg.element} />}
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 text-zinc-200 rounded-2xl rounded-bl-sm px-4 py-2 text-sm">
              ...
            </div>
          </div>
        )}
      </div>

      <form className="flex gap-2" onSubmit={handleSubmit}>
        <input
          className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none placeholder-zinc-500 focus:ring-1 focus:ring-zinc-600"
          ref={inputRef}
          type="text"
          autoComplete="off"
          placeholder="Message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          autoFocus
        />

        <button
          className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm transition-colors"
          type="submit"
          disabled={loading}
        >
          Send
        </button>
      </form>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
