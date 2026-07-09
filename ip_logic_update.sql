
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_referral_code TEXT;
    extracted_ip TEXT;
    ip_status TEXT := 'Active';
    ref_by UUID := NULL;
    ref_code TEXT;
BEGIN
    -- Loop to ensure a truly unique 6-character uppercase referral code
    LOOP
        new_referral_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_referral_code);
    END LOOP;

    -- Extract IP Address from metadata
    extracted_ip := NEW.raw_user_meta_data->>'ip_address';

    -- Check if IP exists
    IF extracted_ip IS NOT NULL AND extracted_ip != '' THEN
        IF EXISTS (SELECT 1 FROM public.profiles WHERE ip_address = extracted_ip) THEN
            ip_status := 'Pending';
        END IF;
    END IF;

    -- Extract referral code safely
    ref_code := NEW.raw_user_meta_data->>'referral_code';
    IF ref_code IS NOT NULL AND ref_code != '' THEN
        SELECT id INTO ref_by FROM public.profiles WHERE referral_code = ref_code;
    END IF;

    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role, 
        referral_code, 
        referred_by, 
        wallet_balance,
        phone_number,
        ip_address,
        status
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
        CASE WHEN NEW.email = 'harunurrashid93427@gmail.com' THEN 'admin' ELSE 'user' END,
        new_referral_code,
        ref_by,
        0.00,
        COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
        extracted_ip,
        ip_status
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
