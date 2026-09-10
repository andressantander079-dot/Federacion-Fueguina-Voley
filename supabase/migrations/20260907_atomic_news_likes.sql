-- =========================================================================
-- MIGRACIÓN ATÓMICA DE LIKES EN NOTICIAS (FVF) v2.0
-- =========================================================================

-- 1. Crear tabla de trazabilidad de votos únicos por cliente
CREATE TABLE IF NOT EXISTS public.news_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
    client_identifier TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_news_client_like UNIQUE (news_id, client_identifier)
);

-- 2. Índices de alta velocidad
CREATE INDEX IF NOT EXISTS idx_news_likes_news_id ON public.news_likes(news_id);
CREATE INDEX IF NOT EXISTS idx_news_likes_client ON public.news_likes(client_identifier);

-- 3. Habilitar RLS en news_likes
ALTER TABLE public.news_likes ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para news_likes
DROP POLICY IF EXISTS "Public Read News Likes" ON public.news_likes;
CREATE POLICY "Public Read News Likes"
ON public.news_likes
FOR SELECT
TO public
USING (true);

-- 5. Sanear contadores huérfanos en tabla news (resuelve data drift inicial)
UPDATE public.news 
SET likes = (
    SELECT count(*)::INT 
    FROM public.news_likes 
    WHERE news_likes.news_id = news.id
);

-- 6. Eliminar funciones RPC viejas no seguras
DROP FUNCTION IF EXISTS public.increment_likes(UUID);
DROP FUNCTION IF EXISTS public.decrement_likes(UUID);

-- 7. Crear función RPC atómica, idempotente y con SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.toggle_news_like(
    p_news_id UUID,
    p_client_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_already_liked BOOLEAN;
    v_new_count INT;
    v_is_liked BOOLEAN;
BEGIN
    -- Validar que la noticia exista y esté publicada
    IF NOT EXISTS (SELECT 1 FROM public.news WHERE id = p_news_id AND status = 'published') THEN
        RAISE EXCEPTION 'Noticia no encontrada o no publicada';
    END IF;

    -- Validar identificador de cliente
    IF p_client_id IS NULL OR trim(p_client_id) = '' THEN
        RAISE EXCEPTION 'Identificador de cliente inválido';
    END IF;

    -- Verificar si el cliente ya dio like
    SELECT EXISTS (
        SELECT 1 FROM public.news_likes
        WHERE news_id = p_news_id AND client_identifier = p_client_id
    ) INTO v_already_liked;

    IF v_already_liked THEN
        -- UNLIKE ATÓMICO CON VERIFICACIÓN IF FOUND
        DELETE FROM public.news_likes
        WHERE news_id = p_news_id AND client_identifier = p_client_id;

        IF FOUND THEN
            UPDATE public.news
            SET likes = GREATEST(COALESCE(likes, 0) - 1, 0)
            WHERE id = p_news_id
            RETURNING likes INTO v_new_count;
            v_is_liked := FALSE;
        ELSE
            SELECT likes INTO v_new_count FROM public.news WHERE id = p_news_id;
            v_is_liked := FALSE;
        END IF;
    ELSE
        -- LIKE ATÓMICO CON VERIFICACIÓN IF FOUND (Previene doble clic concurrente)
        INSERT INTO public.news_likes (news_id, client_identifier)
        VALUES (p_news_id, p_client_id)
        ON CONFLICT (news_id, client_identifier) DO NOTHING;

        IF FOUND THEN
            UPDATE public.news
            SET likes = COALESCE(likes, 0) + 1
            WHERE id = p_news_id
            RETURNING likes INTO v_new_count;
            v_is_liked := TRUE;
        ELSE
            -- Ya existía la fila por petición concurrente previa
            SELECT likes INTO v_new_count FROM public.news WHERE id = p_news_id;
            v_is_liked := TRUE;
        END IF;
    END IF;

    -- Retornar estado consolidado al frontend
    RETURN jsonb_build_object(
        'liked', v_is_liked,
        'likes_count', COALESCE(v_new_count, 0)
    );
END;
$$;

-- 8. Permisos de ejecución para usuarios anónimos y autenticados
GRANT EXECUTE ON FUNCTION public.toggle_news_like(UUID, TEXT) TO anon, authenticated;
