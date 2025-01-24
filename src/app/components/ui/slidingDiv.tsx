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
const SlidingDiv = ({delay, color}: props) => {
  const dispatch = useDispatch();
  const phase = useSelector((state: RootState) => state.loading.loading);
  const [tempPhase, setTempPhase] = useState('initial');
  // console.log(phase)
  useEffect(() => {
    console.log(phase)
    if (phase != 'initial') {
      setTempPhase('initial');
      dispatch(setLoading('initial'))
    }
  }, [phase]);
  useEffect(() => {
    // Start covering the screen
    if(tempPhase === 'initial'){
    setTimeout(() => {
      setTempPhase('cover')
    }, 800+delay*50);
  }
    // Move to top and exit
    if(tempPhase === 'cover'){
    setTimeout(() => {
      setTempPhase("exit")
    }, 2000);
  }
  }, [tempPhase]);

  return (
      <div 
        className={`fixed left-0 w-full h-screen bg-${color} z-[100] transition-all ease-in-out
          ${tempPhase === 'initial' ? 'translate-y-full duration-0' : ''}
          ${tempPhase === 'cover' ? 'translate-y-0 duration-1000' : ''}
          ${tempPhase === 'exit' ? '-translate-y-full duration-1000' : ''}
        `}
      >
        <div className="text-black" style={{fontSize: '200px',position:'absolute',bottom:"20px",textAlign:'center',width:'100%'}}>Stream</div>
      </div>
  );
};

export default SlidingDiv;