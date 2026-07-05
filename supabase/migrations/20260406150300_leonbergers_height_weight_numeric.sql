-- Výška a váha ako desatinné čísla (cm, kg)

ALTER TABLE public.leonbergers
  ALTER COLUMN height_cm TYPE numeric(6, 2) USING CASE
    WHEN height_cm IS NULL THEN NULL
    ELSE height_cm::numeric
  END;

ALTER TABLE public.leonbergers
  ALTER COLUMN weight_kg TYPE numeric(6, 2) USING CASE
    WHEN weight_kg IS NULL THEN NULL
    ELSE weight_kg::numeric
  END;
