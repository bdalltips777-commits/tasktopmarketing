-- ====================================================================
-- TASK TOP MARKETING - SUPABASE DATABASE REWRITE SETUP SCRIPT
-- Copy this entire script and run it in your Supabase SQL Editor
-- (https://supabase.com/dashboard/project/_/sql)
-- ====================================================================

-- 1. ENABLE REQUIRED EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE PROFILES TABLE (REFERENCES AUTH.USERS)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    wallet_balance NUMERIC(10,2) DEFAULT 0.00 CONSTRAINT wallet_balance_check CHECK (wallet_balance >= 0),
    role TEXT DEFAULT 'user',
    referral_code TEXT UNIQUE NOT NULL,
    referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    phone_number TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Allow public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow users to insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Allow users to update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3. CREATE SYSTEM SETTINGS TABLE (SINGLE ROW)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CONSTRAINT single_row_check CHECK (id = 1),
    gmail_price NUMERIC(10,2) DEFAULT 10.00,
    gmail_password TEXT DEFAULT 'GmailPass123',
    fb_price NUMERIC(10,2) DEFAULT 15.00,
    fb_password TEXT DEFAULT 'FBPass123',
    ig_price NUMERIC(10,2) DEFAULT 12.00,
    ig_password TEXT DEFAULT 'IGPass123',
    activation_fee NUMERIC(10,2) DEFAULT 0.00,
    referral_bonus NUMERIC(10,2) DEFAULT 5.00,
    min_withdraw NUMERIC(10,2) DEFAULT 50.00,
    banner_url TEXT DEFAULT 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
    scrolling_notice TEXT DEFAULT '',
    gmail_status BOOLEAN DEFAULT TRUE,
    fb_status BOOLEAN DEFAULT TRUE,
    ig_status BOOLEAN DEFAULT TRUE,
    referral_domain TEXT DEFAULT 'tasktopmarketing.onrender.com',
    telegram_support_link TEXT DEFAULT '',
    telegram_channel_link TEXT DEFAULT ''
);

