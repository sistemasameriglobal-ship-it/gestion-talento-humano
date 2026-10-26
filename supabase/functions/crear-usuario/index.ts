// =================================================================
// Edge Function: crear-usuario
// =================================================================
// Permite que un administrador cree usuarios nuevos directamente
// (sin auto-registro), sin perder su propia sesión.
//
// Seguridad:
//  - Verifica el JWT del usuario que llama (debe venir autenticado).
//  - Verifica en la tabla `perfiles` que ese usuario es admin Y activo.
//  - Solo si pasa esas dos validaciones, usa la service_role key
//    (que vive únicamente en el servidor, nunca en el navegador)
//    para crear el nuevo usuario con auth.admin.createUser.
//  - El perfil del nuevo usuario se crea automáticamente vía el
//    trigger `on_auth_user_created` que ya existe en la base de
//    datos (mismo que usa el flujo de auto-registro).
// =================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
      return new Response(
        JSON.stringify({ error: 'Faltan variables de entorno en la función.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 1. Cliente "como el usuario que llama" (con su JWT) ──────────────
    // Sirve para verificar quién es y si es admin, respetando RLS.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autenticado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAsCaller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: caller }, error: callerError } = await supabaseAsCaller.auth.getUser()
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Sesión inválida o expirada.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 2. Verificar que quien llama es admin Y está activo ──────────────
    const { data: perfilCaller, error: perfilError } = await supabaseAsCaller
      .from('perfiles')
      .select('es_admin, activo')
      .eq('id', caller.id)
      .maybeSingle()

    if (perfilError || !perfilCaller || !perfilCaller.es_admin || !perfilCaller.activo) {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos de administrador para crear usuarios.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 3. Leer y validar el body ─────────────────────────────────────────
    const body = await req.json().catch(() => null)
    const correo = body?.correo?.trim().toLowerCase()
    const password = body?.password
    const nombreCompleto = body?.nombreCompleto?.trim()
    const esAdmin = !!body?.esAdmin

    if (!correo || !password || !nombreCompleto) {
      return new Response(
        JSON.stringify({ error: 'Faltan datos: correo, contraseña y nombre completo son obligatorios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 4. Crear el usuario con privilegios de servicio ───────────────────
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: correo,
      password,
      email_confirm: true, // el admin ya lo está dando de alta, no necesita confirmar correo
      user_metadata: { nombre_completo: nombreCompleto },
    })

    if (createError) {
      const msg = createError.message?.includes('already been registered')
        ? 'Ya existe una cuenta con ese correo.'
        : createError.message
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newUserId = created.user.id

    // ── 5. Activar el perfil (el trigger lo crea con activo=false) ───────
    // y aplicar el rol de admin si se solicitó.
    const { error: updateError } = await supabaseAdmin
      .from('perfiles')
      .update({ activo: true, es_admin: esAdmin })
      .eq('id', newUserId)

    if (updateError) {
      return new Response(
        JSON.stringify({
          error: `Usuario creado pero no se pudo activar el perfil: ${updateError.message}. Actívalo manualmente desde la pantalla Usuarios.`,
        }),
        { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, userId: newUserId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (e) {
    return new Response(
      JSON.stringify({ error: `Error inesperado: ${e.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
