-- 1. Create the unified view for Referrals
DROP VIEW IF EXISTS public.my_referrals_view;

CREATE OR REPLACE VIEW public.my_referrals_view AS
SELECT 
    r.id AS referral_id,
    r.referrer_id,
    r.referred_user_id,
    r.status AS referral_status,
    r.created_at,
    p.full_name AS referred_name,
    p.email AS referred_email
FROM public.referrals r
LEFT JOIN public.profiles p ON r.referred_user_id = p.id;

-- 2. Create the RPC function for Admin Approval/Rejection Logic
CREATE OR REPLACE FUNCTION handle_referral_logic(
    target_job_id UUID,
    job_submitter_id UUID,
    action_type TEXT
) RETURNS VOID AS $$
DECLARE
    v_referral_id UUID;
    v_referrer_id UUID;
    v_bonus NUMERIC;
BEGIN
    -- Only process if there is a 'Pending' referral for this user
    SELECT id, referrer_id INTO v_referral_id, v_referrer_id
    FROM public.referrals
    WHERE referred_user_id = job_submitter_id AND status = 'Pending'
    LIMIT 1;

    -- If a pending referral exists, proceed with logic
    IF v_referral_id IS NOT NULL THEN
        IF action_type = 'Approve' THEN
            -- Get referral bonus amount from settings (default 5 if not found)
            SELECT referral_bonus INTO v_bonus FROM public.system_settings WHERE id = 1;
            IF v_bonus IS NULL THEN
                v_bonus := 5.00;
            END IF;

            -- Update referral status to Active
            UPDATE public.referrals 
            SET status = 'Active', updated_at = NOW() 
            WHERE id = v_referral_id;

            -- Add bonus to referrer's wallet
            UPDATE public.profiles 
            SET wallet_balance = COALESCE(wallet_balance, 0) + v_bonus 
            WHERE id = v_referrer_id;

        ELSIF action_type = 'Reject' THEN
            -- Update referral status to Expired (Failed), meaning they lost their ONE CHANCE
            UPDATE public.referrals 
            SET status = 'Expired', updated_at = NOW() 
            WHERE id = v_referral_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
