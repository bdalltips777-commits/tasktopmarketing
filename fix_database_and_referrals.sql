-- =========================================================================
-- ULTIMATE ROBUST DATABASE FIX FOR REFERRALS & BALANCES
-- =========================================================================

-- 1. DYNAMIC CLEANUP OF ALL KNOWN/UNKNOWN/ROGUE TRIGGERS ON AFFECTED TABLES
-- This clean-sweeps any old "balance" errors or obsolete triggers.
DO $$
DECLARE
    trig RECORD;
BEGIN
    -- Drop all triggers on submissions table
    FOR trig IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'submissions' AND trigger_schema = 'public'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trig.trigger_name) || ' ON public.submissions;';
    END LOOP;

    -- Drop all triggers on profiles table (except the Google OAuth handle_new_user trigger)
    FOR trig IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'profiles' AND trigger_schema = 'public' 
          AND trigger_name != 'on_auth_user_created'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trig.trigger_name) || ' ON public.profiles;';
    END LOOP;

    -- Drop all triggers on referrals table
    FOR trig IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'referrals' AND trigger_schema = 'public'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trig.trigger_name) || ' ON public.referrals;';
    END LOOP;
END;
$$;

-- 2. CLEANUP LEGACY FUNCTIONS THAT COULD BE MISCONFIGURED
DROP FUNCTION IF EXISTS public.reward_referrer_on_signup() CASCADE;
DROP FUNCTION IF EXISTS public.process_referral_update() CASCADE;
DROP FUNCTION IF EXISTS public.approve_submission(UUID, UUID, NUMERIC) CASCADE;
DROP TRIGGER IF EXISTS trigger_update_balance_on_submission_approve ON public.submissions;

-- 3. RECREATE EXTREMELY ROBUST, TRANSACTION-SAFE REFERRAL SIGNUP TRIGGER
-- When a user signs up with a referred_by value, a 'Pending' referral record is created.
-- ZERO wallet balance is paid out at this point.
CREATE OR REPLACE FUNCTION public.reward_referrer_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_bonus NUMERIC(10,2);
BEGIN
    -- Only proceed if referred_by is set and refers to a valid other user
    IF NEW.referred_by IS NOT NULL AND NEW.referred_by != NEW.id THEN
        -- Only run on INSERT or when referred_by is newly assigned
        IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND (OLD.referred_by IS NULL OR OLD.referred_by != NEW.referred_by)) THEN
            -- Fetch the referral bonus amount from the system_settings table (default ৳5.00)
            SELECT COALESCE(referral_bonus, 5.00) INTO v_bonus FROM public.system_settings WHERE id = 1;
            
            -- Insert the Pending referral record
            INSERT INTO public.referrals (referrer_id, referred_user_id, reward_amount, status, created_at, updated_at)
            VALUES (NEW.referred_by, NEW.id, v_bonus, 'Pending', NOW(), NOW())
            ON CONFLICT (referred_user_id) DO UPDATE
            SET referrer_id = EXCLUDED.referrer_id,
                reward_amount = EXCLUDED.reward_amount,
                status = 'Pending',
                updated_at = NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the signup trigger to public.profiles table
CREATE TRIGGER trigger_reward_referrer_on_signup
AFTER INSERT OR UPDATE OF referred_by ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.reward_referrer_on_signup();


-- 4. RECREATE THE REFERRAL UPDATE TRIGGER
-- Handles transition from 'Pending' to 'Active' or 'Expired'.
-- When transition is Active: Referrer is credited with the reward_amount.
-- When transition is Expired: Referral expires, no payouts are made.
CREATE OR REPLACE FUNCTION public.process_referral_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Block reactivation of Expired referrals
    IF OLD.status = 'Expired' AND NEW.status != 'Expired' THEN
        RAISE EXCEPTION 'An expired referral cannot be reactivated or set to pending.';
    END IF;
    -- Block modifications of already Active referrals
    IF OLD.status = 'Active' AND NEW.status != 'Active' THEN
        RAISE EXCEPTION 'An active referral cannot be modified or set back to pending.';
    END IF;

    NEW.updated_at = NOW();

    -- Add balance to referrer only when transitioning from Pending to Active
    IF OLD.status = 'Pending' AND NEW.status = 'Active' THEN
        UPDATE public.profiles
        SET wallet_balance = COALESCE(wallet_balance, 0) + NEW.reward_amount
        WHERE id = NEW.referrer_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the update trigger to public.referrals table
CREATE TRIGGER trigger_referral_update
BEFORE UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.process_referral_update();


-- 5. RE-PROVIDE COHERENT ATOMIC FUNCTIONS
-- These functions do not use 'balance', they use 'wallet_balance' correctly.
CREATE OR REPLACE FUNCTION public.approve_submission(sub_id UUID, target_user_id UUID, amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_rows INTEGER;
BEGIN
    UPDATE public.submissions
    SET status = 'Approved'
    WHERE id = sub_id AND status = 'Pending';
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    
    IF updated_rows > 0 THEN
        UPDATE public.profiles
        SET wallet_balance = wallet_balance + amount
        WHERE id = target_user_id;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;