-- ==========================================
-- ADD NEW COLUMNS TO EXISTING SYSTEM SETTINGS
-- Run these individually if you already have the table
-- ==========================================
-- ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS telegram_support_link TEXT DEFAULT '';
-- ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS telegram_channel_link TEXT DEFAULT '';
-- ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS gmail_status BOOLEAN DEFAULT TRUE;

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- System Settings Policies
CREATE POLICY "Allow public select on system_settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Allow admin to update system_settings" ON public.system_settings FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Insert Initial Settings Row
INSERT INTO public.system_settings (id, gmail_price, gmail_password, fb_price, fb_password, ig_price, ig_password, activation_fee, referral_bonus, min_withdraw, withdraw_fee, banner_url, scrolling_notice, fb_status, ig_status, referral_domain)
VALUES (1, 10.00, 'GmailPass123', 15.00, 'FBPass123', 12.00, 'IGPass123', 0.00, 5.00, 50.00, 0.00, 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop', 'স্বাগতম টাস্ক টপ মার্কেটিং-এ!', TRUE, TRUE, 'tasktopmarketing.com')
ON CONFLICT (id) DO NOTHING;

-- Create Storage Bucket for Banners
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Banners are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY "Admin can upload banners" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'banners' AND EXISTS (
        SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- 4. CREATE SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CONSTRAINT type_check CHECK (type IN ('gmail', 'facebook', 'instagram', 'giftcode')),
    credentials_json JSONB NOT NULL,
    price_at_submission NUMERIC(10,2) NOT NULL,
    status TEXT DEFAULT 'Pending' CONSTRAINT status_check CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- Enable RLS on submissions
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Submissions Policies
CREATE POLICY "Allow select submissions for owners or admins" ON public.submissions FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

CREATE POLICY "Allow insert submissions for logged in owners" ON public.submissions FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

CREATE POLICY "Allow admin to update submissions" ON public.submissions FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- 5. CREATE WITHDRAWALS TABLE
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10,2) NOT NULL CONSTRAINT withdraw_amount_check CHECK (amount >= 50.00),
    payment_method TEXT NOT NULL,
    account_number TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' CONSTRAINT withdraw_status_check CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- Enable RLS on withdrawals
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Withdrawals Policies
CREATE POLICY "Allow select withdrawals for owners or admins" ON public.withdrawals FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

CREATE POLICY "Allow insert withdrawals for logged in owners" ON public.withdrawals FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

CREATE POLICY "Allow admin to update withdrawals" ON public.withdrawals FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- 6. ATOMIC PostgreSQL FUNCTIONS (RPCs)
-- Prevents any concurrency / race condition issues on balance updates

-- Approve Submission RPC
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

-- Create Withdrawal RPC
CREATE OR REPLACE FUNCTION public.create_withdrawal(target_user_id UUID, withdraw_amount NUMERIC, method TEXT, account TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance NUMERIC;
BEGIN
    SELECT wallet_balance INTO current_balance
    FROM public.profiles
    WHERE id = target_user_id
    FOR UPDATE;
    
    IF current_balance >= withdraw_amount THEN
        UPDATE public.profiles
        SET wallet_balance = wallet_balance - withdraw_amount
        WHERE id = target_user_id;
        
        INSERT INTO public.withdrawals (user_id, amount, payment_method, account_number, status)
        VALUES (target_user_id, withdraw_amount, method, account, 'Pending');
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

-- Reject Withdrawal RPC
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

-- 7. AUTH TRIGGER FOR AUTO-PROFILES CREATION
-- Automatically generates profiles when a user logs in via Google OAuth

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_referral_code TEXT;
BEGIN
    -- Loop to ensure a truly unique 6-character uppercase referral code
    LOOP
        new_referral_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_referral_code);
    END LOOP;

    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role, 
        referral_code, 
        referred_by, 
        wallet_balance,
        phone_number
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
        CASE WHEN NEW.email = 'harunurrashid93427@gmail.com' THEN 'admin' ELSE 'user' END,
        new_referral_code,
        NULLIF(NEW.raw_user_meta_data->>'referred_by', '')::uuid,
        0.00,
        ''
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- USER MANAGEMENT & MICRO JOBS SCHEMA
-- ==========================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.micro_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.micro_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.micro_jobs FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.micro_jobs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE TABLE IF NOT EXISTS public.micro_job_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    job_id UUID REFERENCES public.micro_jobs(id) NOT NULL,
    proof_text TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.micro_job_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable insert for authenticated users" ON public.micro_job_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable read for users own submissions" ON public.micro_job_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Enable all access for admins" ON public.micro_job_submissions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Enable all access for admins on profiles" ON public.profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ==========================================
-- ADVANCED GIFT CODE SYSTEM SCHEMA
-- ==========================================
CREATE TABLE IF NOT EXISTS public.gift_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    max_uses INTEGER NOT NULL DEFAULT 1,
    current_uses INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.gift_codes FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.gift_codes FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE TABLE IF NOT EXISTS public.gift_code_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_id UUID REFERENCES public.gift_codes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(code_id, user_id)
);
ALTER TABLE public.gift_code_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable insert for authenticated users" ON public.gift_code_claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable read for users own claims" ON public.gift_code_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Enable all access for admins" ON public.gift_code_claims FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Safe Gift Code Claim RPC
CREATE OR REPLACE FUNCTION public.claim_gift_code_safe(target_user_id UUID, input_code TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_gift_code RECORD;
    v_claim_exists BOOLEAN;
BEGIN
    -- 1. Fetch the code
    SELECT * INTO v_gift_code
    FROM public.gift_codes
    WHERE code = UPPER(input_code)
    FOR UPDATE;

    IF v_gift_code IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'এই গিফট কোডটি ভুল');
    END IF;

    -- 2. Check limits
    IF v_gift_code.current_uses >= v_gift_code.max_uses THEN
        RETURN json_build_object('success', false, 'error', 'এটির লিমিট শেষ হয়ে গেছে');
    END IF;

    -- 3. Check if already claimed
    SELECT EXISTS (
        SELECT 1 FROM public.gift_code_claims
        WHERE code_id = v_gift_code.id AND user_id = target_user_id
    ) INTO v_claim_exists;

    IF v_claim_exists THEN
        RETURN json_build_object('success', false, 'error', 'আপনি ইতিমধ্যে এই কোডটি ব্যবহার করেছেন');
    END IF;

    -- 4. Update balances and increment usage
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + v_gift_code.reward_amount
    WHERE id = target_user_id;

    UPDATE public.gift_codes
    SET current_uses = current_uses + 1
    WHERE id = v_gift_code.id;

    -- 5. Insert claim record
    INSERT INTO public.gift_code_claims (code_id, user_id)
    VALUES (v_gift_code.id, target_user_id);

    RETURN json_build_object('success', true, 'reward_amount', v_gift_code.reward_amount);
END;
$$;

-- ==========================================
-- REFERRALS SYSTEM UPDATE
-- ==========================================

