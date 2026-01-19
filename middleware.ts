// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Crear una respuesta base
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // 2. Configurar el cliente de Supabase (Versión Nueva SSR)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 3. Verificar Sesión
  const { data: { session } } = await supabase.auth.getSession()

  const path = request.nextUrl.pathname
  // Definimos qué rutas proteger
  const isAdminRoute = path.startsWith('/admin')
  const isClubRoute = path.startsWith('/club')

  // CASO A: Si quiere entrar a zona protegida y NO tiene sesión -> Login
  if (!session && (isAdminRoute || isClubRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // CASO B: Tiene sesión, verificamos si tiene permiso para entrar ahí
  if (session && (isAdminRoute || isClubRoute)) {
    
    // Leemos el rol desde la base de datos
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    
    const role = profile?.role

    // B1. Si intenta entrar a ADMIN y NO es admin -> Lo mandamos al Club
    if (isAdminRoute && role !== 'admin') {
      return NextResponse.redirect(new URL('/club/dashboard', request.url))
    }

    // B2. Si intenta entrar a CLUB y NO es club (ni admin) -> Login
    if (isClubRoute && role !== 'club' && role !== 'admin') {
       return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

// Configuración: Solo se ejecuta en estas rutas
export const config = {
  matcher: ['/admin/:path*', '/club/:path*'],
}