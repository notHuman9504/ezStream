'use client';
import { useRouter } from 'next/navigation';
import { RootState } from '@/redux/store';
import { useSelector, useDispatch } from 'react-redux';
import { setEmail } from '@/redux/user/userSlice';

export default function Header() {
    const router = useRouter();
    const dispatch = useDispatch();
    const userEmail = useSelector((state: RootState) => state.user.email);

    const handleLogout = () => {
        localStorage.removeItem('token'); 
        dispatch(setEmail(""));
        router.push('/');
    };

    return (
        <header style={{mixBlendMode:"difference"}} className="sticky bg-black top-0 left-0 right-0 z-40 w-full px-4 py-3">
            <div className="container mx-auto flex justify-between items-center">
                <div 
                    className="text-xl font-bold cursor-pointer text-white" 
                    onClick={() => router.push('/')}
                    suppressHydrationWarning
                >
                    ezStream
                </div>
                
                <div className="space-x-4">
                    {userEmail ? (
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-300" suppressHydrationWarning>
                                {userEmail}
                            </span>
                            <button 
                                className="px-4 py-2 bg-white text-black rounded-md hover:bg-white/90 transition-colors"
                                onClick={handleLogout}
                                suppressHydrationWarning
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <>
                            <button 
                                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                                onClick={() => router.push('/signin')}
                                suppressHydrationWarning
                            >
                                Login
                            </button>
                            <button 
                                className="px-4 py-2 bg-white text-black rounded-md hover:bg-white/90 transition-colors"
                                onClick={() => router.push('/signup')}
                                suppressHydrationWarning
                            >
                                Register
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}