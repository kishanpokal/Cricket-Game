import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

export const useFirestore = () => {
  const getLeaderboard = async (sortBy: 'wins' | 'runs' | 'wickets' = 'wins') => {
    try {
      const q = query(
        collection(db, 'users'), 
        orderBy(`stats.${sortBy}`, 'desc'), 
        limit(20)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (e) {
      console.error("Error fetching leaderboard", e);
      return [];
    }
  };

  return { getLeaderboard };
};
