-- ========================================================
-- RESTRUCTURED REFERRAL LOGIC (STRICT APPROVAL ACTIVATION)
-- ========================================================

-- 1. Redefine the signup trigger to ONLY create a 'Pending' referral (no instant balance)
CREATE OR REPLACE FUNCTION public.reward_referrer_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_bonus NUMERIC(10,2);
BEGIN
    -- Check if referred_by was just set
    IF NEW.referred_by IS NOT NULL THEN
        -- Only fire on INSERT or when transitioning from NULL to NOT NULL on UPDATE
        IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.referred_by IS NULL) THEN
            
            -- Fetch the referral bonus from system settings
            SELECT COALESCE(referral_bonus, 5.00) INTO v_bonus FROM public.system_settings WHERE id = 1;
            
            -- Instead of updating the wallet balance directly, create a Pending referral
            INSERT INTO public.referrals (referrer_id, referred_user_id, reward_amount, status)
            VALUES (NEW.referred_by, NEW.id, v_bonus, 'Pending')
            ON CONFLICT (referred_user_id) DO NOTHING;
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to activate a pending referral upon job approval
CREATE OR REPLACE FUNCTION public.activate_referral_on_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when status transitions to 'Approved'
    IF NEW.status = 'Approved' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'Approved')) THEN
        -- Safely update any 'Pending' referral for this user to 'Active'
        -- This triggers the existing 'process_referral_update' on the 'referrals' table 
        -- which actually adds the balance to the referrer inside a transaction.
        UPDATE public.referrals
        SET status = 'Active', updated_at = NOW()
        WHERE referred_user_id = NEW.user_id 
          AND status = 'Pending';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to submissions (e.g., Gmail/FB sell tasks)
DROP TRIGGER IF EXISTS on_submission_approval_referral ON public.submissions;
CREATE TRIGGER on_submission_approval_referral
AFTER INSERT OR UPDATE OF status ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.activate_referral_on_approval();

-- 4. Attach trigger to micro_job_submissions (if applicable)
DROP TRIGGER IF EXISTS on_micro_job_submission_approval_referral ON public.micro_job_submissions;
CREATE TRIGGER on_micro_job_submission_approval_referral
AFTER INSERT OR UPDATE OF status ON public.micro_job_submissions
FOR EACH ROW
EXECUTE FUNCTION public.activate_referral_on_approval();
