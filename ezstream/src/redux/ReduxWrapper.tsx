"use client"
import { Provider } from 'react-redux';
import store from './store';
import Initializer from '@/components/Initializer';
import PageTransition from '@/app/components/ui/pageTransition';

interface ReduxWrapperProps {
  children: React.ReactNode;
}

const ReduxWrapper = ({ children }: ReduxWrapperProps) => {
  return (
    <Provider store={store}>
      <PageTransition />
      <Initializer>
        {children}
      </Initializer>
    </Provider>
  );
};

export default ReduxWrapper;