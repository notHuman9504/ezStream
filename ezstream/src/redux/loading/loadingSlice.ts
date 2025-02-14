import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LoadingState {
  loading: string;
}

const initialState: LoadingState = {
  loading: 'initial',
};

export const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<string>) => {
      state.loading = action.payload;
    },
  },
});

export const { setLoading } = loadingSlice.actions;
export default loadingSlice.reducer;