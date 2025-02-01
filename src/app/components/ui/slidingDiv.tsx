'use client';

import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { setLoading } from '@/redux/loading/loadingSlice';
import { RootState } from '@/redux/store';

interface props {
  delay: number;
  color: string;
}

const SlidingDiv = ({ delay, color }: props) => {
  const dispatch = useDispatch();
  const phase = useSelector((state: RootState) => state.loading.loading);
  const [tempPhase, setTempPhase] = useState('initial');

  useEffect(() => {
    if (phase !== 'initial') {
      setTempPhase('initial');
      dispatch(setLoading('initial'));
    }
  }, [phase]);

  useEffect(() => {
    if (tempPhase === 'initial') {
      setTimeout(() => {
        setTempPhase('cover');
      }, 600 + delay * 50);
    }
    if (tempPhase === 'cover') {
      setTimeout(() => {
        setTempPhase('exit');
      }, 1500);
    }
  }, [tempPhase]);

  return (
    <>
      {/* Import the Nosifer font */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Bungee+Inline&display=swap');
        `}
      </style>
      <div
        className={`fixed left-0 w-full h-screen bg-${color} z-[100] transition-all ease-in-out
          ${tempPhase === 'initial' ? 'translate-y-full duration-0' : ''}
          ${tempPhase === 'cover' ? 'translate-y-0 duration-1000' : ''}
          ${tempPhase === 'exit' ? '-translate-y-full duration-1000' : ''}
        `}
      >
        <div
          className="text-black"
          style={{
            fontSize: '200px',
            fontFamily: "'Bungee Inline', cursive", 
            position: 'absolute',
            bottom: '20px',
            textAlign: 'center',
            width: '100%',
          }}
        >
          STREAM
        </div>
      </div>
    </>
  );
};

export default SlidingDiv;
