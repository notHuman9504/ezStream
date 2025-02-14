import { useRouter,usePathname } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setLoading } from '@/redux/loading/loadingSlice'; // Adjust the import based on your project structure

const myRouter = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const pathname = usePathname();
  const redirectWithDelay = (path:string, loadingState = 'cover', delay = 1300) => {
    if (pathname === path) {
      
      return;
    }
    dispatch(setLoading(loadingState));
    setTimeout(() => {
      router.push(path);
    }, delay);
  };

  return redirectWithDelay;
};

export default myRouter;
