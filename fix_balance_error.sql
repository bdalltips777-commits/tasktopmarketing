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

CREATE OR REPLACE FUNCTION public.reject_withdrawal(withdrawal_id UUID, target_user_id UUID, refund_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_rows INTEGER;
BEGIN
    UPDATE public.withdrawals
    SET status = 'Rejected'
    WHERE id = withdrawal_id AND status = 'Pending';
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    
    IF updated_rows > 0 THEN
        UPDATE public.profiles
        SET wallet_balance = wallet_balance + refund_amount
        WHERE id = target_user_id;

        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_referral_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'Expired' AND NEW.status != 'Expired' THEN
        RAISE EXCEPTION 'An expired referral cannot be reactivated or set to pending.';
    END IF;
    NEW.updated_at = NOW();
    
    IF OLD.status = 'Pending' AND NEW.status = 'Active' THEN
        UPDATE public.profiles
        SET wallet_balance = wallet_balance + NEW.reward_amount
        WHERE id = NEW.referrer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
