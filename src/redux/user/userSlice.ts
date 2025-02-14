import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  email: string;
}

const initialState: UserState = {
  email: '',
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setEmail: (state, action: PayloadAction<string>) => {
      state.email = action.payload;
    },
  },
});

export const { setEmail } = userSlice.actions;
export default userSlice.reducer;