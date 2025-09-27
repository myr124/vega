import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export default async function Protected() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    return (
        <div>
            <h1>Protected Page</h1>
            <p>Hello {user.email}!</p>
        </div>
    )
}
