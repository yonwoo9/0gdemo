import { useState, useEffect } from 'react'

interface ChatTabProps {
  broker: any
  selectedProvider: any
  message: string
  setMessage: (message: string) => void
}

export default function ChatTab({
  broker,
  selectedProvider,
  message,
  setMessage,
}: ChatTabProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifyingMessageId, setVerifyingMessageId] = useState<string | null>(
    null
  )

  // 重置消息历史
  useEffect(() => {
    if (selectedProvider) {
      setMessages([])
    }
  }, [selectedProvider])

  // 发送消息（基础版本）
  const sendMessage = async () => {
    if (!broker || !selectedProvider || !inputMessage.trim()) return

    const userMsg = { role: 'user', content: inputMessage }
    setMessages((prev) => [...prev, userMsg])
    setInputMessage('')
    setLoading(true)

    try {
      const metadata = await broker.inference.getServiceMetadata(
        selectedProvider.address
      )
      const headers = await broker.inference.getRequestHeaders(
        selectedProvider.address,
        JSON.stringify([userMsg])
      )

      let account
      try {
        account = await broker.inference.getAccount(selectedProvider.address)
      } catch (error) {
        await broker.ledger.transferFund(
          selectedProvider.address,
          'inference',
          BigInt(2e18)
        )
      }

      console.log('账户信息:', account)
      console.log('账户信息:', account.balance)
      if (account.balance <= BigInt(1.5e18)) {
        console.log('子账户余额不足，正在充值...')
        await broker.ledger.transferFund(
          selectedProvider.address,
          'inference',
          BigInt(2e18)
        )
      }

      const response = await fetch(`${metadata.endpoint}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          messages: [userMsg],
          model: metadata.model,
          stream: false,
        }),
      })

      const result = await response.json()
      const aiMsg = {
        role: 'assistant',
        content: result.choices[0].message.content,
        id: result.id,
        verified: false,
      }

      setMessages((prev) => [...prev, aiMsg])

      // 处理验证和计费
      if (result.id) {
        setVerifyingMessageId(result.id)
        setMessage('正在验证响应...')

        try {
          await broker.inference.processResponse(
            selectedProvider.address,
            aiMsg.content,
            result.id
          )

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === result.id ? { ...msg, verified: true } : msg
            )
          )
          setMessage('响应验证成功')
        } catch (verifyErr) {
          console.error('验证失败:', verifyErr)
          setMessage('响应验证失败')
          // 标记验证失败
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === result.id
                ? { ...msg, verified: false, verifyError: true }
                : msg
            )
          )
        } finally {
          setVerifyingMessageId(null)
          setTimeout(() => setMessage(''), 3000)
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            '错误: ' + (err instanceof Error ? err.message : String(err)),
        },
      ])
    }
    setLoading(false)
  }

  if (!selectedProvider) {
    return (
      <div>
        <h2>AI 聊天</h2>
        <p>请先选择并验证服务</p>
      </div>
    )
  }

  const apiUrl = 'https://fapi.binance.com/fapi/v2/ticker/price?symbol=0GUSDT'

  const [symbol, setSymbol] = useState('')
  const [price, setPrice] = useState('')
  const [time, setTime] = useState('')

  const fetchPrice = async () => {
    // 向 API 请求价格
    try {
      const res = await fetch(apiUrl)
      const data = await res.json()
      setSymbol(data.symbol || '')
      setPrice(data.price || '')
      setTime(data.time || '')

      // 填写输入框
      setInputMessage(
        '这是现在的 ' + data.symbol + ' 价格: ' + data.price + ' 请给出交易建议'
      )
    } catch (err) {
      setMessage('请求价格失败')
      console.error(err)
    }
  }
  return (
    <div>
      <h2>AI 聊天</h2>
      <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
        当前服务: {selectedProvider.name} - {selectedProvider.model}
      </div>

      <div
        style={{
          height: '300px',
          overflowY: 'auto',
          border: '1px solid #ddd',
          padding: '10px',
          marginBottom: '10px',
        }}>
        {messages.length === 0 ? (
          <div style={{ color: '#666', fontStyle: 'italic' }}>
            开始与 AI 对话...
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: '10px' }}>
              <strong>{msg.role === 'user' ? '你' : 'AI'}:</strong>{' '}
              {msg.content}
              {msg.role === 'assistant' && msg.id && (
                <span
                  style={{
                    marginLeft: '10px',
                    fontSize: '12px',
                    color: msg.verifyError
                      ? '#dc3545'
                      : msg.verified
                      ? '#28a745'
                      : verifyingMessageId === msg.id
                      ? '#ffc107'
                      : '#6c757d',
                  }}>
                  {msg.verifyError
                    ? '❌ 验证失败'
                    : msg.verified
                    ? '✓ 已验证'
                    : verifyingMessageId === msg.id
                    ? '⏳ 验证中...'
                    : '⚠️ 未验证'}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* API URL + 按钮 */}
      <div className="flex items-center mb-3">
        <div className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm">
          {apiUrl}
        </div>

        <button
          onClick={fetchPrice}
          className="ml-3 px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600 transition-colors">
          请求 API
        </button>
      </div>

      {/* 返回结果 */}
      <div className="flex space-x-4 text-s items-center">
        <span>symbol: {symbol}</span>
        <span>price: {price}</span>
        <span>time: {time}</span>
      </div>
      <div style={{ display: 'flex' }}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
          placeholder="输入消息..."
          style={{ flex: 1, padding: '5px', marginRight: '10px' }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !inputMessage.trim()}
          style={{ padding: '5px 15px' }}>
          {loading ? '发送中...' : '发送'}
        </button>
      </div>
    </div>
  )
}
