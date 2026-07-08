# Immediate Referral Balance Update (Supabase / PostgreSQL)

This updated SQL logic completely replaces the previous "Pending/Active" referral table requirement. With this new approach, exactly when a user signs up using a referral code, the referrer's `wallet_balance` is **immediately** credited with the dynamic `referral_bonus` amount set in the Admin Panel (`system_settings`).

### The SQL Trigger
We implement this via a Database Trigger on the `profiles` table. When a user's `referred_by` field is updated with the referrer's ID, the trigger automatically pulls the latest `referral_bonus` from the `system_settings` table and increments the referrer's balance.

```sql
-- Function to automatically reward the referrer on signup
CREATE OR REPLACE FUNCTION public.reward_referrer_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_bonus NUMERIC(10,2);
BEGIN
    -- Check if referred_by was just set (someone used a referral code)
    IF NEW.referred_by IS NOT NULL THEN
        -- Only fire on INSERT or when transitioning from NULL to NOT NULL on UPDATE
        IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.referred_by IS NULL) THEN
            
            -- Fetch the current referral bonus from system settings
            SELECT COALESCE(referral_bonus, 0) INTO v_bonus FROM public.system_settings WHERE id = 1;
            
            IF v_bonus > 0 THEN
                -- Immediately add balance to the referrer's account
                UPDATE public.profiles 
                SET wallet_balance = COALESCE(wallet_balance, 0) + v_bonus 
                WHERE id = NEW.referred_by;
            END IF;
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to the profiles table
DROP TRIGGER IF EXISTS trigger_reward_referrer_on_signup ON public.profiles;
CREATE TRIGGER trigger_reward_referrer_on_signup
AFTER INSERT OR UPDATE OF referred_by ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.reward_referrer_on_signup();
```

### How to Apply:
1. Copy the SQL code above.
2. Go to your **Supabase Dashboard** -> **SQL Editor**.
3. Paste the code into a new query window and click **Run**.
4. The system is now fully automated! When a new user registers with a referral code, the referrer's balance will instantly increase by the amount you defined in the Admin panel.

*Note: This code has also been appended to your `SUPABASE_SETUP.sql` file in the project workspace for your reference.*
