-- Передаёт схему public текущей базы и всё, что в ней лежит, роли :target_owner.
-- Подключается из roles.sql после \connect. До TASK-820 объекты создавал суперпользователь,
-- а миграции под ролью-владельцем не смогут менять чужие таблицы.
--
-- Последовательности serial/identity и типы-массивы переходят вместе с таблицей и enum,
-- объекты расширений не трогаются.

SELECT format('ALTER SCHEMA public OWNER TO %I', :'target_owner') \gexec

SELECT format(
    CASE c.relkind
        WHEN 'v' THEN 'ALTER VIEW public.%I OWNER TO %I'
        WHEN 'm' THEN 'ALTER MATERIALIZED VIEW public.%I OWNER TO %I'
        ELSE 'ALTER TABLE public.%I OWNER TO %I'
    END,
    c.relname, :'target_owner'
)
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relkind IN ('r', 'p', 'v', 'm')
  AND c.relowner <> (:'target_owner')::regrole
  AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e') \gexec

SELECT format('ALTER SEQUENCE public.%I OWNER TO %I', c.relname, :'target_owner')
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relkind = 'S'
  AND c.relowner <> (:'target_owner')::regrole
  AND NOT EXISTS (
      SELECT FROM pg_depend d WHERE d.objid = c.oid AND d.deptype IN ('a', 'i', 'e')
  ) \gexec

SELECT format(
    CASE t.typtype WHEN 'd' THEN 'ALTER DOMAIN public.%I OWNER TO %I' ELSE 'ALTER TYPE public.%I OWNER TO %I' END,
    t.typname, :'target_owner'
)
FROM pg_type t
WHERE t.typnamespace = 'public'::regnamespace
  AND t.typtype IN ('e', 'd')
  AND t.typowner <> (:'target_owner')::regrole
  AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.objid = t.oid AND d.deptype = 'e') \gexec

SELECT format('ALTER ROUTINE %s OWNER TO %I', p.oid::regprocedure, :'target_owner')
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proowner <> (:'target_owner')::regrole
  AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e') \gexec
