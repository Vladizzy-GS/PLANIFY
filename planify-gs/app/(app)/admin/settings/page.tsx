import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Admin settings have been merged into the main Paramètres page
export default function AdminSettingsPage() {
  redirect('/settings')
}
