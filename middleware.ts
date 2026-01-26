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
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
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
  // (Simplificación: Dejamos que el Client Side maneje los roles específicos para evitar bucles)

  return response
}

// Configuración: Solo se ejecuta en estas rutas
export const config = {
  matcher: ['/admin/:path*', '/club/:path*'],
}