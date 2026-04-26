import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useApp } from '../../context/AppContext.jsx'

export default function TasbihTab() {
  const { student } = useAuth()
  const { saveTasbih } = useApp()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!student) return
    setCount(student.tasbih_count ?? 0)
  }, [student?.id])

  const handleTap = async () => {
    if (!student?.id) return
    const newCount = count + 1
    setCount(newCount)
    await saveTasbih(student, newCount)
  }

  const handleReset = async () => {
    if (!student?.id) return
    setCount(0)
    await saveTasbih(student, 0)
  }

  if (!student) return <div>Loading...</div>

  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h2>Tasbih Counter</h2>
      <div style={{ fontSize: '72px', margin: '20px 0' }}>{count}</div>
      <button
        onClick={handleTap}
        style={{
          width: '200px', height: '200px', borderRadius: '50%',
          fontSize: '24px', cursor: 'pointer',
          backgroundColor: '#2d6a4f', color: 'white', border: 'none',
        }}
      >
        Tap
      </button>
      <br /><br />
      <button onClick={handleReset} style={{ marginTop: '20px' }}>
        Reset
      </button>
    </div>
  )
}
