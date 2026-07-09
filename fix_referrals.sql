-- =================================================================
-- STRICT REFERRAL LOGIC FIX
-- This script completely cleans up old triggers and establishes 
-- the exact business logic requested:
-- 1. Sign Up -> Creates Pending Referral (No Balance Added)
-- 2. Job Approval -> Updates to Active & Adds Balance
-- =================================================================

-- 1. DROP ALL OLD TRIGGERS TO PREVENT DOUBLE FIRING
DROP TRIGGER IF EXISTS trigger_reward_referrer_on_signup ON public.profiles;
DROP TRIGGER IF EXISTS on_submission_approval_referral ON public.submissions;
DROP TRIGGER IF EXISTS on_micro_job_submission_approval_referral ON public.micro_job_submissions;
DROP TRIGGER IF EXISTS trigger_referral_update ON public.referrals;

-- 2. REDEFINE THE USER SIGNUP FUNCTION
-- This will safely extract the referral code, create the user, 
-- and ONLY insert a 'Pending' row in the referrals table.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_referral_code TEXT;
    extracted_ip TEXT;
    ip_status TEXT := 'Active';
    ref_by UUID := NULL;
    ref_code TEXT;
    v_bonus NUMERIC(10,2);
BEGIN
    -- Ensure unique referral code for the new user
    LOOP
        new_referral_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_referral_code);
    END LOOP;

    -- Extract IP Address
    extracted_ip := NEW.raw_user_meta_data->>'ip_address';
    IF extracted_ip IS NOT NULL AND extracted_ip != '' THEN
        IF EXISTS (SELECT 1 FROM public.profiles WHERE ip_address = extracted_ip) THEN
            ip_status := 'Pending';
        END IF;
    END IF;

    -- Look up the referrer's ID using the submitted referral code
    ref_code := NEW.raw_user_meta_data->>'referral_code';
    IF ref_code IS NOT NULL AND ref_code != '' THEN
        SELECT id INTO ref_by FROM public.profiles WHERE referral_code = ref_code;
    END IF;

    -- Insert Profile
    INSERT INTO public.profiles (
        id, email, full_name, role, referral_code, referred_by, wallet_balance, phone_number, ip_address, status
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

    -- ========================================================
    -- REFERRAL STEP 1: CREATE PENDING REFERRAL ROW (NO BALANCE)
    -- ========================================================
    IF ref_by IS NOT NULL THEN
        -- Fetch the bonus amount from system settings
        SELECT COALESCE(referral_bonus, 5.00) INTO v_bonus FROM public.system_settings WHERE id = 1;
        
        -- Simply insert as Pending.
        INSERT INTO public.referrals (referrer_id, referred_user_id, reward_amount, status)
        VALUES (ref_by, NEW.id, v_bonus, 'Pending')
        ON CONFLICT (referred_user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. REDEFINE THE ADMIN APPROVAL RPC
-- This executes when the Admin clicks "Approve" on a Microjob/Task
CREATE OR REPLACE FUNCTION public.approve_submission(sub_id UUID, target_user_id UUID, amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_rows INTEGER;
    v_referrer_id UUID;
    v_reward_amount NUMERIC(10,2);
BEGIN
    -- 1. Mark Job as Approved
    UPDATE public.submissions
    SET status = 'Approved'
    WHERE id = sub_id AND status = 'Pending';
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    
    IF updated_rows > 0 THEN
        -- 2. Add the Task Price to the User's balance (who did the job)
        UPDATE public.profiles
        SET wallet_balance = wallet_balance + amount
        WHERE id = target_user_id;

        -- ========================================================
        -- REFERRAL STEP 2: CHECK FOR PENDING REFERRAL & ACTIVATE
        -- ========================================================
        SELECT referrer_id, reward_amount 
        INTO v_referrer_id, v_reward_amount
        FROM public.referrals
        WHERE referred_user_id = target_user_id AND status = 'Pending';

        IF v_referrer_id IS NOT NULL THEN
            -- Update Referral Status to Active
            UPDATE public.referrals
            SET status = 'Active', updated_at = NOW()
            WHERE referred_user_id = target_user_id AND status = 'Pending';

            -- Safely Add Reward to the Referrer's balance
            UPDATE public.profiles
            SET wallet_balance = wallet_balance + v_reward_amount
            WHERE id = v_referrer_id;
        END IF;

        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;
