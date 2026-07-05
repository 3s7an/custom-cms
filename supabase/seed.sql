-- Dev seed: admin login via Supabase Auth (email + password).
-- Password is only used when creating a NEW auth user (local/staging).
-- If the email already exists (e.g. created in Dashboard), only public.admins is ensured.
-- If inserting into auth.* fails (permissions), create the user in Dashboard and run:
--   INSERT INTO public.admins (user_id, username) VALUES ('<auth_user_uuid>', 'leonberger');

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'admin@leonberger.sk';
  v_encrypted_pw text := crypt('leonberger123', gen_salt('bf'));
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      v_encrypted_pw,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now()
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  END IF;

  INSERT INTO public.admins (user_id, username)
  VALUES (v_user_id, 'leonberger')
  ON CONFLICT (user_id) DO NOTHING;
END $$;
