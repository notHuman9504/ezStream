'use client';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setEmail } from '../redux/user/userSlice';
import AnimatedLoader from '../app/components/ui/loading';


const Initializer = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      checkAuth();
    }, 1700);
  }, [dispatch]);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        dispatch(setEmail(data.email));
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
      return <AnimatedLoader />
  }

  return <>

  {children}
  
  </>;
};

export default Initializer;