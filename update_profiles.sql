ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Pending'));

CREATE OR REPLACE FUNCTION public.delete_rejected_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow admins
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Delete from auth.users (this cascades to profiles and everything else)
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
