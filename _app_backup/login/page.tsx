import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

async function signIn(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    })

    if (error) {
        return { error }
    }

    redirect('/protected')
}

async function signUp(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    })

    if (error) {
        return { error }
    }

    redirect('/protected')
}

export default function Login() {
    return (
        <div>
            <form action={signIn}>
                <label htmlFor="email">Email:</label>
                <input id="email" name="email" type="email" required />
                <label htmlFor="password">Password:</label>
                <input id="password" name="password" type="password" required />
                <button type="submit">Sign In</button>
            </form>
            <form action={signUp}>
                <label htmlFor="email">Email:</label>
                <input id="email" name="email" type="email" required />
                <label htmlFor="password">Password:</label>
                <input id="password" name="password" type="password" required />
                <button type="submit">Sign Up</button>
            </form>
        </div>
    )
}
