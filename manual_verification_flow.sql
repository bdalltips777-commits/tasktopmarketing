-- 1. DROP ALL OLD AUTOMATIC TRIGGERS
DROP TRIGGER IF EXISTS trigger_reward_referrer_on_signup ON public.profiles;
DROP TRIGGER IF EXISTS on_submission_approval_referral ON public.submissions;
DROP TRIGGER IF EXISTS on_micro_job_submission_approval_referral ON public.micro_job_submissions;
DROP TRIGGER IF EXISTS trigger_referral_update ON public.referrals;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the user trigger (essential for auth.users)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. UPDATE HANDLE_NEW_USER TO SIMPLY CREATE PENDING REFERRAL
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
    -- REFERRAL STEP 1: PENDING REFERRAL
    -- ========================================================
    IF ref_by IS NOT NULL THEN
        SELECT COALESCE(referral_bonus, 5.00) INTO v_bonus FROM public.system_settings WHERE id = 1;
        
        INSERT INTO public.referrals (referrer_id, referred_user_id, reward_amount, status)
        VALUES (ref_by, NEW.id, v_bonus, 'Pending')
        ON CONFLICT (referred_user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. THE ADMIN APPROVAL RPCS (For both submissions and micro_job_submissions)

-- A) Approve Gmail/FB Submissions (public.submissions)
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
    UPDATE public.submissions
    SET status = 'Approved'
    WHERE id = sub_id AND status = 'Pending';
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    
    IF updated_rows > 0 THEN
        -- Add Task Price to User
        UPDATE public.profiles
        SET wallet_balance = COALESCE(wallet_balance, 0) + amount
        WHERE id = target_user_id;

        -- REFERRAL STEP 2: CHECK FOR PENDING REFERRAL & ACTIVATE
        -- DEFENSIVE: Verify the referrals table exists and handle any exception gracefully
        IF to_regclass('public.referrals') IS NOT NULL THEN
            BEGIN
                EXECUTE 'SELECT referrer_id, reward_amount FROM public.referrals WHERE referred_user_id = $1 AND status = ''Pending'''
                INTO v_referrer_id, v_reward_amount
                USING target_user_id;

                IF v_referrer_id IS NOT NULL THEN
                    EXECUTE 'UPDATE public.referrals SET status = ''Active'', updated_at = NOW() WHERE referred_user_id = $1 AND status = ''Pending'''
                    USING target_user_id;

                    -- Add Reward to Referrer
                    UPDATE public.profiles
                    SET wallet_balance = COALESCE(wallet_balance, 0) + v_reward_amount
                    WHERE id = v_referrer_id;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Safely suppress any errors to prevent blocking the submission approval
                NULL;
            END;
        END IF;

        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

-- B) Approve Micro Job Submissions (public.micro_job_submissions)
CREATE OR REPLACE FUNCTION public.approve_micro_job_submission(sub_id UUID, target_user_id UUID, amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_rows INTEGER;
    v_referrer_id UUID;
    v_reward_amount NUMERIC(10,2);
BEGIN
    UPDATE public.micro_job_submissions
    SET status = 'Approved'
    WHERE id = sub_id AND status = 'Pending';
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    
    IF updated_rows > 0 THEN
        -- Add Task Price to User
        UPDATE public.profiles
        SET wallet_balance = COALESCE(wallet_balance, 0) + amount
        WHERE id = target_user_id;

        -- REFERRAL STEP 2: CHECK FOR PENDING REFERRAL & ACTIVATE
        -- DEFENSIVE: Verify the referrals table exists and handle any exception gracefully
        IF to_regclass('public.referrals') IS NOT NULL THEN
            BEGIN
                EXECUTE 'SELECT referrer_id, reward_amount FROM public.referrals WHERE referred_user_id = $1 AND status = ''Pending'''
                INTO v_referrer_id, v_reward_amount
                USING target_user_id;

                IF v_referrer_id IS NOT NULL THEN
                    EXECUTE 'UPDATE public.referrals SET status = ''Active'', updated_at = NOW() WHERE referred_user_id = $1 AND status = ''Pending'''
                    USING target_user_id;

                    -- Add Reward to Referrer
                    UPDATE public.profiles
                    SET wallet_balance = COALESCE(wallet_balance, 0) + v_reward_amount
                    WHERE id = v_referrer_id;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Safely suppress any errors to prevent blocking the submission approval
                NULL;
            END;
        END IF;

        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

-- Securely fetch reward from micro_jobs
CREATE OR REPLACE FUNCTION public.approve_micro_job_submission_secure(sub_id UUID, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_rows INTEGER;
    v_referrer_id UUID;
    v_reward_amount NUMERIC(10,2);
    v_job_reward NUMERIC(10,2);
BEGIN
    -- Get the reward amount for the job this submission belongs to
    SELECT mj.reward_amount INTO v_job_reward
    FROM public.micro_job_submissions mjs
    JOIN public.micro_jobs mj ON mjs.job_id = mj.id
    WHERE mjs.id = sub_id AND mjs.status = 'Pending';
    
    IF v_job_reward IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Update the submission
    UPDATE public.micro_job_submissions
    SET status = 'Approved'
    WHERE id = sub_id AND status = 'Pending';
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    
    IF updated_rows > 0 THEN
        -- Add Task Price to User
        UPDATE public.profiles
        SET wallet_balance = COALESCE(wallet_balance, 0) + v_job_reward
        WHERE id = target_user_id;

        -- REFERRAL STEP 2: CHECK FOR PENDING REFERRAL & ACTIVATE
        -- DEFENSIVE: Verify the referrals table exists and handle any exception gracefully
        IF to_regclass('public.referrals') IS NOT NULL THEN
            BEGIN
                EXECUTE 'SELECT referrer_id, reward_amount FROM public.referrals WHERE referred_user_id = $1 AND status = ''Pending'''
                INTO v_referrer_id, v_reward_amount
                USING target_user_id;

                IF v_referrer_id IS NOT NULL THEN
                    EXECUTE 'UPDATE public.referrals SET status = ''Active'', updated_at = NOW() WHERE referred_user_id = $1 AND status = ''Pending'''
                    USING target_user_id;

                    -- Add Reward to Referrer
                    UPDATE public.profiles
                    SET wallet_balance = COALESCE(wallet_balance, 0) + v_reward_amount
                    WHERE id = v_referrer_id;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Safely suppress any errors to prevent blocking the submission approval
                NULL;
            END;
        END IF;

        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;
