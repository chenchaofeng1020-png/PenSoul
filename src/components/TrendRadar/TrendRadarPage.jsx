import React, { useState, useEffect } from 'react'
import TrendList from './TrendList'
import TrendDetailView from './TrendDetailView'
import { Layout } from 'lucide-react'

export default function TrendRadarPage({ productContext, onCreatePlan }) {
  const [trends, setTrends] = useState([])
  const [loading, setLoading] = useState(false)
  const [newCount, setNewCount] = useState(0)

  // Fetch aggregated trends on mount
  useEffect(() => {
    fetchTrends()
  }, [])

  const fetchTrends = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/trends/aggregated`)
      const json = await res.json()
      setTrends(json.data || [])
      setNewCount(0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const refreshTrends = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/trends/refresh`, { method: 'POST' })
      const json = await res.json()
      setTrends(json.data || [])
      setNewCount(json.new_count || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full bg-white rounded-xl overflow-hidden shadow-sm">
      <div className="w-full h-full">
        <TrendList
          trends={trends}
          selectedTrend={null}
          onSelectTrend={() => {}}
          loading={loading}
          onRefresh={refreshTrends}
          newCount={newCount}
        />
      </div>
    </div>
  )
}
