import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { collectionsApi } from '../../services/collectionsApi'

export interface Collection { id: string; name: string; description: string | null; created_at: string }
interface CollectionsState { items: Collection[]; loading: boolean; error: string | null }

const initialState: CollectionsState = { items: [], loading: false, error: null }

export const fetchCollections = createAsyncThunk('collections/fetchAll', collectionsApi.list)
export const createCollection = createAsyncThunk('collections/create', collectionsApi.create)
export const deleteCollection = createAsyncThunk('collections/delete', collectionsApi.delete)

const collectionsSlice = createSlice({
  name: 'collections',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCollections.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchCollections.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; state.error = null })
      .addCase(fetchCollections.rejected, (state, action) => { state.loading = false; state.error = action.error.message ?? null })
      .addCase(createCollection.pending, (state) => { state.error = null })
      .addCase(createCollection.fulfilled, (state, action) => { state.items.unshift(action.payload); state.error = null })
      .addCase(createCollection.rejected, (state, action) => { state.error = action.error.message ?? null })
      .addCase(deleteCollection.pending, (state) => { state.error = null })
      .addCase(deleteCollection.fulfilled, (state, action) => { state.items = state.items.filter((c) => c.id !== action.meta.arg); state.error = null })
      .addCase(deleteCollection.rejected, (state, action) => { state.error = action.error.message ?? null })
  },
})

export default collectionsSlice.reducer
