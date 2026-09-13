'use client'
export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div style={{ padding: '20px', textAlign: 'center', color: 'white' }}>
      <h2>Ops! Algo deu errado!</h2>
      <button onClick={() => reset()} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px' }}>Tentar novamente</button>
    </div>
  )
}
