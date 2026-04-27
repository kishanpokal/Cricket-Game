import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../services/firebase';
import { useGameStore } from '../store/useGameStore';
import type {  UserProfile  } from '../types/cricket';

export const useAuth = () => {
  const { user, setUser } = useGameStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch or create profile
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        let profile: UserProfile;
        if (userSnap.exists()) {
          profile = userSnap.data() as UserProfile;
        } else {
          profile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Player',
            photoURL: firebaseUser.photoURL || '',
            email: firebaseUser.email || '',
            stats: {
              matches: 0,
              wins: 0,
              losses: 0,
              runs: 0,
              wickets: 0,
              highScore: 0,
              bestBowling: '0-0',
            }
          };
          await setDoc(userRef, profile);
        }
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser]);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in", error);
      if (import.meta.env.VITE_FIREBASE_API_KEY === 'dummy_api_key' || !import.meta.env.VITE_FIREBASE_API_KEY) {
         console.warn("Using dev mock login due to missing Firebase config");
         
         const existingMock = localStorage.getItem('mockUser');
         if (existingMock) {
           setUser(JSON.parse(existingMock));
           return;
         }

         const mockUser: UserProfile = {
           uid: 'mock-user-' + Math.floor(Math.random()*1000),
           displayName: 'Dev Player',
           photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
           email: 'dev@test.com',
           stats: { matches: 0, wins: 0, losses: 0, runs: 0, wickets: 0, highScore: 0, bestBowling: '0-0' }
         };
         localStorage.setItem('mockUser', JSON.stringify(mockUser));
         setUser(mockUser);
      }
    }
  };

  const signOut = () => {
    auth.signOut();
    localStorage.removeItem('mockUser');
    setUser(null);
  };

  // Check localStorage on mount for mock user
  useEffect(() => {
    if (import.meta.env.VITE_FIREBASE_API_KEY === 'dummy_api_key' || !import.meta.env.VITE_FIREBASE_API_KEY) {
      const existingMock = localStorage.getItem('mockUser');
      if (existingMock && !user) {
        setUser(JSON.parse(existingMock));
      }
    }
  }, []);

  const signInAsGuest = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Error signing in anonymously", error);
    }
  };

  return { user, loading, signIn, signOut, signInAsGuest };
};
