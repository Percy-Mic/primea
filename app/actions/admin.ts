'use server'

import { createClient } from '@/lib/supabase/server'

export async function completeTaskForAdmin(adminId: string, pointsEarned: number) {
  const supabase = createClient()

  // Fetch current score, then update
  const { data: profile } = await supabase
    .from('profiles')
    .select('score')
    .eq('id', adminId)
    .single()

  const currentScore = profile?.score || 0

  const { error } = await supabase
    .from('profiles')
    .update({ score: currentScore + pointsEarned })
    .eq('id', adminId)

  if (error) {
    console.error('Error updating admin score:', error)
    throw new Error('Failed to update score')
  }
}
