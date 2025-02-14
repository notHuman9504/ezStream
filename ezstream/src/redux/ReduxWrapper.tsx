"use client"
import { Provider } from 'react-redux';
import store from './store';
import Initializer from '@/components/Initializer';
import SlidingDiv from '@/app/components/ui/slidingDiv';

interface ReduxWrapperProps {
  children: React.ReactNode;
}

const ReduxWrapper = ({ children }: ReduxWrapperProps) => {
  return (
    <Provider store={store}>
      <SlidingDiv delay={0} color="white" />
      <SlidingDiv delay={2} color="black" />
      <SlidingDiv delay={3.5} color="white" />
      <SlidingDiv delay={4.6} color="black" />
      <SlidingDiv delay={5.5} color="white" />
      <Initializer>
        {children}
      </Initializer>
    </Provider>
  );
};

export default ReduxWrapper;