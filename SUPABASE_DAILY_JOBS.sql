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
    job_id UUID REFERENCES public.daily_jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    proof_text TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, user_id)
);

ALTER TABLE public.daily_job_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own daily job submissions" ON public.daily_job_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own daily job submissions" ON public.daily_job_submissions FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can update daily job submissions" ON public.daily_job_submissions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Wait, the user wants Micro Jobs and Daily Jobs to only be able to be submitted ONCE per person. 
-- For Micro Job submissions we might need to add a UNIQUE constraint to (job_id, user_id).
ALTER TABLE public.micro_job_submissions ADD CONSTRAINT unique_micro_job_user UNIQUE(job_id, user_id);

