-- Initialize Default Treasury Account if table is empty
INSERT INTO public.treasury_accounts (code, name, type)
SELECT 'CAJA-001', 'Caja Principal', 'ACTIVO'
WHERE NOT EXISTS (SELECT 1 FROM public.treasury_accounts);
