-- 1. Fix the Signup Trigger: Insert a Pending Referral instead of adding balance
CREATE OR REPLACE FUNCTION public.reward_referrer_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_bonus NUMERIC(10,2);
BEGIN
    IF NEW.referred_by IS NOT NULL THEN
        IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.referred_by IS NULL) THEN
            SELECT COALESCE(referral_bonus, 5.00) INTO v_bonus FROM public.system_settings WHERE id = 1;
            
            -- Do not add balance yet. Just create a Pending referral.
            INSERT INTO public.referrals (referrer_id, referred_user_id, reward_amount, status)
            VALUES (NEW.referred_by, NEW.id, v_bonus, 'Pending')
            ON CONFLICT (referred_user_id) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix the Referral Update Trigger: Safely add balance when transitioning to Active
CREATE OR REPLACE FUNCTION public.process_referral_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'Expired' AND NEW.status != 'Expired' THEN
        RAISE EXCEPTION 'An expired referral cannot be reactivated or set to pending.';
    END IF;

    NEW.updated_at = NOW();

    -- Safely add balance when transitioning from Pending to Active
    IF OLD.status = 'Pending' AND NEW.status = 'Active' THEN
        UPDATE public.profiles
        SET wallet_balance = COALESCE(wallet_balance, 0) + NEW.reward_amount
        WHERE id = NEW.referrer_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Cleanup: Drop any old RPCs or triggers that might be causing "balance does not exist" errors
DROP FUNCTION IF EXISTS public.approve_submission(UUID, UUID, NUMERIC);

-- 4. Just in case there is a rogue trigger on submissions table
DROP TRIGGER IF EXISTS trigger_update_balance_on_submission_approve ON public.submissions;
