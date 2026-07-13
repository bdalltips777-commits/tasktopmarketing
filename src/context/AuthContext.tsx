import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  balance: number;
  referralCode: string;
  referredBy: string | null;
  phoneNumber: string;
  isBlocked?: boolean;
}

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  authError: string | null;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signUpWithEmail: (email: string, password: string, fullName: string, referredBy?: string | null) => Promise<any>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchProfileData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId);

      if (error) {
        console.warn('[Supabase Setup Notice] Unable to retrieve profile data. This is expected if Supabase is not yet fully configured or database tables have not been created:', error.message);
        
        // Check if the relation doesn't exist (helpful debugging message for developers/users)
        if (error.message?.includes('relation "public.profiles" does not exist') || error.code === '42P01') {
          setAuthError('Error: Supabase Database tables are not set up. Please run the SQL setup script from SUPABASE_SETUP.sql in your Supabase SQL Editor.');
        } else {
          setAuthError(`Profile fetch failed: ${error.message}`);
        }
        return null;
      }

      // If profile does not exist, let's create it manually as a fallback
      if (!data || data.length === 0) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const email = currentUser.email || '';
          const role = email.toLowerCase() === 'harunurrashid93427@gmail.com' ? 'admin' : 'user';
          const refCode = generateReferralCode();
          
          // Check for referral code in local storage
          let referredBy: string | null = null;
          const storedRef = localStorage.getItem('referred_by_code');
          if (storedRef) {
            try {
              const { data: referrer } = await supabase
                .from('profiles')
                .select('id')
                .eq('referral_code', storedRef.toUpperCase().trim());
              if (referrer && referrer.length > 0 && referrer[0].id !== currentUser.id) {
                referredBy = referrer[0].id;
              }
            } catch (e) {
              console.error('Error fetching referrer during automatic profile creation:', e);
            }
          }

          const newProfileObj = {
            id: currentUser.id,
            email: email,
            full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || email.split('@')[0],
            role: role,
            wallet_balance: 0.00,
            referral_code: refCode,
            referred_by: referredBy,
            phone_number: '',
            is_blocked: false
          };

          const { error: insertError } = await supabase
            .from('profiles')
            .insert(newProfileObj);

          if (insertError) {
            console.error('Error creating profile fallback:', insertError);
            setAuthError(`Profile creation failed: ${insertError.message}`);
            return null;
          }

          return {
            id: newProfileObj.id,
            fullName: newProfileObj.full_name,
            email: newProfileObj.email,
            role: newProfileObj.role,
            balance: newProfileObj.wallet_balance,
            referralCode: newProfileObj.referral_code,
            referredBy: newProfileObj.referred_by,
            phoneNumber: newProfileObj.phone_number
          };
        }
        return null;
      }

      // Profile exists, return the first one
      const profileRow = { ...data[0] };
      const emailLower = (profileRow.email || '').toLowerCase();
      const resolvedRole = (emailLower === 'harunurrashid93427@gmail.com' || emailLower === 'admin@tasktop.com') ? 'admin' : (profileRow.role || 'user');
      
      // Retroactively link referral if local storage has a referred_by_code and profiles.referred_by is null
      if (!profileRow.referred_by) {
        const storedRef = localStorage.getItem('referred_by_code');
        if (storedRef) {
          try {
            const { data: referrer } = await supabase
              .from('profiles')
              .select('id')
              .eq('referral_code', storedRef.toUpperCase().trim());
            if (referrer && referrer.length > 0 && referrer[0].id !== userId) {
              const referrerId = referrer[0].id;
              
              // Update profiles table
              const { error: updateProfileErr } = await supabase
                .from('profiles')
                .update({ referred_by: referrerId })
                .eq('id', userId);
                
              if (!updateProfileErr) {
                profileRow.referred_by = referrerId;
                
                // Insert into referrals table
                await supabase.from('referrals').insert({
                  referrer_id: referrerId,
                  referred_user_id: userId,
                  status: 'Pending'
                });
                
                // Remove from local storage so we only do it once
                localStorage.removeItem('referred_by_code');
              }
            }
          } catch (e) {
            console.error('Error auto-linking referral on load:', e);
          }
        }
      }
      
      // Auto-promote in the Supabase database if it's not already 'admin'
      if ((emailLower === 'harunurrashid93427@gmail.com' || emailLower === 'admin@tasktop.com') && profileRow.role !== 'admin') {
        supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', userId)
          .then(({ error }) => {
            if (error) {
              console.error('Auto-promoting admin in DB failed:', error);
            } else {
              console.log('Successfully auto-promoted user to admin in DB');
            }
          });
      }
      
      if (profileRow.is_blocked) {
        await supabase.auth.signOut();
        return {
          id: profileRow.id,
          fullName: profileRow.full_name || '',
          email: profileRow.email || '',
          role: resolvedRole,
          balance: Number(profileRow.wallet_balance || 0),
          referralCode: profileRow.referral_code || '',
          referredBy: profileRow.referred_by || null,
          phoneNumber: profileRow.phone_number || '',
          isBlocked: true
        };
      }
      
      return {
        id: profileRow.id,
        fullName: profileRow.full_name || '',
        email: profileRow.email || '',
        role: resolvedRole,
        balance: Number(profileRow.wallet_balance || 0),
        referralCode: profileRow.referral_code || '',
        referredBy: profileRow.referred_by || null,
        phoneNumber: profileRow.phone_number || '',
        isBlocked: false
      };
    } catch (e: any) {
      console.error('Error in fetchProfileData:', e);
      return null;
    }
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const p = await fetchProfileData(session.user.id);
      if (p && !p.isBlocked) {
        setProfile(p);
      }
    }
  };

  useEffect(() => {
    // Check initial session
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const p = await fetchProfileData(session.user.id);
          if (p && !p.isBlocked) {
            setUser(session.user);
            setProfile(p);
          } else {
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err: any) {
        console.error('Session initialization error:', err);
        setAuthError(err.message || 'Authentication error');
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setAuthError(null);
      if (session?.user) {
        const p = await fetchProfileData(session.user.id);
        if (p && !p.isBlocked) {
          setUser(session.user);
          setProfile(p);
        } else {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setAuthError(error.message);
      throw error;
    }

    // Immediately query profile to check if is_blocked is TRUE
    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_blocked')
      .eq('id', data.user.id);

    if (profileData && profileData[0]?.is_blocked) {
      await supabase.auth.signOut();
      throw new Error('ACCOUNT_SUSPENDED');
    }

    return data;
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string, referredBy?: string | null) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          referred_by: referredBy || null,
        }
      }
    });

    if (error) {
      setAuthError(error.message);
      throw error;
    }

    return data;
  };

  const logout = async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, authError, signInWithEmail, signUpWithEmail, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
