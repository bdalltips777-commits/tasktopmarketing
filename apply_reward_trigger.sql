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
            SELECT COALESCE(referral_bonus, 0) INTO v_bonus FROM public.system_settings WHERE id = 1;
            
            IF v_bonus > 0 THEN
                -- Add balance to the referrer
                UPDATE public.profiles 
                SET wallet_balance = COALESCE(wallet_balance, 0) + v_bonus 
                WHERE id = NEW.referred_by;
            END IF;
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_reward_referrer_on_signup ON public.profiles;
CREATE TRIGGER trigger_reward_referrer_on_signup
AFTER INSERT OR UPDATE OF referred_by ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.reward_referrer_on_signup();