-- 1. Create a Referrals Table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    referred_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    reward_amount NUMERIC(10,2) NOT NULL DEFAULT 5.00,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Active', 'Expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);
CREATE POLICY "Enable insert for all users" ON public.referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can do everything on referrals" ON public.referrals FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 2. Trigger for Task 1 & Validation (Prevent Expired updates & Credit Balance)
CREATE OR REPLACE FUNCTION public.process_referral_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Strict Validation: Block "Expired" referrals from changing back
    IF OLD.status = 'Expired' AND NEW.status != 'Expired' THEN
        RAISE EXCEPTION 'An expired referral cannot be reactivated or set to pending.';
    END IF;

    -- Update updated_at automatically
    NEW.updated_at = NOW();

    -- Task 1: Safely add balance when transitioning from Pending to Active
    IF OLD.status = 'Pending' AND NEW.status = 'Active' THEN
        UPDATE public.profiles
        SET wallet_balance = wallet_balance + NEW.reward_amount
        WHERE id = NEW.referrer_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_referral_update ON public.referrals;
CREATE TRIGGER trigger_referral_update
BEFORE UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.process_referral_update();


-- ==========================================
-- TASK 2: AUTO-EXPIRE REFERRALS CRON JOB
-- ==========================================
-- Note: Requires pg_cron extension enabled in Supabase Dashboard (Database -> Extensions -> pg_cron)

-- Create the function to automatically expire 30-day old pending referrals
CREATE OR REPLACE FUNCTION public.auto_expire_pending_referrals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.referrals
    SET status = 'Expired', 
        updated_at = NOW()
    WHERE status = 'Pending' 
      AND created_at <= (NOW() - INTERVAL '30 days');
END;
$$;

-- Create RPC function to add referrals bypassing front-end race conditions
CREATE OR REPLACE FUNCTION public.add_referral(p_referrer_id UUID, p_new_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bonus NUMERIC(10,2);
BEGIN
    -- Only insert if a referral for this user doesn't exist yet
    IF NOT EXISTS (
        SELECT 1 FROM public.referrals WHERE referred_user_id = p_new_user_id
    ) THEN
        -- Get default reward_amount/referral_bonus from settings
        SELECT COALESCE(referral_bonus, 5.00) INTO v_bonus FROM public.system_settings WHERE id = 1;
        
        -- Insert the pending referral record
        INSERT INTO public.referrals (referrer_id, referred_user_id, reward_amount, status)
        VALUES (p_referrer_id, p_new_user_id, v_bonus, 'Pending');

        -- Update referred_by on profiles if not already set
        UPDATE public.profiles
        SET referred_by = p_referrer_id
        WHERE id = p_new_user_id AND referred_by IS NULL;
    END IF;
END;
$$;

-- Optional: To schedule this in Supabase using pg_cron (if enabled)
-- SELECT cron.schedule('expire_pending_referrals_daily', '0 0 * * *', 'SELECT public.auto_expire_pending_referrals()');
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

-- ==========================================
-- PAGE RULES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.page_rules (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    page_type VARCHAR NOT NULL UNIQUE, -- 'gmail', 'facebook', 'instagram'
    rules_text TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.page_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.page_rules FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.page_rules FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Insert default rows
INSERT INTO public.page_rules (page_type, rules_text) VALUES 
('gmail', 'এখানে জিমেইল সেলের নিয়মাবলী লিখুন...'),
('facebook', 'এখানে ফেসবুক সেলের নিয়মাবলী লিখুন...'),
('instagram', 'এখানে ইনস্টাগ্রাম সেলের নিয়মাবলী লিখুন...')
ON CONFLICT (page_type) DO NOTHING;
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

-- ==========================================
-- DAILY JOBS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.daily_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.daily_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.daily_jobs FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.daily_jobs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE TABLE IF NOT EXISTS public.daily_job_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    job_id UUID REFERENCES public.daily_jobs(id) NOT NULL,
    proof_text TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.daily_job_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select daily job submissions for owners or admins" ON public.daily_job_submissions FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);
CREATE POLICY "Allow insert daily job submissions for logged in owners" ON public.daily_job_submissions FOR INSERT WITH CHECK (
    auth.uid() = user_id
);
CREATE POLICY "Allow admin to update daily job submissions" ON public.daily_job_submissions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Note for user: Run this migration to apply unique constraints to prevent double submissions.
-- ALTER TABLE public.micro_job_submissions ADD CONSTRAINT unique_micro_job_user UNIQUE(job_id, user_id);
-- ALTER TABLE public.daily_job_submissions ADD CONSTRAINT unique_daily_job_user UNIQUE(job_id, user_id);


-- ==========================================
-- LEADERBOARD SETTINGS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.leaderboard_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CONSTRAINT single_row_check CHECK (id = 1),
    last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT '2000-01-01T00:00:00Z'
);

ALTER TABLE public.leaderboard_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.leaderboard_settings FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.leaderboard_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

INSERT INTO public.leaderboard_settings (id, last_reset_at) VALUES (1, '2000-01-01T00:00:00Z') ON CONFLICT DO NOTHING;
